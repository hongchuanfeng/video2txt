'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();

  const getLocalizedPath = (path: string) => {
    return `/${locale}${path}`;
  };

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('legalTitle')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={getLocalizedPath('/legal/privacy')} className="hover:text-white transition-colors">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/legal/terms')} className="hover:text-white transition-colors">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/legal/refund')} className="hover:text-white transition-colors">
                  {t('refund')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/legal/disclaimer')} className="hover:text-white transition-colors">
                  {t('disclaimer')}
                </Link>
              </li>
            </ul>
          </div>

          {/* More Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('moreTitle')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={getLocalizedPath('/legal/copyright')} className="hover:text-white transition-colors">
                  {t('copyright')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/legal/legal')} className="hover:text-white transition-colors">
                  {t('legal')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/legal/ip')} className="hover:text-white transition-colors">
                  {t('ip')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('contact')}</h3>
            <ul className="space-y-2">
              <li>
                <span className="font-medium">{t('email')}:</span>{' '}
                <a
                  href="mailto:video2txt@chdaoai.com"
                  className="underline hover:text-primary-200"
                >
                  video2txt@chdaoai.com
                </a>
              </li>
              <li>
                <span className="font-medium">{t('address')}:</span>
                <br />
                130 Longhua Avenue, Longhua District, Shenzhen
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href={getLocalizedPath('/')} className="hover:text-white transition-colors">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/srt-to-text')} className="hover:text-white transition-colors">
                  {t('srtToText')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/text-to-srt')} className="hover:text-white transition-colors">
                  {t('textToSrt')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/subscription')} className="hover:text-white transition-colors">
                  {t('subscription')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/about')} className="hover:text-white transition-colors">
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link href={getLocalizedPath('/contact')} className="hover:text-white transition-colors">
                  {t('contactUs')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p>&copy; {new Date().getFullYear()} {t('copyrightText')}</p>
        </div>
      </div>
    </footer>
  );
}

