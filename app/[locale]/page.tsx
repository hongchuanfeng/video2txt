'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { getVideoDurationFromElement } from '@/lib/videoUtils';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

type TencentSubtitleApiResponse = {
  taskId: string;
  segmentCount: number;
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    translation?: string;
  }>;
  srt: string;
  subtitleFiles: Array<{
    type: 'asr' | 'translation';
    path?: string;
    subtitlePath?: string;
    url?: string;
  }>;
};

export default function HomePage() {
  const t = useTranslations('videoToText');
  const tSub = useTranslations('subscription');
  const locale = useLocale();
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [tencentResult, setTencentResult] = useState<TencentSubtitleApiResponse | null>(null);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const response = await fetch('/api/user/subscription', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              setSubscription(data);
            }
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const token = session.access_token;
          const response = await fetch('/api/user/subscription', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setSubscription(data);
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      } else {
        setSubscription(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isVideoFile = (file?: File | null) => {
    if (!file) {
      return false;
    }
    const videoMime = file.type.startsWith('video/');
    const videoExt = file.name.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv|mpg|mpeg)$/i);
    return videoMime || Boolean(videoExt);
  };

  const loadVideoDuration = async (file: File) => {
    return new Promise<number>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration || 0);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(0);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!isVideoFile(selectedFile)) {
      setError(t('error.invalidFile'));
      setVideoFile(null);
      setVideoDuration(0);
      return;
    }

    setVideoFile(selectedFile);
    setError(null);
    setTencentResult(null);
    
    // Load video duration
    const duration = await loadVideoDuration(selectedFile);
    setVideoDuration(duration);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) {
      return;
    }

    if (!isVideoFile(droppedFile)) {
      setError(t('error.invalidFile'));
      return;
    }

    setVideoFile(droppedFile);
    setError(null);
    setTencentResult(null);
    
    // Load video duration
    const duration = await loadVideoDuration(droppedFile);
    setVideoDuration(duration);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleGenerate = async () => {
    if (!videoFile) {
      setError(t('error.noFile'));
      return;
    }

    // Check if user is logged in - if not, redirect to login page
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    // Check video duration and credits
    if (videoDuration > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('请重新登录');
          router.push(`/${locale}/login`);
          return;
        }
        
        const checkResponse = await fetch('/api/user/check-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ durationSeconds: videoDuration }),
        });

        const checkData = await checkResponse.json();
        if (!checkData.allowed) {
          setError(checkData.reason || t('error.insufficientCredits'));
          return;
        }
      } catch (err: any) {
        setError(t('error.checkFailed'));
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', videoFile);
    if (videoDuration > 0) {
      formData.append('durationSeconds', videoDuration.toString());
    }

    setProcessing(true);
    setError(null);
    setTencentResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('请重新登录');
        router.push(`/${locale}/login`);
        return;
      }
      
      const response = await fetch('/api/tencent-smart-subtitle', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || t('tencentSubtitle.genericError'));
      }

      setTencentResult(data as TencentSubtitleApiResponse);
      
      // Refresh subscription info
      const { data: { session: refreshSession } } = await supabase.auth.getSession();
      if (refreshSession?.access_token) {
        const subResponse = await fetch('/api/user/subscription', {
          headers: {
            Authorization: `Bearer ${refreshSession.access_token}`,
          },
        });
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData);
        }
      }
    } catch (err: any) {
      setError(err?.message || t('tencentSubtitle.genericError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleTencentDownload = () => {
    if (!tencentResult?.srt) {
      return;
    }

    const blob = new Blob([tencentResult.srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tencent-smart-subtitle.srt';
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
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('srtToText')}
          </Link>
          <Link
            href="/text-to-srt"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            {t('textToSrt')}
          </Link>
        </div>
      </div>

      {/* Login Required Notice */}
      {!user && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('loginRequiredNotice')}{' '}
                  <Link href={`/${locale}/login`} className="underline font-medium">
                    {t('loginHere')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Info */}
      {user && subscription && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {t('currentCredits', { credits: subscription.credits })}
                </p>
                {subscription.freeTrialUsed === false && (
                  <p className="text-xs text-green-600 mt-1">
                    {t('freeTrialAvailable')}
                  </p>
                )}
              </div>
              <Link
                href={`/${locale}/subscription`}
                className="text-sm text-green-700 underline font-medium"
              >
                {t('viewSubscription')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tencent Cloud Smart Subtitle Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-2xl font-semibold">{t('tencentSubtitle.title')}</h2>
            <p className="text-gray-600">{t('tencentSubtitle.description')}</p>
            <p className="text-xs text-gray-400">{t('tencentSubtitle.sizeLimit')}</p>
            {videoDuration > 0 && (
              <p className="text-xs text-gray-600">
                {t('videoDuration', { duration: Math.ceil(videoDuration / 60) })}
                {user && subscription && (
                  <span className="ml-2">
                    ({t('requiredCredits', { credits: Math.ceil(videoDuration / 60) })})
                  </span>
                )}
              </p>
            )}
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v16c0 1.105.895 2 2 2h12a2 2 0 002-2V8l-6-4H6c-1.105 0-2 .895-2 2z"
              />
            </svg>
            <p className="text-gray-600 mb-2">
              {videoFile ? t('tencentSubtitle.selectedFile', { name: videoFile.name }) : t('dragDrop')}
            </p>
            {!videoFile && (
              <p className="text-sm text-gray-500">{t('uploadDescription')}</p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGenerate}
              disabled={!videoFile || processing}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? t('tencentSubtitle.processing') : t('tencentSubtitle.submit')}
            </button>
            {tencentResult?.srt && (
              <button
                onClick={handleTencentDownload}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {t('tencentSubtitle.download')}
              </button>
            )}
          </div>

          {tencentResult ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-600">
                {t('tencentSubtitle.taskId', { taskId: tencentResult.taskId })}
              </p>
              <p className="text-sm text-gray-600">
                {t('tencentSubtitle.segmentCount', { count: tencentResult.segmentCount })}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tencentSubtitle.resultTitle')}
                </label>
                <textarea
                  readOnly
                  value={tencentResult.srt}
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-500">
              {t('tencentSubtitle.idle')}
            </p>
          )}
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
              <source src="/video/video2txt.mp4" type="video/mp4" />
              {t('howToUse.videoDemo.notSupported')}
            </video>
            <p className="text-center text-gray-600 mt-4 text-sm">
              {t('howToUse.videoDemo.description')}
            </p>
          </div>
        </div>

        {/* Image Examples Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6">{t('howToUse.imageExamples.title')}</h3>
          <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="w-full">
              <Image
                src="/images/video2text1.png"
                alt={t('howToUse.imageExamples.image1Alt')}
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg shadow-md"
                unoptimized
              />
            </div>
            <div className="w-full">
              <Image
                src="/images/video2text2.png"
                alt={t('howToUse.imageExamples.image2Alt')}
                width={1200}
                height={800}
                className="w-full h-auto rounded-lg shadow-md"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('features.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.video.title')}</h3>
            <p className="text-gray-600">{t('features.video.desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.text.title')}</h3>
            <p className="text-gray-600">{t('features.text.desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">{t('features.fast.title')}</h3>
            <p className="text-gray-600">{t('features.fast.desc')}</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">{t('faq.title')}</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q2')}</h3>
            <p className="text-gray-600">{t('faq.a2')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">{t('faq.q3')}</h3>
            <p className="text-gray-600">{t('faq.a3')}</p>
          </div>
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{tSub('title')}</h2>
          <p className="text-xl text-gray-600">{tSub('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8 hover:border-primary-500 transition-colors"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-600">${plan.price}</span>
                  <span className="text-gray-600">/{tSub('month')}</span>
                </div>
                <p className="text-lg font-semibold text-gray-700">
                  {plan.credits} {tSub('credits')}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{plan.credits} {tSub('creditsPerMonth')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{tSub('creditUsage')}</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{tSub('autoRenewal')}</span>
                </li>
              </ul>

              <Link
                href={`/${locale}/subscription`}
                className="block w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center"
              >
                {tSub('subscribe')}
              </Link>
            </div>
          ))}
        </div>

        {/* Pricing Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">{tSub('pricingInfo')}</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• {tSub('pricingRule1')}</li>
            <li>• {tSub('pricingRule2')}</li>
            <li>• {tSub('pricingRule3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
