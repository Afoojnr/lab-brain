'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { buildExperimentFormSchema } from '@/features/experiments/shared';

import type { ImportTarget } from '../../types';
import { issueKey } from './issue-text';
import type { ImportData } from './types';

/**
 * Whether the chosen target can be used: a new experiment with valid fields,
 * or an existing one that is in the project.
 */
export const isTargetValid = (target: ImportTarget, data: ImportData) =>
  target.type === 'existing'
    ? target.experimentId in data.existing
    : buildExperimentFormSchema(data.newExperiment.otherPrefixes).safeParse(
        target
      ).success;

type TargetStepProps = {
  data: ImportData;
  target: ImportTarget;
  onTargetChange: (target: ImportTarget) => void;
  /** The sheet's name and a prefix guessed from its codes, for the new experiment. */
  suggestion: { name: string; codePrefix: string };
};

/** Step 3: a new experiment (the sheet becomes one), or an existing one to add rows to. */
export const TargetStep = ({
  data,
  target,
  onTargetChange,
  suggestion
}: TargetStepProps) => {
  const t = useTranslations('import');
  const hasExperiments = data.experiments.length > 0;
  const experimentItems = data.experiments.map(experiment => ({
    value: experiment.id,
    label: `${experiment.name} (${experiment.codePrefix})`
  }));

  const issues =
    target.type === 'new'
      ? buildExperimentFormSchema(data.newExperiment.otherPrefixes).safeParse(
          target
        )
      : null;
  const messageFor = (field: string) => {
    const issue = issues?.success
      ? undefined
      : issues?.error.issues.find(item => item.path[0] === field);

    return issue ? t(`issues.${issueKey(issue.message)}`) : undefined;
  };
  const firstExisting = data.experiments[0]?.id ?? '';

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">{t('target.description')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={target.type === 'new' ? 'default' : 'outline'}
          aria-pressed={target.type === 'new'}
          onClick={() =>
            onTargetChange({
              type: 'new',
              name: suggestion.name,
              codePrefix: suggestion.codePrefix,
              protocol: ''
            })
          }
        >
          {t('target.newOption')}
        </Button>
        <Button
          type="button"
          variant={target.type === 'existing' ? 'default' : 'outline'}
          aria-pressed={target.type === 'existing'}
          disabled={!hasExperiments}
          onClick={() =>
            onTargetChange({ type: 'existing', experimentId: firstExisting })
          }
        >
          {t('target.existingOption')}
        </Button>
      </div>
      {!hasExperiments && (
        <p className="text-muted-foreground text-sm">
          {t('target.noExperiments')}
        </p>
      )}
      {target.type === 'existing' ? (
        <Field>
          <FieldLabel htmlFor="import-experiment">
            {t('target.experimentLabel')}
          </FieldLabel>
          <Select
            items={experimentItems}
            value={target.experimentId}
            onValueChange={value =>
              onTargetChange({
                type: 'existing',
                experimentId: value ?? firstExisting
              })
            }
          >
            <SelectTrigger id="import-experiment" className="w-full">
              <SelectValue />
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
      ) : (
        <FieldGroup>
          <Field data-invalid={Boolean(messageFor('name'))}>
            <FieldLabel htmlFor="import-new-name">
              {t('target.nameLabel')}
            </FieldLabel>
            <Input
              id="import-new-name"
              autoComplete="off"
              aria-invalid={Boolean(messageFor('name'))}
              value={target.name}
              onChange={event =>
                onTargetChange({ ...target, name: event.target.value })
              }
            />
            <FieldError>{messageFor('name')}</FieldError>
          </Field>
          <Field data-invalid={Boolean(messageFor('codePrefix'))}>
            <FieldLabel htmlFor="import-new-prefix">
              {t('target.prefixLabel')}
            </FieldLabel>
            <Input
              id="import-new-prefix"
              autoComplete="off"
              maxLength={6}
              className="w-32 font-mono"
              aria-invalid={Boolean(messageFor('codePrefix'))}
              value={target.codePrefix}
              onChange={event =>
                onTargetChange({
                  ...target,
                  codePrefix: event.target.value.toUpperCase()
                })
              }
            />
            <FieldDescription>{t('target.prefixHint')}</FieldDescription>
            <FieldError>{messageFor('codePrefix')}</FieldError>
          </Field>
          <Field data-invalid={Boolean(messageFor('protocol'))}>
            <FieldLabel htmlFor="import-new-protocol">
              {t('target.protocolLabel')}
            </FieldLabel>
            <Textarea
              id="import-new-protocol"
              rows={3}
              value={target.protocol}
              onChange={event =>
                onTargetChange({ ...target, protocol: event.target.value })
              }
            />
            <FieldError>{messageFor('protocol')}</FieldError>
          </Field>
        </FieldGroup>
      )}
    </div>
  );
};
