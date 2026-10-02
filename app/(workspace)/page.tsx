import { getTranslations } from 'next-intl/server';

import { Dashboard } from '@/features/experiments';

export const generateMetadata = async () => {
  const t = await getTranslations('dashboard');
  return { title: t('title') };
};

const DashboardPage = () => <Dashboard />;

export default DashboardPage;
