'use client';

import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  TableIcon
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { applyFormat } from '@/lib/markdown-format';
import type { FormatKind } from '@/lib/markdown-format';

const BUTTONS: { kind: FormatKind; icon: ReactNode }[] = [
  { kind: 'heading1', icon: <Heading1Icon aria-hidden /> },
  { kind: 'heading2', icon: <Heading2Icon aria-hidden /> },
  { kind: 'heading3', icon: <Heading3Icon aria-hidden /> },
  { kind: 'bold', icon: <BoldIcon aria-hidden /> },
  { kind: 'italic', icon: <ItalicIcon aria-hidden /> },
  { kind: 'bulletList', icon: <ListIcon aria-hidden /> },
  { kind: 'numberedList', icon: <ListOrderedIcon aria-hidden /> },
  { kind: 'table', icon: <TableIcon aria-hidden /> },
  { kind: 'link', icon: <LinkIcon aria-hidden /> }
];

type MarkdownEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  isInvalid?: boolean;
};

/**
 * A text box for formatted text with formatting buttons (heading, bold, italic,
 * lists, table, link) and a Write / Preview switch, so nobody has to know the
 * marks. It stores plain Markdown text, like the textarea it replaces.
 */
export const MarkdownEditor = ({
  id,
  value,
  onChange,
  onBlur,
  rows = 8,
  isInvalid = false
}: MarkdownEditorProps) => {
  const t = useTranslations('common.markdownEditor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  // After a button changes the text, put the selection where the format says.
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const element = textareaRef.current;
    if (!selection || !element) return;

    element.focus();
    element.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  const format = (kind: FormatKind) => {
    const element = textareaRef.current;
    const result = applyFormat(
      value,
      {
        start: element?.selectionStart ?? value.length,
        end: element?.selectionEnd ?? value.length
      },
      kind,
      {
        text: t('words.text'),
        heading: t('words.heading'),
        item: t('words.item'),
        parameter: t('words.parameter'),
        value: t('words.value')
      }
    );
    pendingSelection.current = { start: result.start, end: result.end };
    onChange(result.text);
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="toolbar"
          aria-label={t('toolbar')}
          className="flex flex-wrap gap-1"
        >
          {BUTTONS.map(({ kind, icon }) => (
            <Button
              key={kind}
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={mode === 'preview'}
              aria-label={t(`format.${kind}`)}
              title={t(`format.${kind}`)}
              // Keeps the selection in the text box while the button is pressed.
              onMouseDown={event => event.preventDefault()}
              onClick={() => format(kind)}
            >
              {icon}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['write', 'preview'] as const).map(item => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={mode === item ? 'secondary' : 'ghost'}
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
            >
              {t(item)}
            </Button>
          ))}
        </div>
      </div>
      {mode === 'write' ? (
        <Textarea
          id={id}
          ref={textareaRef}
          rows={rows}
          value={value}
          aria-invalid={isInvalid}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
        />
      ) : (
        <div className="min-h-24 rounded-lg border p-3 text-sm">
          {value.trim() === '' ? (
            <p className="text-muted-foreground">{t('nothingToPreview')}</p>
          ) : (
            <Markdown>{value}</Markdown>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs">{t('tip')}</p>
    </div>
  );
};
