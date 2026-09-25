import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import type en from '@/messages/en.json';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from './config';
import type { Locale } from './config';

type Messages = typeof en;

/** Typed against the English file, so a key missing in another language fails `ts-check`. */
const MESSAGE_LOADERS: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('@/messages/en.json'),
  fr: () => import('@/messages/fr.json')
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
  const messages = (await MESSAGE_LOADERS[locale]()).default;

  return { locale, messages };
});
