import Link from 'next/link';
import type { ReactNode } from 'react';

/** A link to another record, shown in monospace like the codes it usually carries. */
export const RecordLink = ({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) => (
  <Link
    href={href}
    className="font-mono text-sm font-medium underline-offset-4 hover:underline"
  >
    {children}
  </Link>
);
