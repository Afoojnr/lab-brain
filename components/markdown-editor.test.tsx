import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { en } from '@/messages/en';

import { MarkdownEditor } from './markdown-editor';

const Harness = ({ initial = '' }: { initial?: string }) => {
  const [value, setValue] = useState(initial);

  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <MarkdownEditor id="protocol" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </NextIntlClientProvider>
  );
};

describe('MarkdownEditor', () => {
  it('bolds the selected words with the Bold button', async () => {
    render(<Harness initial="pump down" />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    box.focus();
    box.setSelectionRange(0, 4);

    await userEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(box).toHaveValue('**pump** down');
  });

  it('turns the lines into a bullet list', async () => {
    render(<Harness initial={'a\nb'} />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    box.setSelectionRange(0, 3);

    await userEvent.click(screen.getByRole('button', { name: 'Bullet list' }));

    expect(box).toHaveValue('- a\n- b');
  });

  it('shows the formatted result in Preview, and the formatting buttons are off there', async () => {
    render(<Harness initial={'## Steps\n\n- one'} />);

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(
      screen.getByRole('heading', { name: 'Steps', level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Write' }));
    expect(screen.getByRole('textbox')).toHaveValue('## Steps\n\n- one');
  });

  it('says so when there is nothing to preview', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByText('Nothing to preview yet.')).toBeInTheDocument();
  });
});
