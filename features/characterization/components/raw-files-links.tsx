import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

import { TECHNIQUES } from '../techniques';

/**
 * Links to each technique's workspace, for people who want to analyse raw files
 * before (or without) creating a project.
 */
export const RawFilesLinks = ({ intro }: { intro: string }) => {
  const t = useTranslations('navigation');

  return (
    <div className="grid justify-items-center gap-2">
      <p className="text-muted-foreground text-sm">{intro}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {TECHNIQUES.map(technique => (
          <Link
            key={technique.kind}
            href={`/characterization/${technique.kind}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            {t(technique.kind)}
          </Link>
        ))}
      </div>
    </div>
  );
};
