'use client';

import { useFormatter, useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import type { Project } from '../types';

/** One project: name, code prefix, default protocol and creation date. */
export const ProjectCard = ({ project }: { project: Project }) => {
  const t = useTranslations('projects.card');
  const format = useFormatter();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="truncate text-base">{project.name}</CardTitle>
        <CardDescription className="font-mono">
          {project.codePrefix}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
          {project.protocol ?? t('noProtocol')}
        </p>
        <p className="text-muted-foreground text-xs">
          {format.dateTime(project.createdAt, { dateStyle: 'medium' })}
        </p>
      </CardContent>
    </Card>
  );
};
