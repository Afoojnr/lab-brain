import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { AiSettingsPanel } from '@/features/assistant';
import { SettingsPanel } from '@/features/settings';

export const generateMetadata = async () => {
  const t = await getTranslations('settings');
  return { title: t('title') };
};

export default async function SettingsPage() {
  const [t, tAssistant] = await Promise.all([
    getTranslations('settings'),
    getTranslations('assistant.settings')
  ]);

  return (
    <FadeIn className="max-w-3xl">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="mt-8">
        <SettingsPanel />
      </div>
      <section className="mt-10 border-t pt-8">
        <h2 className="text-sm font-medium">{tAssistant('title')}</h2>
        <p className="text-muted-foreground mt-1 mb-6 max-w-xl text-sm">
          {tAssistant('description')}
        </p>
        <AiSettingsPanel />
      </section>
    </FadeIn>
  );
}
