import { parseSRT, convertToText, SRTEntry } from './srtParser';

/**
 * Extract subtitles from video using HTML5 video textTracks API
 */
export async function extractSubtitlesFromVideo(videoElement: HTMLVideoElement): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Wait for video to be fully loaded
      const tryExtract = () => {
        if (videoElement.readyState >= 2) {
          extractSubtitles(videoElement, resolve, reject);
        } else {
          // Wait for metadata
          const onLoadedMetadata = () => {
            videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            // Wait a bit more for text tracks to initialize
            setTimeout(() => {
              extractSubtitles(videoElement, resolve, reject);
            }, 1000);
          };
          videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
          
          // Also try after canplay
          const onCanPlay = () => {
            videoElement.removeEventListener('canplay', onCanPlay);
            setTimeout(() => {
              extractSubtitles(videoElement, resolve, reject);
            }, 1500);
          };
          videoElement.addEventListener('canplay', onCanPlay);
        }
      };

      if (videoElement.readyState >= 2) {
        setTimeout(tryExtract, 500);
      } else {
        tryExtract();
      }
    } catch (error) {
      reject(error);
    }
  });
}

function extractSubtitles(
  videoElement: HTMLVideoElement,
  resolve: (value: string) => void,
  reject: (reason?: any) => void
) {
  try {
    // Check text tracks
    const textTracks = videoElement.textTracks;
    
    console.log('Text tracks found:', textTracks?.length || 0);
    
    if (textTracks && textTracks.length > 0) {
      // Log all available tracks for debugging
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        console.log(`Track ${i}: kind=${track.kind}, label=${track.label}, language=${track.language}, mode=${track.mode}`);
      }
    }
    
    if (!textTracks || textTracks.length === 0) {
      // Try waiting a bit more - sometimes tracks load asynchronously
      setTimeout(() => {
        const retryTracks = videoElement.textTracks;
        if (retryTracks && retryTracks.length > 0) {
          extractSubtitles(videoElement, resolve, reject);
        } else {
          reject(new Error('No subtitle tracks found in video. The video may not have embedded subtitles, or the subtitles may be hardcoded in the video frames. Please extract the SRT file separately and use our SRT to Text converter.'));
        }
      }, 2000);
      return;
    }

    // Try to find any subtitle track (check all kinds)
    let subtitleTrack: TextTrack | null = null;
    
    // First, try subtitles and captions
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        subtitleTrack = track;
        break;
      }
    }
    
    // If not found, try any track
    if (!subtitleTrack) {
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind !== 'metadata' && track.kind !== 'chapters') {
          subtitleTrack = track;
          break;
        }
      }
    }

    if (!subtitleTrack) {
      reject(new Error('No suitable subtitle tracks found. Please ensure your video has embedded subtitles (not hardcoded).'));
      return;
    }

    console.log('Using track:', subtitleTrack.kind, subtitleTrack.label, subtitleTrack.language);

    // Enable the track to load cues
    subtitleTrack.mode = 'showing';
    
    // Wait for cues to load and collect them
    const collectCues = (attempt: number = 0): void => {
      const cues: TextTrackCue[] = [];
      
      if (subtitleTrack && subtitleTrack.cues) {
        for (let i = 0; i < subtitleTrack.cues.length; i++) {
          const cue = subtitleTrack.cues[i];
          if (cue) {
            cues.push(cue);
          }
        }
      }

      console.log(`Cue collection attempt ${attempt + 1}: found ${cues.length} cues`);

      if (cues.length > 0) {
        // Convert cues to SRT format
        const srtContent = convertCuesToSRT(cues);
        if (srtContent) {
          console.log('Successfully extracted subtitles');
          resolve(srtContent);
          return;
        }
      }

      // If no cues yet, try seeking through video to trigger loading
      if (attempt < 3) {
        const duration = videoElement.duration;
        if (duration && isFinite(duration) && duration > 0) {
          const originalTime = videoElement.currentTime;
          let seekCount = 0;
          const maxSeeks = 30; // More seeks for better coverage
          const seekInterval = duration / maxSeeks;
          
          const seekAndCollect = () => {
            if (seekCount < maxSeeks) {
              videoElement.currentTime = seekCount * seekInterval;
              seekCount++;
              
              // Collect cues during seeking
              if (subtitleTrack && subtitleTrack.cues) {
                for (let i = 0; i < subtitleTrack.cues.length; i++) {
                  const cue = subtitleTrack.cues[i];
                  if (cue && !cues.includes(cue)) {
                    cues.push(cue);
                  }
                }
              }
              
              setTimeout(seekAndCollect, 30);
            } else {
              // Restore original time
              videoElement.currentTime = originalTime;
              
              // Final collection
              const finalCues: TextTrackCue[] = [];
              if (subtitleTrack && subtitleTrack.cues) {
                for (let i = 0; i < subtitleTrack.cues.length; i++) {
                  const cue = subtitleTrack.cues[i];
                  if (cue && !finalCues.includes(cue)) {
                    finalCues.push(cue);
                  }
                }
              }
              
              console.log(`After seeking: found ${finalCues.length} cues`);
              
              if (finalCues.length > 0) {
                const srtContent = convertCuesToSRT(finalCues);
                if (srtContent) {
                  resolve(srtContent);
                } else {
                  reject(new Error('Subtitles found but could not be converted. Please try extracting SRT file separately.'));
                }
              } else {
                // Try one more time after a delay
                if (attempt < 2) {
                  setTimeout(() => collectCues(attempt + 1), 1000);
                } else {
                  reject(new Error('No subtitle cues found. The video may have subtitles hardcoded in the video frames. Please extract the SRT file separately and use our SRT to Text converter.'));
                }
              }
            }
          };
          
          seekAndCollect();
        } else {
          // Wait more for cues to load
          if (attempt < 2) {
            setTimeout(() => collectCues(attempt + 1), 2000);
          } else {
            reject(new Error('No subtitle cues found. Please ensure your video has embedded subtitle tracks (not hardcoded subtitles).'));
          }
        }
      } else {
        reject(new Error('No subtitle cues found after multiple attempts. The video may have hardcoded subtitles. Please extract the SRT file separately and use our SRT to Text converter.'));
      }
    };

    // Start collecting cues
    setTimeout(() => collectCues(0), 1000);
  } catch (error: any) {
    console.error('Error extracting subtitles:', error);
    reject(new Error(error?.message || 'Error extracting subtitles from video.'));
  }
}

function convertCuesToSRT(cues: TextTrackCue[]): string {
  if (cues.length === 0) {
    return '';
  }

  // Remove duplicates and sort cues by start time
  const uniqueCues: TextTrackCue[] = [];
  const seenCues = new Set<string>();
  
  for (const cue of cues) {
    const cueKey = `${cue.startTime}-${cue.endTime}-${(cue as any).text || ''}`;
    if (!seenCues.has(cueKey)) {
      seenCues.add(cueKey);
      uniqueCues.push(cue);
    }
  }
  
  const sortedCues = uniqueCues.sort((a, b) => a.startTime - b.startTime);
  
  let srtContent = '';
  let index = 1;

  for (const cue of sortedCues) {
    const startTime = formatSRTTime(cue.startTime);
    const endTime = formatSRTTime(cue.endTime);
    
    // Extract text from cue - try multiple methods
    let text = '';
    
    // Method 1: Direct text property
    if ((cue as any).text) {
      text = (cue as any).text;
    }
    // Method 2: getCueAsHTML
    else if (typeof (cue as any).getCueAsHTML === 'function') {
      try {
        const html = (cue as any).getCueAsHTML();
        if (html) {
          text = html.textContent || html.innerText || '';
        }
      } catch (e) {
        console.warn('Error getting cue as HTML:', e);
      }
    }
    // Method 3: getCueAsSource
    else if (typeof (cue as any).getCueAsSource === 'function') {
      try {
        text = (cue as any).getCueAsSource();
      } catch (e) {
        console.warn('Error getting cue as source:', e);
      }
    }
    // Method 4: VTTCue text property
    else if ((cue as any).textContent) {
      text = (cue as any).textContent;
    }

    // Clean up HTML tags and normalize whitespace
    text = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (text) {
      srtContent += `${index}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${text}\n`;
      srtContent += '\n';

      index++;
    }
  }

  return srtContent.trim();
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Convert video file to text by extracting SRT subtitles and converting to text
 */
export async function videoToText(videoElement: HTMLVideoElement): Promise<string> {
  try {
    // Extract SRT from video
    const srtContent = await extractSubtitlesFromVideo(videoElement);
    
    if (!srtContent) {
      throw new Error('No subtitles extracted from video.');
    }

    // Parse SRT and convert to text
    const entries = parseSRT(srtContent);
    if (entries.length === 0) {
      throw new Error('No valid subtitle entries found.');
    }
    
    const textContent = convertToText(entries);
    
    return textContent;
  } catch (error) {
    throw error;
  }
}
