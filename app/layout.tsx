import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Video to Text - Online Converter',
  description: 'Online service to convert video files to text. Extract subtitles, transcripts, and text content from your videos easily and quickly.',
  keywords: 'video to text, video to text converter, video transcription, extract text from video, video subtitle extractor',
  authors: [{ name: 'SRT to Text Converter' }],
  creator: 'SRT to Text Converter',
  publisher: 'SRT to Text Converter',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://video2txt.zorezoro.com'),
  alternates: {
    canonical: 'https://video2txt.zorezoro.com',
    languages: {
      'en': 'https://video2txt.zorezoro.com',
      'zh': 'https://video2txt.zorezoro.com/zh',
    },
  },
  openGraph: {
    title: 'Video to Text - Online Converter',
    description: 'Online service to convert video files to text. Extract subtitles and transcripts from your videos.',
    url: 'https://video2txt.zorezoro.com',
    siteName: 'Video to Text',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="canonical" href="https://video2txt.zorezoro.com" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
