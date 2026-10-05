import Link from 'next/link';
import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { ExpandableText } from '@/components/expandable-text';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

type Crumb = {
  label: string;
  /** Omit on the last crumb: it is the current page. */
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Extra content under the title, e.g. a record's lead sentence and facts. */
  children?: ReactNode;
};

/** Shared top of every page: breadcrumbs, title, description, primary actions and optional extra content. */
export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  actions,
  children
}: PageHeaderProps) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map(({ label, href }, index) => (
              <Fragment key={label}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {href ? (
                    <Link
                      href={href}
                      className="hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  ) : (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {description && (
        <ExpandableText className="text-muted-foreground max-w-prose">
          {description}
        </ExpandableText>
      )}
      {children}
    </div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </header>
);
