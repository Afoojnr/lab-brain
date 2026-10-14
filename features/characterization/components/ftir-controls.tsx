'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import type { ReadingGuess } from '../techniques/ftir/reading';
import type {
  FtirSettings,
  NormalisationMethod,
  SpectrumReading,
  WavenumberRange
} from '../techniques/ftir/types';
import { FtirNumberField } from './ftir-number-field';

const AUTO = 'auto';
const METHODS: NormalisationMethod[] = [
  'none',
  'minmax',
  'peak',
  'vector',
  'snv'
];

type FtirControlsProps = {
  settings: FtirSettings;
  onChange: (settings: FtirSettings) => void;
  /** What the values look like, for the Automatic choice. */
  guess: ReadingGuess;
  /** Whether several spectra are stacked (the gap between them is only then useful). */
  isStacked: boolean;
  isReversed: boolean;
  onReverseChange: (isReversed: boolean) => void;
  /** Why the chosen normalisation could not be applied, if it could not. */
  normaliseProblem: 'flat' | 'noReference' | 'zeroReference' | null;
  onDetect: () => void;
};

/** An interval from two optional ends: both needed, else none. */
const rangeOf = (
  from: number | null,
  to: number | null
): WavenumberRange | null =>
  from !== null && to !== null && from <= to ? { from, to } : null;

/**
 * How the spectra are read and processed, and how peaks are found and measured.
 * Each choice is shown, nothing is hidden, and none changes the file.
 */
export const FtirControls = ({
  settings,
  onChange,
  guess,
  isStacked,
  isReversed,
  onReverseChange,
  normaliseProblem,
  onDetect
}: FtirControlsProps) => {
  const t = useTranslations('analysis.ftir.controls');
  const { normalisation, detection } = settings;
  const effective = settings.reading ?? guess.reading;
  const readingItems = [
    {
      value: AUTO,
      label: t('readAuto', { guess: t(`reading.${guess.reading}`) })
    },
    ...(['transmittance', 'absorbance'] as const).map(value => ({
      value,
      label: t(`reading.${value}`)
    }))
  ];
  const methodItems = METHODS.map(value => ({
    value,
    label: t(`methods.${value}`)
  }));
  const normalise = (changes: Partial<FtirSettings['normalisation']>) =>
    onChange({ ...settings, normalisation: { ...normalisation, ...changes } });
  const detect = (changes: Partial<FtirSettings['detection']>) =>
    onChange({ ...settings, detection: { ...detection, ...changes } });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <fieldset className="grid content-start gap-4">
        <legend className="mb-1 text-sm font-medium">
          {t('processingTitle')}
        </legend>
        <Field>
          <FieldLabel htmlFor="ftir-reading">{t('readAs')}</FieldLabel>
          <Select
            items={readingItems}
            value={settings.reading ?? AUTO}
            onValueChange={value =>
              onChange({
                ...settings,
                reading: value === AUTO ? null : (value as SpectrumReading)
              })
            }
          >
            <SelectTrigger id="ftir-reading" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {readingItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settings.reading === null && (
            <FieldDescription>{t(`guess.${guess.reason}`)}</FieldDescription>
          )}
        </Field>
        {effective === 'transmittance' && (
          <Field orientation="horizontal">
            <Checkbox
              id="ftir-convert"
              checked={settings.convertToAbsorbance}
              onCheckedChange={isChecked =>
                onChange({ ...settings, convertToAbsorbance: isChecked })
              }
            />
            <div className="grid gap-1">
              <FieldLabel htmlFor="ftir-convert">{t('convert')}</FieldLabel>
              <FieldDescription>{t('convertHint')}</FieldDescription>
            </div>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="ftir-normalise">{t('normalisation')}</FieldLabel>
          <Select
            items={methodItems}
            value={normalisation.method}
            onValueChange={value =>
              normalise({ method: value as NormalisationMethod })
            }
          >
            <SelectTrigger id="ftir-normalise" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methodItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {normalisation.method === 'minmax' && (
          <div className="grid grid-cols-2 gap-3">
            <FtirNumberField
              id="ftir-norm-from"
              isOptional
              label={t('rangeFrom')}
              value={normalisation.range?.from ?? null}
              onChange={from =>
                normalise({
                  range: rangeOf(from, normalisation.range?.to ?? null)
                })
              }
            />
            <FtirNumberField
              id="ftir-norm-to"
              isOptional
              label={t('rangeTo')}
              value={normalisation.range?.to ?? null}
              onChange={to =>
                normalise({
                  range: rangeOf(normalisation.range?.from ?? null, to)
                })
              }
            />
          </div>
        )}
        {normalisation.method === 'peak' && (
          <FtirNumberField
            id="ftir-norm-reference"
            isOptional
            label={t('referencePosition')}
            value={normalisation.referencePosition}
            onChange={referencePosition => normalise({ referencePosition })}
          />
        )}
        {normalisation.method !== 'none' && (
          <p className="text-muted-foreground text-xs">{t('normaliseNote')}</p>
        )}
        {normaliseProblem && (
          <p role="alert" className="text-destructive text-sm">
            {t(`problems.${normaliseProblem}`)}
          </p>
        )}
      </fieldset>

      <fieldset className="grid content-start gap-4">
        <legend className="mb-1 text-sm font-medium">{t('peaksTitle')}</legend>
        <div className="grid grid-cols-2 gap-3">
          <FtirNumberField
            id="ftir-sensitivity"
            label={t('sensitivity')}
            factor={100}
            value={detection.sensitivity}
            onChange={sensitivity =>
              detect({
                sensitivity: Math.min(Math.max(sensitivity ?? 0.05, 0), 1)
              })
            }
          />
          <FtirNumberField
            id="ftir-spacing"
            label={t('minSpacing')}
            value={detection.minSpacing}
            onChange={minSpacing =>
              detect({ minSpacing: Math.max(minSpacing ?? 10, 0) })
            }
          />
          <FtirNumberField
            id="ftir-search-from"
            isOptional
            label={t('searchFrom')}
            value={detection.range?.from ?? null}
            onChange={from =>
              detect({ range: rangeOf(from, detection.range?.to ?? null) })
            }
          />
          <FtirNumberField
            id="ftir-search-to"
            isOptional
            label={t('searchTo')}
            value={detection.range?.to ?? null}
            onChange={to =>
              detect({ range: rangeOf(detection.range?.from ?? null, to) })
            }
          />
          <FtirNumberField
            id="ftir-tolerance"
            label={t('tolerance')}
            value={settings.tolerance}
            onChange={tolerance =>
              onChange({ ...settings, tolerance: Math.max(tolerance ?? 10, 0) })
            }
          />
          {isStacked && (
            <FtirNumberField
              id="ftir-offset"
              label={t('offset')}
              factor={100}
              value={settings.offset}
              onChange={offset =>
                onChange({ ...settings, offset: Math.max(offset ?? 0, 0) })
              }
            />
          )}
        </div>
        <p className="text-muted-foreground text-xs">{t('searchHint')}</p>
        <Field orientation="horizontal">
          <Checkbox
            id="ftir-reverse"
            checked={isReversed}
            onCheckedChange={isChecked => onReverseChange(isChecked)}
          />
          <FieldLabel htmlFor="ftir-reverse">{t('reverse')}</FieldLabel>
        </Field>
        <div className="grid justify-items-start gap-2">
          <Button type="button" variant="outline" onClick={onDetect}>
            {t('detect')}
          </Button>
          <p className="text-muted-foreground text-xs">{t('detectNote')}</p>
        </div>
      </fieldset>
    </div>
  );
};
