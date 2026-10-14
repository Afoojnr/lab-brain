import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Drops the `node` prop react-markdown adds, so the rest can go on an element. */
type Props<Tag extends keyof React.JSX.IntrinsicElements> =
  ComponentProps<Tag> & {
    node?: unknown;
  };

const without = <T extends { node?: unknown }>({ node: _node, ...rest }: T) =>
  rest;

const COMPONENTS: Components = {
  h1: props => (
    <h2
      {...without(props as Props<'h1'>)}
      className="mt-6 mb-2 border-b pb-1 text-lg font-semibold first:mt-0"
    />
  ),
  h2: props => (
    <h3
      {...without(props as Props<'h2'>)}
      className="mt-5 mb-1.5 text-base font-semibold first:mt-0"
    />
  ),
  h3: props => (
    <h4
      {...without(props as Props<'h3'>)}
      className="mt-4 mb-1 text-sm font-semibold first:mt-0"
    />
  ),
  h4: props => (
    <h5
      {...without(props as Props<'h4'>)}
      className="text-muted-foreground mt-3 mb-1 text-sm font-medium first:mt-0"
    />
  ),
  p: props => (
    <p {...without(props as Props<'p'>)} className="my-2 first:mt-0" />
  ),
  ul: props => (
    <ul {...without(props as Props<'ul'>)} className="my-2 list-disc pl-5" />
  ),
  ol: props => (
    <ol {...without(props as Props<'ol'>)} className="my-2 list-decimal pl-5" />
  ),
  li: props => <li {...without(props as Props<'li'>)} className="my-0.5" />,
  a: props => (
    <a
      {...without(props as Props<'a'>)}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4"
    />
  ),
  blockquote: props => (
    <blockquote
      {...without(props as Props<'blockquote'>)}
      className="text-muted-foreground my-2 border-l-2 pl-3"
    />
  ),
  // A picture would load a file from outside the app, so only its text is kept.
  img: ({ alt }) => <span>{alt}</span>,
  hr: () => <hr className="my-4" />,
  code: props => (
    <code
      {...without(props as Props<'code'>)}
      className={cn(
        'bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]',
        (props as Props<'code'>).className
      )}
    />
  ),
  pre: props => (
    <pre
      {...without(props as Props<'pre'>)}
      className="bg-muted my-2 overflow-x-auto rounded-lg p-3 text-sm"
    />
  ),
  table: props => <Table {...without(props as Props<'table'>)} />,
  thead: props => <TableHeader {...without(props as Props<'thead'>)} />,
  tbody: props => <TableBody {...without(props as Props<'tbody'>)} />,
  tr: props => <TableRow {...without(props as Props<'tr'>)} />,
  th: props => (
    <TableHead
      {...without(props as Props<'th'>)}
      className="whitespace-normal"
    />
  ),
  td: props => (
    <TableCell
      {...without(props as Props<'td'>)}
      className="align-top whitespace-normal"
    />
  )
};

/**
 * Renders Markdown for the protocol. Raw HTML is never run, images are not
 * loaded, links open in a new tab, and a single line break stays a line break.
 * Headings start at the second level because the page has its own title.
 */
export const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkBreaks]}
    components={COMPONENTS}
  >
    {children}
  </ReactMarkdown>
);
