'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const errorFromQuery = searchParams.get('error_description') ?? searchParams.get('error');
    if (errorFromQuery) {
      setErrorMessage(decodeURIComponent(errorFromQuery));
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) {
        return;
      }
      setUserEmail(data.user?.email ?? null);
    };

    fetchUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }
      setUserEmail(session?.user?.email ?? null);
      setLoading(false);
      setErrorMessage(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const statusText = userEmail ? t('status.signedIn', { email: userEmail }) : t('status.signedOut');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/${locale}/login`
        }
      });
      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-4 text-lg text-gray-600">{t('subtitle')}</p>
          <p className="mt-2 text-sm text-gray-500">{t('description')}</p>

          <div className="mt-8">
            <p className="text-base text-gray-700">{statusText}</p>
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {t('errorPrefix', { message: errorMessage })}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
          >
            {loading ? t('googleButtonLoading') : t('googleButton')}
          </button>

          {userEmail && (
            <button
              onClick={handleSignOut}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {t('logout')}
            </button>
          )}

          <p className="mt-6 text-sm text-gray-500">{t('info')}</p>
        </div>
      </div>
    </section>
  );
}


