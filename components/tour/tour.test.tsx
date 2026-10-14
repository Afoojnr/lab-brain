import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';
import { clearTourState } from '@/hooks/use-tour-state';
import { en } from '@/messages/en';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname
}));

type DriverConfig = {
  steps: { element: string; popover: { title: string } }[];
  onDestroyStarted: () => void;
};
const driverState = vi.hoisted(() => ({
  configs: [] as unknown[],
  drive: vi.fn(),
  destroy: vi.fn()
}));
vi.mock('driver.js', () => ({
  driver: (config: unknown) => {
    driverState.configs.push(config);

    return { drive: driverState.drive, destroy: driverState.destroy };
  }
}));

import { TourHelpButton } from './help-button';
import { TourPrompt } from './tour-prompt';
import { TourProvider } from './tour-provider';

const text = en.tour;

const setup = (pathname = '/') => {
  navigation.pathname = pathname;
  const view = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        <TourProvider>
          <button data-tour="new-project">New project</button>
          <button data-tour="help-button-target">x</button>
          <TourHelpButton />
          <TourPrompt />
        </TourProvider>
      </SidebarProvider>
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), ...view };
};

const lastConfig = () => driverState.configs.at(-1) as DriverConfig;

beforeEach(() => {
  driverState.configs.length = 0;
  driverState.drive.mockClear();
  driverState.destroy.mockClear();
});

afterEach(() => {
  clearTourState();
});

describe('the guided tour', () => {
  it('asks before starting, and starts with the steps whose element is on the page', async () => {
    const { user } = setup('/');

    expect(driverState.configs).toHaveLength(0);
    expect(screen.getByText(text.prompt.title)).toBeVisible();

    await user.click(screen.getByRole('button', { name: text.prompt.start }));

    await vi.waitFor(() => expect(driverState.drive).toHaveBeenCalled());
    // Only elements that are on the page (the sidebar is not rendered here).
    expect(lastConfig().steps.map(step => step.element)).toEqual([
      '[data-tour="new-project"]',
      '[data-tour="help-button"]'
    ]);
    expect(lastConfig().steps[0]?.popover.title).toBe(
      text.steps.home.newProject.title
    );
  });

  it('remembers a finished tour and does not ask again', async () => {
    const { user, unmount } = setup('/');
    await user.click(screen.getByRole('button', { name: text.prompt.start }));
    await vi.waitFor(() => expect(driverState.drive).toHaveBeenCalled());

    act(() => lastConfig().onDestroyStarted());
    expect(screen.queryByText(text.prompt.title)).toBeNull();
    expect(driverState.destroy).toHaveBeenCalled();

    unmount();
    setup('/');
    expect(screen.queryByText(text.prompt.title)).toBeNull();
  });

  it('Not now hides the card for this page only', async () => {
    const { user, unmount } = setup('/');

    await user.click(screen.getByRole('button', { name: text.prompt.later }));
    expect(screen.queryByText(text.prompt.title)).toBeNull();

    unmount();
    setup('/projects/p1');
    expect(screen.getByText(text.prompt.title)).toBeVisible();
  });

  it('No more tours silences every page, but the help button still replays one', async () => {
    const { user, unmount } = setup('/');
    await user.click(screen.getByRole('button', { name: text.prompt.never }));
    unmount();

    const { user: next } = setup('/');
    expect(screen.queryByText(text.prompt.title)).toBeNull();

    await next.click(screen.getByRole('button', { name: text.help.label }));
    await vi.waitFor(() => expect(driverState.drive).toHaveBeenCalled());
  });

  it('offers nothing on a page without a tour, and no help button there', () => {
    setup('/settings');

    expect(screen.queryByText(text.prompt.title)).toBeNull();
    expect(screen.queryByRole('button', { name: text.help.label })).toBeNull();
  });

  it('does not start when none of the tour elements are on the page', async () => {
    const { user } = setup('/projects/p1/experiments/e1/samples/s1');

    await user.click(screen.getByRole('button', { name: text.help.label }));

    expect(driverState.drive).not.toHaveBeenCalled();
  });
});
