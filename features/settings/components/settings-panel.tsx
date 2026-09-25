import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { LanguagePicker } from './language-picker';
import { ThemePicker } from './theme-picker';

type SettingsRowProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const SettingsRow = ({ title, description, children }: SettingsRowProps) => (
  <div className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
    <div className="max-w-sm space-y-1">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    {children}
  </div>
);

/** All workspace preferences, one row per setting. */
export const SettingsPanel = async () => {
  const t = await getTranslations('settings');

  return (
    <div className="divide-border divide-y">
      <SettingsRow
        title={t('appearance.title')}
        description={t('appearance.description')}
      >
        <ThemePicker />
      </SettingsRow>
      <SettingsRow
        title={t('language.title')}
        description={t('language.description')}
      >
        <LanguagePicker />
      </SettingsRow>
    </div>
  );
};
