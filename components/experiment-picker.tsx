'use client';

import { useRouter } from 'next/navigation';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ExperimentPickerProps = {
  /** The workspace's path, e.g. `/plots`; the choice is added to its query. */
  basePath: string;
  labels: {
    project: string;
    experiment: string;
    chooseProject: string;
    chooseExperiment: string;
  };
  projects: { id: string; name: string }[];
  experiments: { id: string; name: string }[];
  projectId: string | null;
  experimentId: string | null;
};

/** Chooses the project, then the experiment, a workspace works on. The choice lives in the URL. */
export const ExperimentPicker = ({
  basePath,
  labels,
  projects,
  experiments,
  projectId,
  experimentId
}: ExperimentPickerProps) => {
  const router = useRouter();
  const base = `${basePath}?source=experiment`;
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
      <Field className="w-full sm:w-64">
        <FieldLabel htmlFor="workspace-project">{labels.project}</FieldLabel>
        <Select
          items={projectItems}
          value={projectId}
          onValueChange={value => {
            if (value) router.push(`${base}&project=${value}`);
          }}
        >
          <SelectTrigger id="workspace-project" className="w-full">
            <SelectValue placeholder={labels.chooseProject} />
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
      <Field className="w-full sm:w-64">
        <FieldLabel htmlFor="workspace-experiment">
          {labels.experiment}
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
            <SelectValue placeholder={labels.chooseExperiment} />
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
