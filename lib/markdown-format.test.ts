import { describe, expect, it } from 'vitest';

import { applyFormat } from './markdown-format';

const WORDS = {
  text: 'text',
  heading: 'Heading',
  item: 'Item',
  parameter: 'Parameter',
  value: 'Value'
};
const at = (start: number, end = start) => ({ start, end });

describe('applyFormat: inline marks', () => {
  it('wraps the selected words and keeps them selected', () => {
    const result = applyFormat('pump down now', at(0, 4), 'bold', WORDS);

    expect(result.text).toBe('**pump** down now');
    expect(result.text.slice(result.start, result.end)).toBe('pump');
  });

  it('writes a selected placeholder when nothing is selected', () => {
    const result = applyFormat('ab', at(1), 'italic', WORDS);

    expect(result.text).toBe('a*text*b');
    expect(result.text.slice(result.start, result.end)).toBe('text');
  });
});

describe('applyFormat: lines', () => {
  it('makes the current line a section heading', () => {
    expect(applyFormat('Cleaning\nPump', at(3), 'heading2', WORDS).text).toBe(
      '## Cleaning\nPump'
    );
  });

  it('turns every selected line into a bullet, and takes it off again', () => {
    const marked = applyFormat(
      'one\ntwo\nthree',
      at(0, 13),
      'bulletList',
      WORDS
    );

    expect(marked.text).toBe('- one\n- two\n- three');
    expect(
      applyFormat(
        marked.text,
        at(marked.start, marked.end),
        'bulletList',
        WORDS
      ).text
    ).toBe('one\ntwo\nthree');
  });

  it('numbers the selected lines in order', () => {
    expect(applyFormat('a\nb\nc', at(0, 5), 'numberedList', WORDS).text).toBe(
      '1. a\n2. b\n3. c'
    );
  });

  it('switches a bullet line to a numbered one instead of stacking marks', () => {
    expect(applyFormat('- a\n- b', at(0, 7), 'numberedList', WORDS).text).toBe(
      '1. a\n2. b'
    );
  });

  it('writes a placeholder on an empty line', () => {
    const result = applyFormat('', at(0), 'heading2', WORDS);

    expect(result.text).toBe('## Heading');
    expect(result.text.slice(result.start, result.end)).toBe('Heading');
  });

  it('does not touch the line after a selection that ends at a line break', () => {
    expect(applyFormat('a\nb\n', at(0, 2), 'bulletList', WORDS).text).toBe(
      '- a\nb\n'
    );
  });
});

describe('applyFormat: heading levels', () => {
  it('writes one, two or three marks for H1, H2 and H3', () => {
    expect(applyFormat('Title', at(2), 'heading1', WORDS).text).toBe('# Title');
    expect(applyFormat('Title', at(2), 'heading2', WORDS).text).toBe(
      '## Title'
    );
    expect(applyFormat('Title', at(2), 'heading3', WORDS).text).toBe(
      '### Title'
    );
  });

  it('changes the level of a heading instead of stacking marks, and pressing the same level again takes it off', () => {
    expect(applyFormat('## Title', at(3), 'heading1', WORDS).text).toBe(
      '# Title'
    );
    expect(applyFormat('# Title', at(2), 'heading3', WORDS).text).toBe(
      '### Title'
    );
    expect(applyFormat('### Title', at(4), 'heading3', WORDS).text).toBe(
      'Title'
    );
  });

  it('turns a bullet line into a heading without keeping the bullet', () => {
    expect(applyFormat('- Title', at(2), 'heading2', WORDS).text).toBe(
      '## Title'
    );
  });
});

describe('applyFormat: table and link', () => {
  it('inserts a table with a blank line before it', () => {
    const result = applyFormat('Steps', at(5), 'table', WORDS);

    expect(result.text).toBe(
      'Steps\n\n| Parameter | Value |\n| --- | --- |\n| Item | Value |\n'
    );
  });

  it('inserts a table at the start without extra blank lines', () => {
    expect(
      applyFormat('', at(0), 'table', WORDS).text.startsWith('| Parameter')
    ).toBe(true);
  });

  it('turns the selection into a link and selects the address to type', () => {
    const result = applyFormat('see paper here', at(4, 9), 'link', WORDS);

    expect(result.text).toBe('see [paper](https://) here');
    expect(result.text.slice(result.start, result.end)).toBe('https://');
  });
});
