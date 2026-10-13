import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

const pathname = vi.hoisted(() => ({ current: '/projects/p1' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

import { AskAiFloating } from './ask-ai-floating';
import { SidePanel, SidePanelProvider } from './side-panel';

const page = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidePanelProvider>
        <AskAiFloating />
        <SidePanel title="Assistant" closeLabel="Close the assistant">
          <input aria-label="Question" />
        </SidePanel>
      </SidePanelProvider>
    </NextIntlClientProvider>
  );

beforeEach(() => {
  pathname.current = '/projects/p1/experiments/e1';
});

describe('SidePanel with the floating Ask AI button', () => {
  it('opens the panel, and hides the button while the panel is open', async () => {
    const user = userEvent.setup();
    page();

    expect(screen.queryByLabelText('Question')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Ask AI' }));

    expect(
      screen.getByRole('complementary', { name: 'Assistant' })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ask AI' })).toBeNull();
  });

  it('keeps what was typed when it is closed and opened again', async () => {
    const user = userEvent.setup();
    page();

    await user.click(screen.getByRole('button', { name: 'Ask AI' }));
    await user.type(screen.getByLabelText('Question'), 'why?');
    await user.click(
      screen.getByRole('button', { name: 'Close the assistant' })
    );
    expect(screen.queryByRole('complementary')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ask AI' }));
    expect(screen.getByLabelText('Question')).toHaveValue('why?');
  });

  it('shows the button only on project pages', () => {
    pathname.current = '/plots';
    page();

    expect(screen.queryByRole('button', { name: 'Ask AI' })).toBeNull();
  });
});
