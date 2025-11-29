import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { parseSRT, convertToText } from './srtParser';

// Multiple CDN sources for FFmpeg.wasm core files (fallback support)
const CDN_SOURCES = [
  {
    name: 'unpkg',
    baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  },
  {
    name: 'jsdelivr',
    baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
  },
  {
    name: 'esm.sh',
    baseURL: 'https://esm.sh/@ffmpeg/core@0.12.6/dist/esm'
  }
];

let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoaded = false;
let isLoadingFFmpeg = false;

/**
 * Check network connectivity
 */
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const testUrl = 'https://unpkg.com/@ffmpeg/core@0.12.6/package.json';
    const response = await fetch(testUrl, { 
      method: 'HEAD', 
      cache: 'no-cache',
      mode: 'cors'
    });
    return response.ok || response.status === 0; // 0 for CORS
  } catch {
    return false;
  }
}

/**
 * Try to load FFmpeg.wasm from a specific CDN source using fetchFile
 */
async function tryLoadFromCDN(ffmpeg: FFmpeg, baseURL: string): Promise<void> {
  const coreURL = `${baseURL}/ffmpeg-core.js`;
  const wasmURL = `${baseURL}/ffmpeg-core.wasm`;

  // Use fetchFile to get the actual file content, which works better in Next.js
  try {
    const coreData = await fetchFile(coreURL);
    const wasmData = await fetchFile(wasmURL);

    // Load FFmpeg with the fetched file data
    await ffmpeg.load({
      coreURL: coreData as any,
      wasmURL: wasmData as any,
    });
  } catch (fetchError: any) {
    // If fetchFile fails, try direct URLs
    console.warn('fetchFile failed, trying direct URLs:', fetchError.message);
    await ffmpeg.load({
      coreURL,
      wasmURL,
    });
  }
}

/**
 * Initialize FFmpeg.wasm (client-side only) with multiple CDN fallbacks
 */
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isFFmpegLoaded) {
    return ffmpegInstance;
  }

  // Prevent multiple simultaneous loads
  if (isLoadingFFmpeg) {
    // Wait for ongoing load (max 30 seconds)
    const maxWait = 30000;
    const startTime = Date.now();
    while (isLoadingFFmpeg && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance && isFFmpegLoaded) {
      return ffmpegInstance;
    }
  }

  isLoadingFFmpeg = true;
  const ffmpeg = new FFmpeg();
  
  try {
    // Log progress
    ffmpeg.on('log', ({ message, type }) => {
      if (type === 'info' || type === 'fferr') {
        console.log('FFmpeg:', message);
      }
    });

    // Check network connectivity first
    console.log('Checking network connectivity...');
    const hasNetwork = await checkNetworkConnectivity();
    if (!hasNetwork) {
      console.warn('Network connectivity check failed, but will still try to load FFmpeg');
    }

    // Try loading from multiple CDN sources
    console.log('Loading FFmpeg.wasm...');
    let loadSuccess = false;
    const errors: Array<{ source: string; error: string }> = [];

    for (const source of CDN_SOURCES) {
      try {
        console.log(`Trying to load from ${source.name}...`);
        const startTime = Date.now();
        await Promise.race([
          tryLoadFromCDN(ffmpeg, source.baseURL),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 20 seconds')), 20000)
          )
        ]);
        const loadTime = Date.now() - startTime;
        console.log(`Successfully loaded from ${source.name} in ${loadTime}ms`);
        loadSuccess = true;
        break;
      } catch (error: any) {
        const errorMsg = error?.message || String(error) || 'Unknown error';
        console.warn(`Failed to load from ${source.name}:`, errorMsg);
        errors.push({ source: source.name, error: errorMsg });
        // Continue to next CDN source
      }
    }

    if (!loadSuccess) {
      const errorDetails = errors.map(e => `${e.source}: ${e.error}`).join('; ');
      const hasNetworkIssue = errors.some(e => 
        e.error.includes('network') || 
        e.error.includes('fetch') || 
        e.error.includes('Failed to fetch') ||
        e.error.includes('CORS') ||
        e.error.includes('Timeout')
      );

      let errorMessage = `Failed to load FFmpeg.wasm from all CDN sources. `;
      
      if (hasNetworkIssue) {
        errorMessage += `Network or timeout error detected. `;
      }
      
      errorMessage += `Errors: ${errorDetails}. `;
      errorMessage += `Possible causes: `;
      errorMessage += `1) Network connectivity issues - check your internet connection; `;
      errorMessage += `2) Firewall or proxy blocking CDN access - check firewall settings; `;
      errorMessage += `3) Browser security restrictions - try a different browser; `;
      errorMessage += `4) CORS policy issues - try disabling browser extensions; `;
      errorMessage += `5) Slow network connection - try again later. `;
      errorMessage += `Alternative: Extract SRT file manually using VLC Media Player, then use our SRT to Text converter.`;

      throw new Error(errorMessage);
    }
    
    console.log('FFmpeg.wasm loaded successfully');
    ffmpegInstance = ffmpeg;
    isFFmpegLoaded = true;
    isLoadingFFmpeg = false;
    
    return ffmpeg;
  } catch (error: any) {
    isLoadingFFmpeg = false;
    // Reset instance on failure
    ffmpegInstance = null;
    isFFmpegLoaded = false;
    throw error;
  }
}

/**
 * Check if video has subtitle tracks (probe video)
 */
async function checkVideoSubtitles(ffmpeg: FFmpeg, inputFileName: string): Promise<boolean> {
  try {
    // Use ffprobe-like command to check streams
    await ffmpeg.exec([
      '-i', inputFileName,
      '-hide_banner',
      '-v', 'error',
      '-select_streams', 's',
      '-show_entries', 'stream=index',
      '-of', 'json',
      '-f', 'null',
      '-'
    ]);
    return true;
  } catch {
    // If command fails, try to extract anyway
    return true;
  }
}

/**
 * Extract subtitles from video file using FFmpeg.wasm (client-side)
 */
export async function extractSubtitlesFromVideoClient(videoFile: File): Promise<string> {
  let ffmpeg: FFmpeg | null = null;
  let inputFileName = '';
  
  try {
    // Check if running in browser
    if (typeof window === 'undefined') {
      throw new Error('This function must be called from the browser (client-side)');
    }

    // Validate file
    if (!videoFile || videoFile.size === 0) {
      throw new Error('Invalid video file. The file is empty or corrupted.');
    }

    // Initialize FFmpeg with retry mechanism
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        ffmpeg = await initFFmpeg();
        break; // Success, exit retry loop
      } catch (initError: any) {
        retryCount++;
        if (retryCount > maxRetries) {
          // Don't wrap the error, let it pass through with all details
          throw initError;
        }
        console.log(`Retry ${retryCount}/${maxRetries} to initialize FFmpeg...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!ffmpeg) {
      throw new Error('FFmpeg.wasm initialization failed');
    }

    // Determine file extension
    const fileExtension = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
    inputFileName = `input.${fileExtension}`;
    const outputFileName = 'output.srt';

    // Read video file as ArrayBuffer
    console.log('Reading video file...');
    let videoData: ArrayBuffer;
    try {
      videoData = await videoFile.arrayBuffer();
    } catch (readError: any) {
      throw new Error(`Failed to read video file: ${readError.message}`);
    }

    if (videoData.byteLength === 0) {
      throw new Error('Video file is empty or could not be read');
    }
    
    // Write input file to FFmpeg's virtual file system
    console.log('Writing file to FFmpeg virtual FS...');
    try {
      await ffmpeg.writeFile(inputFileName, new Uint8Array(videoData));
      console.log('Input file written to FFmpeg virtual FS:', inputFileName);
    } catch (writeError: any) {
      throw new Error(`Failed to write file to FFmpeg: ${writeError.message}`);
    }

    // Extract subtitles - try multiple methods
    let extractionSuccess = false;
    let lastError: Error | null = null;

    // Method 1: Try to extract first subtitle track
    try {
      console.log('Attempting to extract first subtitle track...');
      await ffmpeg.exec([
        '-i', inputFileName,
        '-map', '0:s:0',
        '-c:s', 'srt',
        outputFileName
      ]);
      extractionSuccess = true;
      console.log('Extraction successful with method 1');
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);
      console.log('Method 1 failed:', errorMsg);
      
      // Check if error indicates no subtitle tracks
      if (errorMsg.includes('Stream map') || errorMsg.includes('does not exist') || errorMsg.includes('Invalid')) {
        // Try other methods before giving up
      }
      
      // Method 2: Try to extract all subtitle tracks
      try {
        console.log('Attempting to extract all subtitle tracks...');
        await ffmpeg.exec([
          '-i', inputFileName,
          '-map', '0:s',
          '-c:s', 'srt',
          outputFileName
        ]);
        extractionSuccess = true;
        console.log('Extraction successful with method 2');
      } catch (error2: any) {
        lastError = error2;
        const errorMsg2 = error2?.message || String(error2);
        console.log('Method 2 failed:', errorMsg2);
        
        // Method 3: Try without specifying track (let FFmpeg auto-detect)
        try {
          console.log('Attempting auto-detect subtitle extraction...');
          await ffmpeg.exec([
            '-i', inputFileName,
            '-c:s', 'srt',
            outputFileName
          ]);
          extractionSuccess = true;
          console.log('Extraction successful with method 3');
        } catch (error3: any) {
          lastError = error3;
          const errorMsg3 = error3?.message || String(error3);
          console.error('All extraction methods failed');
          
          // Provide user-friendly error message
          if (errorMsg3.includes('Stream map') || errorMsg3.includes('does not exist') || errorMsg3.includes('Invalid stream')) {
            throw new Error('No subtitle tracks found in video. The video may not have embedded subtitles. Please extract SRT file manually using VLC or other tools.');
          } else if (errorMsg3.includes('Invalid data') || errorMsg3.includes('format')) {
            throw new Error('Unsupported video format or corrupted file. Please try a different video file.');
          } else {
            throw new Error(`Failed to extract subtitles: ${errorMsg3}. The video may not have embedded subtitle tracks.`);
          }
        }
      }
    }

    if (!extractionSuccess) {
      throw new Error('No subtitle content extracted. The video may not have embedded subtitle tracks.');
    }

    // Read output file from FFmpeg's virtual file system
    console.log('Reading extracted subtitle file...');
    let srtData: Uint8Array;
    try {
      srtData = await ffmpeg.readFile(outputFileName) as Uint8Array;
    } catch (readError: any) {
      throw new Error(`Failed to read extracted subtitle file: ${readError.message}`);
    }

    const srtContent = new TextDecoder().decode(srtData);

    // Clean up FFmpeg virtual file system
    try {
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (cleanupError) {
      console.warn('Error cleaning up FFmpeg virtual FS:', cleanupError);
    }

    if (!srtContent || srtContent.trim().length === 0) {
      throw new Error('Extracted subtitle file is empty. The video may not have embedded subtitle tracks.');
    }

    console.log('Subtitle extraction completed successfully');
    return srtContent;
  } catch (error: any) {
    console.error('FFmpeg.wasm extraction error:', error);
    
    // Clean up on error
    if (ffmpeg && inputFileName) {
      try {
        await ffmpeg.deleteFile(inputFileName).catch(() => {});
        await ffmpeg.deleteFile('output.srt').catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }

    // Re-throw with better error message
    if (error.message) {
      throw error;
    } else {
      throw new Error(`Video processing failed: ${String(error)}`);
    }
  }
}

/**
 * Convert video file to text (client-side)
 */
export async function videoToTextClient(videoFile: File): Promise<string> {
  try {
    // Extract SRT from video
    const srtContent = await extractSubtitlesFromVideoClient(videoFile);

    if (!srtContent) {
      throw new Error('No subtitles extracted from video. The video may not have embedded subtitle tracks.');
    }

    // Parse SRT and convert to text
    try {
      const entries = parseSRT(srtContent);
      const textContent = convertToText(entries);
      return textContent;
    } catch (parseError: any) {
      throw new Error(`Failed to parse extracted subtitles: ${parseError.message}. The subtitle format may be invalid.`);
    }
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Video to text conversion failed: ${String(error)}`);
    }
  }
}
