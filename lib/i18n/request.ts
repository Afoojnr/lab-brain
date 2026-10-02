import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import type { en } from '@/messages/en';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from './config';
import type { Locale } from './config';

type Messages = typeof en;

/**
 * Each language is loaded on its own, so a request only pays for the one it
 * renders. `messages/fr/index.ts` is typed against English, so a key missing in
 * another language fails `ts-check`.
 */
const MESSAGE_LOADERS: Record<Locale, () => Promise<Messages>> = {
  en: async () => (await import('@/messages/en')).en,
  fr: async () => (await import('@/messages/fr')).fr
};

/**
 * Resolves the active locale from the `locale` cookie (no URL prefix) and loads
 * its messages. Falls back to the default locale when the cookie is absent or
 * holds an unsupported value.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;
  const messages = await MESSAGE_LOADERS[locale]();

  return { locale, messages };
});
