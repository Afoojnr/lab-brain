import type { ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type ReportTableProps = {
  headers: string[];
  rows: ReactNode[][];
  /** Extra classes by column, e.g. `whitespace-nowrap` for a date or `min-w-36` for long text. */
  columnClassNames?: (string | undefined)[];
};

/** A plain table for a report: the header repeats on each printed page and a row is never split. */
export const ReportTable = ({
  headers,
  rows,
  columnClassNames = []
}: ReportTableProps) => (
  <Table className="text-xs">
    <TableHeader>
      <TableRow>
        {headers.map((header, index) => (
          <TableHead key={`${header}-${index}`} className="whitespace-normal">
            {header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row, rowIndex) => (
        <TableRow key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <TableCell
              key={cellIndex}
              className={cn(
                'align-top whitespace-normal',
                columnClassNames[cellIndex]
              )}
            >
              {cell}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
