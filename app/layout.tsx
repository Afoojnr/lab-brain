import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { Providers } from '@/components/providers';
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

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('common');

  return {
    title: { default: t('appName'), template: `%s | ${t('appName')}` },
    description: t('appDescription')
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
