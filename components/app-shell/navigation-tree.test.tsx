import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';
import { clearPersistentOpen } from '@/hooks/use-persistent-open';
import { en } from '@/messages/en';
import type { NavigationProject } from '@/types/navigation';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { NavProjects } from './nav-projects';
import { NavTechniques } from './nav-techniques';

const t = en.navigation;
const PROJECTS: NavigationProject[] = [
  { id: 'p1', name: 'ALD of BxC' },
  { id: 'p2', name: 'CVD of borophene' }
];
const TECHNIQUES = [{ kind: 'edx' }, { kind: 'ellipsometry' }] as const;

beforeEach(() => {
  clearPersistentOpen();
  // The sidebar asks the browser whether the screen is a phone's.
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {}
    }) as unknown as MediaQueryList;
});

const renderTreeWithUnmount = (path: string, projects = PROJECTS) => {
  pathname = path;
  const result = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarProvider>
        <ul>
          <NavProjects projects={projects} />
          <NavTechniques techniques={TECHNIQUES} />
        </ul>
      </SidebarProvider>
    </NextIntlClientProvider>
  );

  return { user: userEvent.setup(), unmount: result.unmount };
};

const renderTree = (path: string, projects = PROJECTS) =>
  renderTreeWithUnmount(path, projects).user;

describe('Projects', () => {
  it('lists every project as a link, with nothing nested under them', () => {
    renderTree('/');

    expect(screen.getByRole('link', { name: 'ALD of BxC' })).toHaveAttribute(
      'href',
      '/projects/p1'
    );
    expect(
      screen.getByRole('link', { name: 'CVD of borophene' })
    ).toHaveAttribute('href', '/projects/p2');
    // No per-project toggle, no experiments, no search.
    expect(
      screen.queryByRole('button', { name: 'Show or hide ALD of BxC' })
    ).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('marks the project you are in, including on its inner pages', () => {
    renderTree('/projects/p1/experiments/e1/samples/s1');

    expect(screen.getByRole('link', { name: 'ALD of BxC' })).toHaveAttribute(
      'data-active'
    );
    expect(
      screen.getByRole('link', { name: 'CVD of borophene' })
    ).not.toHaveAttribute('data-active');
  });

  it('shows every project, however many', () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      id: `m${index}`,
      name: `Project ${index + 1}`
    }));
    renderTree('/', many);

    expect(screen.getAllByRole('link', { name: /^Project \d+$/ })).toHaveLength(
      25
    );
  });

  it('says so when there are no projects', () => {
    renderTree('/', []);

    expect(screen.getByText(t.noProjects)).toBeVisible();
  });

  it('collapses from its chevron and remembers it', async () => {
    const user = renderTree('/');

    await user.click(
      screen.getByRole('button', { name: 'Show or hide Projects' })
    );

    expect(screen.queryByRole('link', { name: 'ALD of BxC' })).toBeNull();
    expect(window.localStorage.getItem('nav:projects')).toBe('false');
  });
});

describe('the Projects row', () => {
  it('is the way home: its label links to the all-projects page', () => {
    renderTree('/settings');

    expect(screen.getByRole('link', { name: t.projects })).toHaveAttribute(
      'href',
      '/'
    );
  });

  it('is marked on the home page and inside a project, and not elsewhere', () => {
    const { unmount } = renderTreeWithUnmount('/');
    expect(screen.getByRole('link', { name: t.projects })).toHaveAttribute(
      'data-active'
    );
    unmount();

    const inside = renderTreeWithUnmount('/projects/p1/experiments/e1');
    expect(screen.getByRole('link', { name: t.projects })).toHaveAttribute(
      'data-active'
    );
    inside.unmount();

    renderTree('/settings');
    expect(screen.getByRole('link', { name: t.projects })).not.toHaveAttribute(
      'data-active'
    );
  });

  it('has no Dashboard link and no + to create a project (the Projects page does that)', () => {
    renderTree('/');

    expect(screen.queryByRole('link', { name: /dashboard/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New project' })).toBeNull();
  });
});

describe('Characterizations', () => {
  it('lists the techniques that can be analysed, each linking to its workspace', () => {
    renderTree('/');

    expect(screen.getByRole('link', { name: t.edx })).toHaveAttribute(
      'href',
      '/characterization/edx'
    );
    expect(screen.getByRole('link', { name: t.ellipsometry })).toHaveAttribute(
      'href',
      '/characterization/ellipsometry'
    );
  });

  it('marks the workspace you are on', () => {
    renderTree('/characterization/edx');

    expect(screen.getByRole('link', { name: t.edx })).toHaveAttribute(
      'data-active'
    );
    expect(
      screen.getByRole('link', { name: t.ellipsometry })
    ).not.toHaveAttribute('data-active');
  });

  it('collapses from its header and remembers it', async () => {
    const user = renderTree('/');

    await user.click(screen.getByRole('button', { name: t.characterizations }));

    expect(screen.queryByRole('link', { name: t.edx })).toBeNull();
    expect(window.localStorage.getItem('nav:characterizations')).toBe('false');
  });

  it('collapses independently of Projects', async () => {
    const user = renderTree('/');

    await user.click(screen.getByRole('button', { name: t.characterizations }));

    expect(screen.getByRole('link', { name: 'ALD of BxC' })).toBeVisible();
  });
});
