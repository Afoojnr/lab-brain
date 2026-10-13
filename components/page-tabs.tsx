import Link from 'next/link';

import { cn } from '@/lib/utils';

export type PageTab = {
  /** Used in the link (`?tab=<value>`) and to tell which tab is current. */
  value: string;
  label: string;
  /** Written after the label, e.g. how many samples there are. */
  count?: number;
  href: string;
};

type PageTabsProps = {
  /** Names the tab bar for screen readers. */
  label: string;
  tabs: PageTab[];
  active: string;
};

/**
 * An underlined tab bar that switches between the sections of one page. Each
 * tab is a link, so the chosen section is in the URL and Back, reload and shared
 * links work; the bar scrolls sideways on a phone. Used by the experiment page
 * and the project page.
 */
export const PageTabs = ({ label, tabs, active }: PageTabsProps) => (
  <div className="mt-6 border-b">
    {/* The tabs sit on the line by the nav's own -mb-px, never by the tabs, so nothing
        overflows the scrolling nav and no scrollbar shows (it still scrolls on a phone). */}
    <nav
      aria-label={label}
      className="-mb-px flex [scrollbar-width:none] gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map(({ value, label: text, count, href }) => (
        <Link
          key={value}
          href={href}
          aria-current={value === active ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
            value === active
              ? 'border-primary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          )}
        >
          {text}
          {/* A space between the word and the number, so a screen reader says "Samples 23". */}
          {count !== undefined && ' '}
          {count !== undefined && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  </div>
);
