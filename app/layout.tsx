import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { Providers } from '@/components/providers';
import { getSiteUrl, isIndexingAllowed } from '@/lib/site/site';
import { cn } from '@/lib/utils';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ]
};

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations('common'),
    getLocale()
  ]);
  const isIndexable = isIndexingAllowed();

  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: t('appName'),
    title: { default: t('appName'), template: `%s | ${t('appName')}` },
    description: t('appDescription'),
    // Not indexed unless the owner opts in (see `lib/site.ts`); `robots.ts`
    // says the same to crawlers that read the file first.
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: t('appName'),
      title: t('appName'),
      description: t('appDescription'),
      locale: locale === 'fr' ? 'fr_FR' : 'en_US'
    },
    twitter: {
      card: 'summary_large_image',
      title: t('appName'),
      description: t('appDescription')
    }
  };
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      // next-themes sets the theme class before hydration, so the attribute differs from the server HTML.
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans'
      )}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
