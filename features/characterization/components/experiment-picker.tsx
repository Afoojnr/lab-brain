'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import type { AnalysisKind } from '../types';

type ExperimentPickerProps = {
  kind: AnalysisKind;
  projects: { id: string; name: string }[];
  experiments: { id: string; name: string }[];
  projectId: string | null;
  experimentId: string | null;
};

/** Chooses the project, then the experiment, whose samples are analysed. The choice lives in the URL. */
export const ExperimentPicker = ({
  kind,
  projects,
  experiments,
  projectId,
  experimentId
}: ExperimentPickerProps) => {
  const t = useTranslations('analysis.workspace.experiment');
  const router = useRouter();
  const base = `/characterization/${kind}?source=experiment`;
  const projectItems = projects.map(project => ({
    value: project.id,
    label: project.name
  }));
  const experimentItems = experiments.map(experiment => ({
    value: experiment.id,
    label: experiment.name
  }));

  return (
    <div className="flex flex-wrap gap-4">
      <Field className="w-64">
        <FieldLabel htmlFor="workspace-project">{t('projectLabel')}</FieldLabel>
        <Select
          items={projectItems}
          value={projectId}
          onValueChange={value => {
            if (value) router.push(`${base}&project=${value}`);
          }}
        >
          <SelectTrigger id="workspace-project" className="w-full">
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
      </Field>
      <Field className="w-64">
        <FieldLabel htmlFor="workspace-experiment">
          {t('experimentLabel')}
        </FieldLabel>
        <Select
          items={experimentItems}
          value={experimentId}
          onValueChange={value => {
            if (value && projectId) {
              router.push(`${base}&project=${projectId}&experiment=${value}`);
            }
          }}
        >
          <SelectTrigger
            id="workspace-experiment"
            className="w-full"
            disabled={projectId === null}
          >
            <SelectValue placeholder={t('chooseExperiment')} />
          </SelectTrigger>
          <SelectContent>
            {experimentItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
};
