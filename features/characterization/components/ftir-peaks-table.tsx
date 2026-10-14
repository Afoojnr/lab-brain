'use client';

import { XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { formatValue } from '../analysis/results';
import type { ProcessedSpectrum } from '../techniques/ftir/process';
import { strongestNear } from '../techniques/ftir/transform';
import type { FtirPeak } from '../techniques/ftir/types';
import { ftirUnit } from '../techniques/ftir/values';
import { FtirNumberField } from './ftir-number-field';

type FtirPeaksTableProps = {
  peaks: FtirPeak[];
  /** Each spectrum, processed as chosen, to read a value at every peak. */
  spectra: { id: string; label: string; processed: ProcessedSpectrum }[];
  tolerance: number;
  onChange: (peaks: FtirPeak[]) => void;
};

/**
 * The peaks to keep: edit a position, write what the bond is (free text), remove
 * one, or add one by position. For each spectrum it shows the value read at the
 * peak (within the tolerance), or says there is no data there, never 0.
 */
export const FtirPeaksTable = ({
  peaks,
  spectra,
  tolerance,
  onChange
}: FtirPeaksTableProps) => {
  const t = useTranslations('analysis.ftir.peaks');
  const [newPosition, setNewPosition] = useState<number | null>(null);
  const sorted = [...peaks].sort((a, b) => a.position - b.position);
  const change = (id: string, changes: Partial<FtirPeak>) =>
    onChange(
      peaks.map(peak => (peak.id === id ? { ...peak, ...changes } : peak))
    );

  return (
    <div className="grid min-w-0 gap-3">
      <h3 className="font-medium">{t('title')}</h3>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('position')}</TableHead>
              <TableHead>{t('bond')}</TableHead>
              {spectra.map(spectrum => (
                <TableHead key={spectrum.id} className="whitespace-normal">
                  {spectra.length > 1
                    ? spectrum.label
                    : t('valueIn', { spectrum: spectrum.label })}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(peak => {
              const shown = String(Number(peak.position.toFixed(1)));

              return (
                <TableRow key={peak.id}>
                  <TableCell className="w-32">
                    <FtirNumberField
                      id={`peak-position-${peak.id}`}
                      label={t('positionFor', { position: shown })}
                      value={peak.position}
                      onChange={position =>
                        position !== null && change(peak.id, { position })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={t('bondFor', { position: shown })}
                      placeholder={t('bondPlaceholder')}
                      maxLength={100}
                      value={peak.label}
                      onChange={event =>
                        change(peak.id, { label: event.target.value })
                      }
                    />
                  </TableCell>
                  {spectra.map(spectrum => {
                    const point = strongestNear(
                      spectrum.processed.points,
                      peak.position,
                      tolerance,
                      spectrum.processed.orientation
                    );
                    const unit = ftirUnit(spectrum.processed);

                    return (
                      <TableCell key={spectrum.id} className="tabular-nums">
                        {point ? (
                          <>
                            {formatValue(point.y)}
                            {unit ? ` ${unit}` : ''}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {t('noValue')}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('remove', { position: shown })}
                      onClick={() =>
                        onChange(peaks.filter(other => other.id !== peak.id))
                      }
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <FtirNumberField
            id="ftir-new-peak"
            isOptional
            label={t('addPosition')}
            value={newPosition}
            onChange={setNewPosition}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={newPosition === null}
          onClick={() => {
            if (newPosition === null) return;
            onChange([
              ...peaks,
              { id: crypto.randomUUID(), position: newPosition, label: '' }
            ]);
            setNewPosition(null);
          }}
        >
          {t('add')}
        </Button>
      </div>
    </div>
  );
};
