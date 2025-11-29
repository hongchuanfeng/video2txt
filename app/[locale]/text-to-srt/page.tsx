'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { parseText, convertToSRT, generateTimeCodes } from '@/lib/textToSrt';

export default function TextToSRTPage() {
  const t = useTranslations('textToSrt');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [srtContent, setSrtContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [autoGenerateTime, setAutoGenerateTime] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.text')) {
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
    if (droppedFile && (droppedFile.name.endsWith('.txt') || droppedFile.name.endsWith('.text'))) {
      setFile(droppedFile);
      setError('');
    } else {
      setError(t('error.invalidFile'));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileRead = async () => {
    if (!file) {
      setError(t('error.noFile'));
      return;
    }

    try {
      const content = await file.text();
      setText(content);
      setError('');
    } catch (err) {
      setError(t('error.readFile'));
      console.error(err);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setError('');
  };

  const handleConvert = () => {
    if (!text.trim()) {
      setError(t('error.noText'));
      return;
    }

    try {
      const entries = parseText(text);
      
      if (entries.length === 0) {
        setError(t('error.noEntries'));
        return;
      }

      let entriesToConvert = entries;
      
      // Auto-generate time codes if needed
      if (autoGenerateTime) {
        entriesToConvert = generateTimeCodes(entries);
      } else {
        // Check if all entries have time codes
        const missingTime = entriesToConvert.some(entry => !entry.time);
        if (missingTime) {
          setError(t('error.missingTime'));
          return;
        }
      }

      const srt = convertToSRT(entriesToConvert);
      setSrtContent(srt);
      setError('');
    } catch (err) {
      setError(t('error.conversion'));
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!srtContent) return;

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file ? file.name.replace(/\.(txt|text)$/i, '.srt') : 'converted.srt';
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
        <div className="mt-6 flex gap-4 justify-center">
          <Link
            href="/srt-to-text"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            {t('convertToText')}
          </Link>
        </div>
      </div>

      {/* Converter Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* File Upload */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors mb-6"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.text"
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

          {file && (
            <button
              onClick={handleFileRead}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors mb-6"
            >
              {t('loadFile')}
            </button>
          )}

          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('textInput')}
            </label>
            <textarea
              ref={textAreaRef}
              value={text}
              onChange={handleTextChange}
              placeholder={t('textPlaceholder')}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Auto-generate time codes option */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerateTime}
                onChange={(e) => setAutoGenerateTime(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('autoGenerateTime')}</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">{t('autoGenerateTimeDesc')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={handleConvert}
              disabled={!text.trim()}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {t('convert')}
            </button>
            {srtContent && (
              <button
                onClick={handleDownload}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {t('download')}
              </button>
            )}
          </div>

          {srtContent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('srtOutput')}
              </label>
              <textarea
                readOnly
                value={srtContent}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Format Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('formatGuide.title')}</h2>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-700 mb-4">{t('formatGuide.description')}</p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="whitespace-pre-wrap">{t('formatGuide.example')}</pre>
          </div>
        </div>
        
        {/* Video Demo Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6">{t('formatGuide.videoDemo.title')}</h3>
          <div className="w-full max-w-4xl mx-auto">
            <video
              controls
              className="w-full rounded-lg shadow-md"
              preload="metadata"
            >
              <source src="/video/text2srt.mp4" type="video/mp4" />
              {t('formatGuide.videoDemo.notSupported')}
            </video>
            <p className="text-center text-gray-600 mt-4 text-sm">
              {t('formatGuide.videoDemo.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('features.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.format.title')}</h3>
            <p className="text-gray-600">{t('features.format.desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">⏱️</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.timecode.title')}</h3>
            <p className="text-gray-600">{t('features.timecode.desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.translation.title')}</h3>
            <p className="text-gray-600">{t('features.translation.desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

