import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import { AiSettingsPanel } from '@/features/assistant';
import {
  DataFolderSection,
  ExampleDataPanel,
  SettingsPanel
} from '@/features/settings';
import { isDemoMode } from '@/lib/config/local-settings';
import { getDb } from '@/lib/db/client';
import { hasDemo } from '@/lib/db/seed';

import {
  addExampleDataAction,
  removeExampleDataAction
} from '../_actions/example-data';

export const generateMetadata = async () => {
  const t = await getTranslations('settings');
  return { title: t('title') };
};

export default async function SettingsPage() {
  const [t, tAssistant, tExample] = await Promise.all([
    getTranslations('settings'),
    getTranslations('assistant.settings'),
    getTranslations('settings.exampleData')
  ]);
  const isDemo = isDemoMode();
  const hasExample = isDemo && (await hasDemo(await getDb()));

  return (
    <FadeIn className="max-w-3xl">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="mt-8">
        <SettingsPanel />
      </div>
      {isDemo && (
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-medium">{tExample('title')}</h2>
          <p className="text-muted-foreground mt-1 mb-4 max-w-xl text-sm">
            {tExample('description')}
          </p>
          <ExampleDataPanel
            hasExample={hasExample}
            onAdd={addExampleDataAction}
            onRemove={removeExampleDataAction}
          />
        </section>
      )}
      <DataFolderSection />
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
