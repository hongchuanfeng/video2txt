# Video to Text Converter

A free online tool to extract subtitles from video files and convert them to text format. Also supports SRT to Text and Text to SRT conversion. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Video to Text**: Extract subtitles directly from video files (MP4, AVI, MOV, MKV, etc.)
- **SRT to Text**: Convert SRT subtitle files to text format
- **Text to SRT**: Convert text files to SRT subtitle format
- Extract timecodes, content, translations, and original text
- Multi-language support (English and Chinese)
- Responsive design for PC and mobile devices
- SEO optimized

- **Tencent Cloud Smart Subtitle**: Upload a video and let Tencent Cloud MPS extract subtitles server-side
- (Optional) **Tencent Cloud Smart Subtitle**: Server-side speech-to-text powered by Tencent Cloud MPS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **FFmpeg.wasm** (automatically installed via npm - no system installation required)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file and configure the following values:

```bash
# Supabase auth (used for Google login)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Tencent Cloud Smart Subtitle
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_REGION=ap-guangzhou
TENCENT_SMART_SUBTITLE_TEMPLATE_ID=30341
TENCENT_COS_BUCKET=your-bucket-name-1250000000
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_OUTPUT_DIR=/smart-subtitles/
TENCENT_COS_UPLOAD_DIR=/uploads/
# Optional: customize target object prefix or endpoint
# TENCENT_SMART_SUBTITLE_OUTPUT_PREFIX=my-custom-path/{inputName}.srt
# TENCENT_MPS_ENDPOINT=mps.tencentcloudapi.com
```

> ⚠️ The Tencent Cloud section is required only if you plan to use the backend-powered smart subtitle feature. The rest of the site still works with pure client-side FFmpeg processing.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── [locale]/          # Localized pages
│   │   ├── page.tsx       # Home page (Video to Text)
│   │   ├── srt-to-text/   # SRT to Text converter
│   │   ├── text-to-srt/   # Text to SRT converter
│   │   ├── about/         # About page
│   │   ├── contact/       # Contact page
│   │   └── legal/         # Legal pages
│   ├── api/
│   │   ├── extract-subtitles/       # Legacy stub route (client processing)
│   │   └── tencent-smart-subtitle/  # Tencent Cloud Smart Subtitle endpoint
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── sitemap.ts         # Sitemap generation
│   └── robots.ts           # Robots.txt
├── components/            # React components
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/                   # Utility functions
│   ├── srtParser.ts              # SRT parsing logic
│   ├── tencentSmartSubtitle.ts   # Tencent Cloud helper utilities
│   ├── textToSrt.ts              # Text to SRT conversion
│   └── videoToText.ts            # Video processing (client-side fallback)
├── messages/              # Translation files
│   ├── en.json
│   └── zh.json
└── public/                # Static files
    └── favicon.ico
```

## Technologies Used

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- next-intl (Internationalization)
- React 18
- FFmpeg (for video subtitle extraction)

## How It Works

This application provides two complementary flows:

1. **Browser-only mode** powered by **FFmpeg.wasm**: videos/SRT files stay on the client.
2. **Tencent Cloud Smart Subtitle mode**: videos are uploaded to your own COS bucket, processed by Tencent Cloud MPS, and the generated subtitle files are returned for download.

The FFmpeg.wasm mode runs **entirely in the browser (client-side)**:

- ✅ **No server processing** - All video processing happens in the user's browser
- ✅ **Privacy & Security** - Video files never leave the user's device
- ✅ **No system installation required** - FFmpeg.wasm is installed via npm
- ✅ **Works on any platform** - Windows, macOS, Linux, and all modern browsers
- ✅ **No server dependencies** - No need to install FFmpeg on the server

**Note**: FFmpeg.wasm has some limitations:
- Maximum recommended file size: 500MB
- Processing may be slower than native FFmpeg for very large files
- Requires a modern browser with WebAssembly support
- First load may take a moment to download FFmpeg.wasm core files

If you encounter issues, users can still use the SRT to Text converter by manually extracting SRT files from videos using tools like VLC Media Player.

## Favicon

To generate the favicon.ico file:
1. Use the icon.svg file in the public folder
2. Convert it to ICO format using an online tool like https://favicon.io/ or https://realfavicongenerator.net/
3. Place the generated favicon.ico file in the public folder

See FAVICON_INSTRUCTIONS.md for detailed instructions.

## License

This project is free to use.

