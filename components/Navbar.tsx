'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type NavbarSubscription = {
  credits: number;
  subscriptionPlanId: string | null;
  subscriptionExpiresAt: string | null;
};

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<NavbarSubscription | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: subscription,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setSubscription(null);
        return;
      }

      try {
        const res = await fetch('/api/user/subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          setSubscription(null);
          return;
        }

        const data = await res.json();
        setSubscription({
          credits: data.credits ?? 0,
          subscriptionPlanId: data.subscriptionPlanId ?? data.subscription_plan_id ?? null,
          subscriptionExpiresAt: data.subscriptionExpiresAt ?? data.subscription_expires_at ?? null,
        });
      } catch {
        setSubscription(null);
      }
    };

    fetchSubscription();
  }, [user]);

  const changeLanguage = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    router.push(`/${newLocale}${pathWithoutLocale}`);
    setIsLangOpen(false);
  };

  const getLocalizedPath = (path: string) => {
    return `/${locale}${path}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsUserMenuOpen(false);
    router.push(getLocalizedPath('/'));
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href={getLocalizedPath('/')} className="text-2xl font-bold text-primary-600">
            SRT to Text
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href={getLocalizedPath('/')}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href={getLocalizedPath('/srt-to-text')}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {t('srtToText')}
            </Link>
            <Link
              href={getLocalizedPath('/text-to-srt')}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {t('textToSrt')}
            </Link>
            <Link
              href={getLocalizedPath('/subscription')}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {t('subscription')}
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  {(() => {
                    const meta: any = user.user_metadata || {};
                    const avatarUrl = meta.avatar_url || meta.picture || '';
                    if (avatarUrl) {
                      return (
                        <img
                          src={avatarUrl}
                          alt={user.email || 'user avatar'}
                          className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                        />
                      );
                    }
                    const initial = (user.email || '?').charAt(0).toUpperCase();
                    return (
                      <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
                        {initial}
                      </div>
                    );
                  })()}
                  <svg
                    className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                      {t('loggedInAs', { email: user.email || '' })}
                    </div>
                    <div className="px-4 py-2 text-sm text-gray-800">
                      <div className="font-semibold mb-1">{t('myCredits')}</div>
                      <div className="text-xs text-gray-500">
                        {t('emailLabel', { email: user.email || '' })}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {subscription
                          ? t('creditsLabel', { credits: subscription.credits })
                          : t('creditsLoading')}
                      </div>
                    </div>
                    <Link
                      href={getLocalizedPath('/orders')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                    >
                      {t('myOrders')}
                    </Link>
                    <Link
                      href={getLocalizedPath('/video-jobs')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                    >
                      {t('myVideoJobs')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={getLocalizedPath('/login')}
                className="text-gray-700 hover:text-primary-600 transition-colors"
              >
                {t('login')}
              </Link>
            )}

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <span>{locale.toUpperCase()}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <button
                    onClick={() => changeLanguage('en')}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    English
                  </button>
                  <button
                    onClick={() => changeLanguage('zh')}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    中文
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              href={getLocalizedPath('/')}
              className="block text-gray-700 hover:text-primary-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('home')}
            </Link>
            <Link
              href={getLocalizedPath('/srt-to-text')}
              className="block text-gray-700 hover:text-primary-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('srtToText')}
            </Link>
            <Link
              href={getLocalizedPath('/text-to-srt')}
              className="block text-gray-700 hover:text-primary-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('textToSrt')}
            </Link>
            <Link
              href={getLocalizedPath('/subscription')}
              className="block text-gray-700 hover:text-primary-600 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('subscription')}
            </Link>
            {user ? (
              <>
                <div className="px-2 text-xs text-gray-500 mb-1">
                  {t('loggedInAs', { email: user.email || '' })}
                </div>
                <div className="px-2 py-2 text-sm text-gray-800 bg-gray-50 rounded">
                  <div className="font-semibold mb-1">{t('myCredits')}</div>
                  <div className="text-xs text-gray-500">
                    {t('emailLabel', { email: user.email || '' })}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {subscription
                      ? t('creditsLabel', { credits: subscription.credits })
                      : t('creditsLoading')}
                  </div>
                </div>
                <Link
                  href={getLocalizedPath('/orders')}
                  className="block text-gray-700 hover:text-primary-600 transition-colors px-2 pt-3"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('myOrders')}
                </Link>
                <Link
                  href={getLocalizedPath('/video-jobs')}
                  className="block text-gray-700 hover:text-primary-600 transition-colors px-2 pt-3"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('myVideoJobs')}
                </Link>
                <button
                  onClick={async () => {
                    await handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left text-red-600 hover:text-red-700 transition-colors mt-2 px-2"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <Link
                href={getLocalizedPath('/login')}
                className="block text-gray-700 hover:text-primary-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('login')}
              </Link>
            )}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => changeLanguage('en')}
                className="block w-full text-left text-gray-700 hover:text-primary-600 transition-colors mb-2"
              >
                English
              </button>
              <button
                onClick={() => changeLanguage('zh')}
                className="block w-full text-left text-gray-700 hover:text-primary-600 transition-colors"
              >
                中文
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

