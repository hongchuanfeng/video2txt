import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export const config = {
  // Match all pathnames except for:
  // - API routes (/api)
  // - Next.js internals (_next)
  // - Static files (.*\..*)
  // - Vercel internals (_vercel)
  matcher: ['/((?!api|_next|_vercel|.*\\..*|favicon.ico|robots.txt|sitemap.xml).*)']
};

