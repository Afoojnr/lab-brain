export type FormatKind =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bold'
  | 'italic'
  | 'bulletList'
  | 'numberedList'
  | 'table'
  | 'link';

/** The words written when nothing is selected, already translated. */
export type FormatWords = {
  text: string;
  heading: string;
  item: string;
  parameter: string;
  value: string;
};

export type FormatResult = { text: string; start: number; end: number };

/** The first and last character of the lines a selection touches. */
const lineRange = (text: string, start: number, end: number) => {
  const from = text.lastIndexOf('\n', start - 1) + 1;
  // A selection that ends right after a line break does not include the next line.
  const last = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const found = text.indexOf('\n', last);

  return { from, to: found === -1 ? text.length : found };
};

/** Applies a mark to every line of the selection, or removes it when every line already has it. */
const formatLines = (
  text: string,
  start: number,
  end: number,
  prefixOf: (index: number) => string,
  hasMark: (line: string) => boolean,
  words: { empty: string }
): FormatResult => {
  const { from, to } = lineRange(text, start, end);
  const block = text.slice(from, to);
  // On an empty line there is nothing to mark yet, so a placeholder is written.
  if (block === '') {
    const inserted = `${prefixOf(0)}${words.empty}`;
    return {
      text: text.slice(0, from) + inserted + text.slice(to),
      start: from + prefixOf(0).length,
      end: from + inserted.length
    };
  }

  const lines = block.split('\n');
  const isMarked = lines.every(line => line === '' || hasMark(line));
  const changed = lines
    .map((line, index) => {
      if (line === '') return line;
      if (isMarked) return line.slice(line.indexOf(' ') + 1);
      return `${prefixOf(index)}${line.replace(/^(#{1,6}|[-*]|\d+\.)\s+/, '')}`;
    })
    .join('\n');

  return {
    text: text.slice(0, from) + changed + text.slice(to),
    start: from,
    end: from + changed.length
  };
};

const wrap = (
  text: string,
  start: number,
  end: number,
  mark: string,
  placeholder: string
): FormatResult => {
  const selected = text.slice(start, end) || placeholder;
  const inserted = `${mark}${selected}${mark}`;

  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    start: start + mark.length,
    end: start + mark.length + selected.length
  };
};

/**
 * Applies a formatting button to the text, like a word processor: it wraps the
 * selected words, or marks each selected line, and returns the new text and
 * where the selection should be.
 */
export const applyFormat = (
  text: string,
  selection: { start: number; end: number },
  kind: FormatKind,
  words: FormatWords
): FormatResult => {
  const { start, end } = selection;

  switch (kind) {
    case 'bold':
      return wrap(text, start, end, '**', words.text);
    case 'italic':
      return wrap(text, start, end, '*', words.text);
    case 'heading1':
    case 'heading2':
    case 'heading3': {
      // `#` for a main heading, `##` for a section, `###` for a sub-section.
      const mark = `${'#'.repeat(Number(kind.slice(-1)))} `;

      return formatLines(
        text,
        start,
        end,
        () => mark,
        line => line.startsWith(mark),
        { empty: words.heading }
      );
    }
    case 'bulletList':
      return formatLines(
        text,
        start,
        end,
        () => '- ',
        line => line.startsWith('- '),
        { empty: words.item }
      );
    case 'numberedList':
      return formatLines(
        text,
        start,
        end,
        index => `${index + 1}. `,
        line => /^\d+\.\s/.test(line),
        { empty: words.item }
      );
    case 'link': {
      const label = text.slice(start, end) || words.text;
      const inserted = `[${label}](https://)`;
      const urlStart = start + label.length + 3;

      return {
        text: text.slice(0, start) + inserted + text.slice(end),
        start: urlStart,
        end: urlStart + 'https://'.length
      };
    }
    case 'table': {
      const table = `| ${words.parameter} | ${words.value} |\n| --- | --- |\n| ${words.item} | ${words.value} |`;
      // A table needs a blank line before it to be read as a table.
      const before = text.slice(0, start);
      const lead =
        before === '' || before.endsWith('\n\n')
          ? ''
          : before.endsWith('\n')
            ? '\n'
            : '\n\n';
      const inserted = `${lead}${table}\n`;

      return {
        text: before + inserted + text.slice(end),
        start: start + inserted.length,
        end: start + inserted.length
      };
    }
  }
};
