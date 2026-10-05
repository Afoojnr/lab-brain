import type { ComponentProps, ReactNode } from 'react';

import { ExpandableText } from '@/components/expandable-text';
import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PanelContent = {
  /** Lets a link elsewhere on the page jump here, e.g. `#parameters`. */
  id?: string;
  title: string;
  description?: string;
  /** A button shown in the panel's header, e.g. "Add parameter". */
  actions?: ReactNode;
  content: ReactNode;
};

type Fact = { label: string; value: ReactNode };

type RecordDetailProps = {
  breadcrumbs: ComponentProps<typeof PageHeader>['breadcrumbs'];
  /** The record's own id or code. */
  title: string;
  /** The record in one sentence, e.g. an experiment's objective. The most prominent text after the title. */
  lead?: string;
  /** Key facts in one strip under the lead, e.g. project, date and parent. */
  facts: Fact[];
  /** Header buttons, the primary action first. */
  actions?: ReactNode;
  /** Raised panels in the main column: what you do and read most on this record. */
  primary: PanelContent[];
  /** Flat sections in the quiet rail: context that should stay reachable but not compete. */
  secondary: PanelContent[];
  /**
   * Where the quiet sections go: beside the main column (default), or below it
   * so a wide main table, such as many parameters as columns, gets the full width.
   */
  secondaryPlacement?: 'side' | 'below';
};

const PrimaryPanel = ({
  id,
  title,
  description,
  actions,
  content
}: PanelContent) => (
  <Card id={id} className="scroll-mt-24">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
      {actions && <CardAction>{actions}</CardAction>}
    </CardHeader>
    <CardContent>{content}</CardContent>
  </Card>
);

const SecondarySection = ({
  id,
  title,
  description,
  actions,
  content,
  isStacked
}: PanelContent & { isStacked: boolean }) => (
  <section
    id={id}
    className={cn(
      'scroll-mt-24 space-y-3',
      isStacked && 'py-6 first:pt-0 last:pb-0'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {actions}
    </div>
    {description && (
      <p className="text-muted-foreground text-xs">{description}</p>
    )}
    {content}
  </section>
);

/**
 * The one shape every record page shares: a header (code, lead sentence, key
 * facts and actions), a main column of raised panels, and a quiet rail of
 * flat sections. It only lays things out; each record type decides what is
 * primary and supplies its own text, already translated.
 */
export const RecordDetail = ({
  breadcrumbs,
  title,
  lead,
  facts,
  actions,
  primary,
  secondary,
  secondaryPlacement = 'side'
}: RecordDetailProps) => {
  const hasSecondary = secondary.length > 0;
  const isBelow = secondaryPlacement === 'below' || !hasSecondary;

  return (
    <FadeIn>
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions}>
        {lead && (
          <ExpandableText className="max-w-prose pt-1 text-lg leading-snug">
            {lead}
          </ExpandableText>
        )}
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm">
            {facts.map(fact => (
              <div key={fact.label} className="flex gap-1.5">
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </PageHeader>
      <div
        className={cn(
          'mt-8 grid gap-8',
          !isBelow &&
            'lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]'
        )}
      >
        <div className="grid min-w-0 content-start gap-6">
          {primary.map(panel => (
            <PrimaryPanel key={panel.title} {...panel} />
          ))}
        </div>
        {hasSecondary && (
          <aside
            className={cn(
              'border-t pt-6',
              isBelow
                ? 'grid gap-8 sm:grid-cols-2'
                : 'divide-border divide-y lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8'
            )}
          >
            {secondary.map(section => (
              <SecondarySection
                key={section.title}
                isStacked={!isBelow}
                {...section}
              />
            ))}
          </aside>
        )}
      </div>
    </FadeIn>
  );
};
