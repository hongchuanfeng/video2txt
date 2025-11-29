'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { parseSRT, convertToText } from '@/lib/srtParser';

export const dynamic = 'force-dynamic';

export default function SRTToTextPage() {
  const t = useTranslations('srtToText');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.srt')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError(t('error.invalidFile'));
        setFile(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.srt')) {
      setFile(droppedFile);
      setError('');
    } else {
      setError(t('error.invalidFile'));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleConvert = async () => {
    if (!file) {
      setError(t('error.noFile'));
      return;
    }

    try {
      const content = await file.text();
      const entries = parseSRT(content);
      const convertedText = convertToText(entries);
      setText(convertedText);
      setError('');
    } catch (err) {
      setError(t('error.conversion'));
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? file.name.replace('.srt', '.txt') : 'converted.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h1>
        <p className="text-xl text-gray-600 mb-2">{t('subtitle')}</p>
        <p className="text-gray-500 mb-4">{t('description')}</p>
        <div className="mt-6">
          <Link
            href="/text-to-srt"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('convertToSrt')}
          </Link>
        </div>
      </div>

      {/* Converter Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-600 mb-2">{t('dragDrop')}</p>
            {file && (
              <p className="text-sm text-primary-600 font-medium mt-2">
                {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleConvert}
              disabled={!file}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {t('convert')}
            </button>
            {text && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {t('download')}
              </button>
            )}
          </div>

          {text && (
            <div className="mt-6">
              <textarea
                readOnly
                value={text}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('features.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">⏱️</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.timecode')}</h3>
            <p className="text-gray-600">{t('features.timecodeDesc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.content')}</h3>
            <p className="text-gray-600">{t('features.contentDesc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.translation')}</h3>
            <p className="text-gray-600">{t('features.translationDesc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.fast')}</h3>
            <p className="text-gray-600">{t('features.fastDesc')}</p>
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('howToUse.title')}</h2>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                1
              </div>
              <p className="text-lg">{t('howToUse.step1')}</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                2
              </div>
              <p className="text-lg">{t('howToUse.step2')}</p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                3
              </div>
              <p className="text-lg">{t('howToUse.step3')}</p>
            </div>
          </div>
        </div>
        
        {/* Video Demo Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6">{t('howToUse.videoDemo.title')}</h3>
          <div className="w-full max-w-4xl mx-auto">
            <video
              controls
              className="w-full rounded-lg shadow-md"
              preload="metadata"
            >
              <source src="/video/srt2txt.mp4" type="video/mp4" />
              {t('howToUse.videoDemo.notSupported')}
            </video>
            <p className="text-center text-gray-600 mt-4 text-sm">
              {t('howToUse.videoDemo.description')}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('faq.title')}</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q1')}</h3>
            <p className="text-gray-600">{t('faq.a1')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q2')}</h3>
            <p className="text-gray-600">{t('faq.a2')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q3')}</h3>
            <p className="text-gray-600">{t('faq.a3')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q4')}</h3>
            <p className="text-gray-600">{t('faq.a4')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
