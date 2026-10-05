'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type ExpandableTextProps = {
  children: string;
  className?: string;
};

/**
 * Long text shown as three lines with a "Show more" toggle, so a lengthy
 * protocol or description never pushes the page content down. Line breaks in
 * the text are kept, and short text shows no toggle at all.
 */
export const ExpandableText = ({
  children,
  className
}: ExpandableTextProps) => {
  const t = useTranslations('common');
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) return;

    const measure = () =>
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, isExpanded]);

  return (
    <div>
      <p
        ref={textRef}
        className={cn(
          'whitespace-pre-line',
          !isExpanded && 'line-clamp-3',
          className
        )}
      >
        {children}
      </p>
      {(isOverflowing || isExpanded) && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 mt-1 rounded text-sm underline underline-offset-4 outline-none focus-visible:ring-3"
        >
          {isExpanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </div>
  );
};
