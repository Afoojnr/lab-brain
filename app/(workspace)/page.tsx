import { getTranslations } from 'next-intl/server';

import { RawFilesLinks } from '@/features/characterization';
import { Home } from '@/features/experiments';
import { ExampleDataPanel } from '@/features/settings';
import { isDemoMode } from '@/lib/config/local-settings';

import {
  addExampleDataAction,
  removeExampleDataAction
} from './_actions/example-data';

export const generateMetadata = async () => {
  const t = await getTranslations('home');
  return { title: t('title') };
};

const HomePage = async () => {
  const t = await getTranslations('home.empty');

  return (
    <Home
      emptyActions={
        isDemoMode() ? (
          <ExampleDataPanel
            hasExample={false}
            onAdd={addExampleDataAction}
            onRemove={removeExampleDataAction}
          />
        ) : undefined
      }
      emptyExtra={<RawFilesLinks intro={t('rawFiles')} />}
    />
  );
};

export default HomePage;
