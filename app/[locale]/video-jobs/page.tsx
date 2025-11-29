'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type VideoSubtitleJob = {
  id: string;
  user_id: string;
  video_name: string | null;
  video_duration_seconds: number | null;
  video_url: string | null;
  subtitle_url: string | null;
  task_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export default function VideoJobsPage() {
  const t = useTranslations('videoJobs');
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<VideoSubtitleJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const response = await fetch('/api/user/video-jobs', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setJobs(data);
          } else {
            console.error('Error fetching video jobs');
          }
        } catch (error) {
          console.error('Error fetching video jobs:', error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            {t('status.success')}
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            {t('status.failed')}
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            {t('status.processing')}
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
          <p className="text-gray-600 mb-4">{t('loginRequired')}</p>
          <Link
            href={`/${locale}/login`}
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('goLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">{t('noJobs')}</p>
            <Link
              href={`/${locale}`}
              className="inline-block mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {t('goToHome')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.video_name || t('unknownVideo')}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">{t('duration')}:</span>{' '}
                        {formatDuration(job.video_duration_seconds)}
                      </div>
                      <div>
                        <span className="font-medium">{t('createdAt')}:</span>{' '}
                        {formatDate(job.created_at)}
                      </div>
                      {job.task_id && (
                        <div>
                          <span className="font-medium">{t('taskId')}:</span>{' '}
                          <span className="font-mono text-xs">{job.task_id}</span>
                        </div>
                      )}
                    </div>
                    {job.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <span className="font-medium">{t('error')}:</span> {job.error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    {job.subtitle_url && (
                      <a
                        href={job.subtitle_url}
                        download
                        className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
                      >
                        {t('downloadSubtitle')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

