# FFmpeg.wasm Setup

This application uses **FFmpeg.wasm** (WebAssembly version of FFmpeg) running **entirely in the browser (client-side)**, which means **no system installation is required**!

## Automatic Installation

FFmpeg.wasm is automatically installed when you run:

```bash
npm install
```

The required packages are:
- `@ffmpeg/ffmpeg` - FFmpeg WebAssembly implementation
- `@ffmpeg/util` - Utility functions for FFmpeg.wasm

## How It Works

FFmpeg.wasm runs entirely in the **user's browser** using WebAssembly, which means:
- ✅ **No server processing** - All video processing happens client-side
- ✅ **Privacy & Security** - Video files never leave the user's device
- ✅ No system dependencies on server
- ✅ Works on Windows, macOS, Linux
- ✅ Works on any modern browser with WebAssembly support
- ✅ No need to install FFmpeg system-wide
- ✅ Works on serverless platforms (Vercel, Netlify, etc.) without any special configuration

## Limitations

FFmpeg.wasm has some limitations compared to native FFmpeg:

1. **File Size**: Recommended maximum file size is 500MB
2. **Performance**: May be slower than native FFmpeg for very large files
3. **Memory**: Requires sufficient memory for video processing

## Troubleshooting

### "FFmpeg.wasm extraction failed"

- Check that the video file has embedded subtitle tracks
- Ensure the file size is under 500MB
- Check server logs for detailed error messages

### Out of Memory Errors

- Reduce video file size
- Increase server memory allocation
- Consider using native FFmpeg for very large files

## Alternative: Using Native FFmpeg

If you need to process very large files or require better performance, you can modify the code to use native FFmpeg instead. However, this requires:

1. Installing FFmpeg on your system
2. Modifying `app/api/extract-subtitles/route.ts` to use system FFmpeg
3. Ensuring FFmpeg is available in your deployment environment

For most use cases, FFmpeg.wasm is sufficient and much easier to deploy.
