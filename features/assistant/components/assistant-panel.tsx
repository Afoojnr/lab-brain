'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { AssistantChat } from './assistant-chat';

type AssistantPanelProps = { projects: { id: string; name: string }[] };

/**
 * The content of the assistant side panel. The chat itself is never restarted
 * by a change of page or scope.
 */
export const AssistantPanel = ({ projects }: AssistantPanelProps) => {
  const t = useTranslations('assistant.chat');
  const params = useParams<{ projectId?: string; experimentId?: string }>();
  const [isWholeProject, setIsWholeProject] = useState(false);
  const [chosenProjectId, setChosenProjectId] = useState<string | null>(null);

  const projectId = params.projectId ?? chosenProjectId ?? undefined;
  const hasExperiment = params.projectId && params.experimentId;
  const experimentId =
    hasExperiment && !isWholeProject ? params.experimentId : undefined;
  const projectItems = projects.map(project => ({
    value: project.id,
    label: project.name
  }));
  const projectName = projects.find(project => project.id === projectId)?.name;

  return (
    <>
      <div className="grid gap-2 border-b px-4 py-3 text-sm">
        {params.projectId ? (
          <p className="truncate">
            <span className="text-muted-foreground">{t('askingAbout')} </span>
            {projectName ?? t('thisProject')}
          </p>
        ) : (
          <Select
            items={projectItems}
            value={chosenProjectId}
            onValueChange={value => setChosenProjectId(value)}
          >
            <SelectTrigger aria-label={t('project')} className="w-full">
              <SelectValue placeholder={t('chooseProject')} />
            </SelectTrigger>
            <SelectContent>
              {projectItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasExperiment && (
          <div className="flex gap-1" role="group" aria-label={t('scope')}>
            <Button
              type="button"
              size="xs"
              variant={isWholeProject ? 'outline' : 'secondary'}
              aria-pressed={!isWholeProject}
              onClick={() => setIsWholeProject(false)}
            >
              {t('thisExperiment')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant={isWholeProject ? 'secondary' : 'outline'}
              aria-pressed={isWholeProject}
              onClick={() => setIsWholeProject(true)}
            >
              {t('wholeProject')}
            </Button>
          </div>
        )}
      </div>
      <AssistantChat scope={{ projectId, experimentId }} />
    </>
  );
};
