import { getTranslations } from 'next-intl/server';

import { RawFilesLinks } from '@/features/characterization';
import { Home } from '@/features/experiments';

export const generateMetadata = async () => {
  const t = await getTranslations('home');
  return { title: t('title') };
};

const HomePage = async () => {
  const t = await getTranslations('home.empty');

  return <Home emptyExtra={<RawFilesLinks intro={t('rawFiles')} />} />;
};

export default HomePage;
