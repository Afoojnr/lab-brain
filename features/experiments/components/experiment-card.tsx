import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import type { Experiment } from '../types';

type ExperimentCardProps = {
  projectId: string;
  experiment: Experiment;
  sampleCount: number;
  columnCount: number;
};

/** One experiment: its name, prefix, how many samples and columns it has. Links to its sample table. */
export const ExperimentCard = async ({
  projectId,
  experiment,
  sampleCount,
  columnCount
}: ExperimentCardProps) => {
  const t = await getTranslations('experiments.project');

  return (
    <Link
      href={`/projects/${projectId}/experiments/${experiment.id}`}
      className="focus-visible:ring-ring/50 group block h-full rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="group-hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <CardTitle className="truncate text-base">
            {experiment.name}
          </CardTitle>
          <CardDescription className="font-mono">
            {experiment.codePrefix}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-sm">
          <p>{t('samples', { count: sampleCount })}</p>
          <p>{t('columns', { count: columnCount })}</p>
        </CardContent>
      </Card>
    </Link>
  );
};
