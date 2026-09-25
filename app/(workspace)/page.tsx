import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

export const generateMetadata = async () => {
  const t = await getTranslations('dashboard');
  return { title: t('title') };
};

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');

  return (
    <FadeIn>
      <PageHeader title={t('title')} description={t('description')} />
      {/* Placeholder until the project grid lands in the next step. */}
      <div className="text-muted-foreground mt-8 flex min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
        {t('placeholder')}
      </div>
    </FadeIn>
  );
}
