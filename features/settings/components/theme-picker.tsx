'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIsMounted } from '@/hooks/use-is-mounted';

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'light', Icon: SunIcon },
  { value: 'dark', labelKey: 'dark', Icon: MoonIcon },
  { value: 'system', labelKey: 'system', Icon: MonitorIcon }
] as const;

const SELECTED_STYLES =
  'aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90';

/** Segmented control for light, dark or system theme. */
export const ThemePicker = () => {
  const t = useTranslations('settings.appearance');
  const { theme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  // Base UI reports an empty array when the active item is clicked again.
  const handleChange = (value: string[]) => {
    const next = value[0];
    if (next) setTheme(next);
  };

  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      aria-label={t('title')}
      value={isMounted && theme ? [theme] : []}
      onValueChange={handleChange}
    >
      {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
        <ToggleGroupItem key={value} value={value} className={SELECTED_STYLES}>
          <Icon aria-hidden />
          {t(labelKey)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
