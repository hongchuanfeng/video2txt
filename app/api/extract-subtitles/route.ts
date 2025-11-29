import { NextRequest, NextResponse } from 'next/server';
import { parseSRT, convertToText } from '@/lib/srtParser';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

/**
 * API route for video subtitle extraction
 * Note: FFmpeg.wasm does not support Node.js server-side execution.
 * This endpoint provides instructions for client-side processing.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid video file format' },
        { status: 400 }
      );
    }

    // Check file size (limit to 500MB for FFmpeg.wasm)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file is too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    // FFmpeg.wasm must run in the browser (client-side)
    // Return error with instructions
    return NextResponse.json(
      {
        error: 'FFmpeg.wasm does not support Node.js server-side execution. Please use client-side processing.',
        requiresClientSide: true,
        suggestion: 'The video processing will be handled in your browser. Please ensure you are using the client-side video processing function.'
      },
      { status: 501 }
    );

  } catch (error: any) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Error processing video file',
        suggestion: 'Please try extracting the SRT file manually and use our SRT to Text converter.'
      },
      { status: 500 }
    );
  }
}
