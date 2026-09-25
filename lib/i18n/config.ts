export const LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE_NAME = 'locale';

/** Shown in each language's own name so a user can always find theirs. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français'
};

/**
 * Narrows an unknown string (e.g. a cookie value) to a supported locale.
 *
 * @param value - Raw value to check.
 * @returns True when `value` is one of {@link LOCALES}.
 */
export const isLocale = (value: string | undefined): value is Locale =>
  LOCALES.some(locale => locale === value);
