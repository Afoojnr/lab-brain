'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import type { Project } from '../types';

/** One project: name, how many experiment it has, description and creation date. Links to its page. */
export const ProjectCard = ({
  project,
  experimentCount
}: {
  project: Project;
  experimentCount: number;
}) => {
  const t = useTranslations('projects.card');
  const format = useFormatter();

  return (
    <Link
      href={`/projects/${project.id}`}
      className="focus-visible:ring-ring/50 group block h-full rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="group-hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <CardTitle className="truncate text-base">{project.name}</CardTitle>
          <CardDescription>
            {t('experiment', { count: experimentCount })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
            {project.description ?? t('noDescription')}
          </p>
          <p className="text-muted-foreground text-xs">
            {format.dateTime(project.createdAt, { dateStyle: 'medium' })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};
