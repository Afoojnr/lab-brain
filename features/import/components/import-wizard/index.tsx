'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { commitImportAction } from '../../actions/commit-import';
import {
  buildPayload,
  headersOf,
  initialMapping,
  dataCells
} from '../../build-payload';
import type { SheetLayout } from '../../build-payload';
import { cellToText } from '@/lib/spreadsheet/cells';
import type { DateFormat } from '../../dates';
import { detectHeaderRow } from '@/lib/spreadsheet/layout';

import { suggestPrefix } from '../../layout';
import type {
  ColumnTarget,
  ConflictChoice,
  ImportTarget,
  ParsedSheet
} from '../../types';
import { validateImport } from '../../validate';
import { DoneStep } from './done-step';
import { LayoutStep } from './layout-step';
import { MappingStep } from './mapping-step';
import { PreviewStep } from './preview-step';
import { isTargetValid, TargetStep } from './target-step';
import { UploadStep } from './upload-step';
import { STEP_ORDER } from './types';
import type { ImportData, StepId } from './types';

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  experimentId: string;
};

type ImportWizardProps = {
  projectId: string;
  data: ImportData;
  /** From the URL: start with this existing experiment as the target. */
  preselectedExperimentId?: string;
};

const layoutFor = (sheet: ParsedSheet): SheetLayout => ({
  headerRow: detectHeaderRow(sheet.rows),
  hasUnitsRow: false
});

/**
 * The spreadsheet import: file, sheet, experiment, columns, preview, done. The
 * file is read in the browser; the preview runs the same `validateImport` the
 * server runs again before it writes anything.
 */
export const ImportWizard = ({
  projectId,
  data,
  preselectedExperimentId
}: ImportWizardProps) => {
  const t = useTranslations('import');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isImporting, startImport] = useTransition();
  const [step, setStep] = useState<StepId>('upload');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [layout, setLayout] = useState<SheetLayout>({
    headerRow: 0,
    hasUnitsRow: false
  });
  const [target, setTarget] = useState<ImportTarget>({
    type: 'new',
    name: '',
    codePrefix: '',
    protocol: ''
  });
  const [mapping, setMapping] = useState<ColumnTarget[]>([]);
  const [dateFormat, setDateFormat] = useState<DateFormat>('iso');
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  const [shouldSkipErrorRows, setShouldSkipErrorRows] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const sheet = sheets[sheetIndex];
  const context =
    target.type === 'existing'
      ? data.existing[target.experimentId]
      : data.newExperiment;
  const columns = context?.columns ?? [];

  const suggestion = useMemo(() => {
    if (!sheet) return { name: '', codePrefix: '' };
    const codeColumn = initialMapping(sheet, layout, []).findIndex(
      item => item.type === 'code'
    );
    const codes =
      codeColumn === -1
        ? []
        : dataCells(sheet, layout, codeColumn).map(cell => cellToText(cell));

    return { name: sheet.name, codePrefix: suggestPrefix(codes) };
  }, [sheet, layout]);

  const payload = useMemo(
    () =>
      step === 'preview' && sheet
        ? buildPayload({
            sheet,
            layout,
            target,
            mapping,
            dateFormat,
            choices,
            shouldSkipErrorRows
          })
        : null,
    [
      step,
      sheet,
      layout,
      target,
      mapping,
      dateFormat,
      choices,
      shouldSkipErrorRows
    ]
  );
  const report = useMemo(
    () => (payload && context ? validateImport(payload, context) : null),
    [payload, context]
  );

  const chooseTarget = (next: ImportTarget) => {
    if (!sheet) return;
    const nextColumns =
      next.type === 'existing'
        ? (data.existing[next.experimentId]?.columns ?? [])
        : [];
    setTarget(next);
    setMapping(initialMapping(sheet, layout, nextColumns));
    setChoices({});
  };

  const goToTarget = () => {
    if (!sheet) return;
    const isPreselected =
      preselectedExperimentId !== undefined &&
      preselectedExperimentId in data.existing;
    chooseTarget(
      isPreselected
        ? { type: 'existing', experimentId: preselectedExperimentId }
        : {
            type: 'new',
            name: suggestion.name,
            codePrefix: suggestion.codePrefix,
            protocol: ''
          }
    );
    setStep('target');
  };

  const startOver = () => {
    setSheets([]);
    setResult(null);
    setChoices({});
    setShouldSkipErrorRows(false);
    setStep('upload');
  };

  const runImport = () => {
    if (!payload) return;
    startImport(async () => {
      try {
        const outcome = await commitImportAction(projectId, payload);
        if (!outcome) {
          toast.error(tErrors('unexpected'));
        } else if (!outcome.isOk) {
          toast.error(t('errors.changed'));
          router.refresh();
        } else {
          setResult(outcome);
          setStep('done');
        }
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const back = () => {
    const previous = STEP_ORDER[stepIndex - 1];
    if (previous) setStep(previous);
  };
  const hasCode = mapping.some(item => item.type === 'code');
  const rowCount = sheet?.rows.length ?? 0;
  const canContinue =
    step === 'layout'
      ? layout.headerRow >= 0 && layout.headerRow < rowCount - 1
      : step === 'target'
        ? isTargetValid(target, data)
        : step === 'mapping'
          ? hasCode
          : false;
  const next = () => {
    if (step === 'layout') goToTarget();
    else if (step === 'target') setStep('mapping');
    else if (step === 'mapping') setStep('preview');
  };

  return (
    <div className="grid min-w-0 gap-6">
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STEP_ORDER.map((id, index) => {
          const label = `${index + 1}. ${t(`steps.${id}`)}`;
          // Earlier steps can be revisited; what was entered after them is kept.
          const canGoBack = index < stepIndex && step !== 'done';

          return (
            <li
              key={id}
              aria-current={id === step ? 'step' : undefined}
              className={id === step ? 'font-medium' : 'text-muted-foreground'}
            >
              {canGoBack ? (
                <button
                  type="button"
                  aria-label={t('steps.goTo', { step: t(`steps.${id}`) })}
                  className="text-foreground underline-offset-4 hover:underline"
                  onClick={() => setStep(id)}
                >
                  {label}
                </button>
              ) : (
                label
              )}
            </li>
          );
        })}
      </ol>
      <section className="bg-card grid min-w-0 gap-4 rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-medium">{t(`${step}.title`)}</h2>
        {step === 'upload' && (
          <UploadStep
            onParsed={parsed => {
              const first = parsed[0];
              if (!first) return;
              setSheets(parsed);
              setSheetIndex(0);
              setLayout(layoutFor(first));
              setStep('layout');
            }}
          />
        )}
        {step === 'layout' && sheet && (
          <LayoutStep
            sheets={sheets}
            sheetIndex={sheetIndex}
            layout={layout}
            onSheetChange={index => {
              const chosen = sheets[index];
              if (!chosen) return;
              setSheetIndex(index);
              setLayout(layoutFor(chosen));
            }}
            onLayoutChange={setLayout}
          />
        )}
        {step === 'target' && (
          <TargetStep
            data={data}
            target={target}
            onTargetChange={chooseTarget}
            suggestion={suggestion}
          />
        )}
        {step === 'mapping' && sheet && (
          <>
            <MappingStep
              sheet={sheet}
              layout={layout}
              columns={columns}
              mapping={mapping}
              dateFormat={dateFormat}
              onMappingChange={setMapping}
              onDateFormatChange={setDateFormat}
            />
            {!hasCode && (
              <p role="alert" className="text-destructive text-sm">
                {t('issues.codeNotMapped')}
              </p>
            )}
          </>
        )}
        {step === 'preview' && report && sheet && (
          <PreviewStep
            report={report}
            headers={headersOf(sheet, layout)}
            choices={choices}
            shouldSkipErrorRows={shouldSkipErrorRows}
            isImporting={isImporting}
            onChoicesChange={setChoices}
            onSkipErrorRowsChange={setShouldSkipErrorRows}
            onImport={runImport}
          />
        )}
        {step === 'done' && result && (
          <DoneStep
            projectId={projectId}
            result={result}
            onRestart={startOver}
          />
        )}
      </section>
      {step !== 'upload' && step !== 'done' && (
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={back}>
            {t('nav.back')}
          </Button>
          {step !== 'preview' && (
            <Button type="button" disabled={!canContinue} onClick={next}>
              {t('nav.next')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
