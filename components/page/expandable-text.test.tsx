import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

import { ExpandableText } from './expandable-text';

// jsdom does no layout, so the measured heights are set by hand.
const mockHeights = (scrollHeight: number, clientHeight: number) => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    scrollHeight
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
    clientHeight
  );
};

const renderText = (text: string) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ExpandableText>{text}</ExpandableText>
    </NextIntlClientProvider>
  );

afterEach(() => vi.restoreAllMocks());

describe('ExpandableText', () => {
  it('shows no toggle when the text fits', () => {
    mockHeights(60, 60);
    renderText('Short text');

    expect(
      screen.queryByRole('button', { name: en.common.showMore })
    ).not.toBeInTheDocument();
  });

  it('clamps long text and expands and collapses it with the toggle', async () => {
    mockHeights(200, 60);
    const user = userEvent.setup();
    renderText('Long text '.repeat(50));
    const text = screen.getByText(/Long text/);

    expect(text).toHaveClass('line-clamp-3');
    await user.click(screen.getByRole('button', { name: en.common.showMore }));
    expect(text).not.toHaveClass('line-clamp-3');
    expect(
      screen.getByRole('button', { name: en.common.showLess })
    ).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: en.common.showLess }));
    expect(text).toHaveClass('line-clamp-3');
  });
});
