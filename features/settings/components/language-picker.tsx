'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { LOCALE_LABELS, LOCALES } from '@/lib/i18n/config';

import { setLocale } from '../actions/set-locale';

const LANGUAGE_ITEMS = LOCALES.map(locale => ({
  value: locale,
  label: LOCALE_LABELS[locale]
}));

/** Dropdown that switches the app language through a cookie-backed Server Action. */
export const LanguagePicker = () => {
  const t = useTranslations('settings.language');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  // Success needs no toast: the page switching language is the feedback.
  const handleChange = (value: string | null) => {
    if (!value || value === locale) return;

    startTransition(async () => {
      try {
        await setLocale(value);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  };

  return (
    <Select
      items={LANGUAGE_ITEMS}
      value={locale}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger aria-label={t('title')} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_ITEMS.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
