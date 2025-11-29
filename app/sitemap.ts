import { MetadataRoute } from 'next';
import { locales } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://video2txt.zorezoro.com';
  
  const routes = [
    '',
    '/srt-to-text',
    '/text-to-srt',
    '/about',
    '/contact',
    '/legal/privacy',
    '/legal/terms',
    '/legal/refund',
    '/legal/disclaimer',
    '/legal/copyright',
    '/legal/legal',
    '/legal/ip',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add default locale (English) routes
  routes.forEach((route) => {
    sitemapEntries.push({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: route === '' ? 1.0 : 0.8,
    });
  });

  // Add Chinese locale routes
  routes.forEach((route) => {
    sitemapEntries.push({
      url: `${baseUrl}/zh${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: route === '' ? 0.9 : 0.7,
    });
  });

  return sitemapEntries;
}

