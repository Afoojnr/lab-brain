'use server';

import { cookies } from 'next/headers';

import { isLocale, LOCALE_COOKIE_NAME } from '@/lib/i18n/config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Stores the chosen language in a cookie so every later request renders in it.
 * The dropdown only offers valid languages, but a Server Action can be called
 * directly, so an unsupported code is ignored instead of stored.
 *
 * @param input - Locale code picked by the user (e.g. `fr`).
 */
export const setLocale = async (input: string): Promise<void> => {
  if (!isLocale(input)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, input, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax'
  });
};
