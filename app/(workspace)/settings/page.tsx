import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { SettingsPanel } from '@/features/settings';

export const generateMetadata = async () => {
  const t = await getTranslations('settings');
  return { title: t('title') };
};

export default async function SettingsPage() {
  const t = await getTranslations('settings');

  return (
    <FadeIn className="max-w-3xl">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="mt-8">
        <SettingsPanel />
      </div>
    </FadeIn>
  );
}
