'use client';

import { useTranslations } from 'next-intl';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import type { FtirBond } from '../techniques/ftir/types';
import { FtirBondDeleteButton } from './ftir-bond-delete-button';
import { FtirBondDialog } from './ftir-bond-dialog';
import { FtirBondImport } from './ftir-bond-import';

/**
 * The user's one table of FTIR bonds: what to call a peak, the range it appears
 * in, and where that comes from.
 */
export const FtirBondTable = ({ bonds }: { bonds: FtirBond[] }) => {
  const t = useTranslations('analysis.ftir.bonds');

  return (
    <div className="grid min-w-0 gap-8">
      <section className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid max-w-2xl gap-1">
            <h3 className="font-medium">{t('title')}</h3>
            <p className="text-muted-foreground text-sm">{t('description')}</p>
          </div>
          <FtirBondDialog bonds={bonds} />
        </div>
        {bonds.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            {t('empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bond')}</TableHead>
                <TableHead>{t('from')}</TableHead>
                <TableHead>{t('to')}</TableHead>
                <TableHead>{t('source')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonds.map(bond => (
                <TableRow key={bond.id}>
                  <TableCell className="font-medium whitespace-normal">
                    {bond.bond}
                  </TableCell>
                  <TableCell className="tabular-nums">{bond.from}</TableCell>
                  <TableCell className="tabular-nums">
                    {bond.to === bond.from ? '—' : bond.to}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-normal">
                    {bond.source}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <FtirBondDialog bond={bond} bonds={bonds} />
                      <FtirBondDeleteButton bond={bond} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      <FtirBondImport bonds={bonds} />
    </div>
  );
};
