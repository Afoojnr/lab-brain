import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import Link from 'next/link';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/create-project', () => ({
  createProjectAction: vi.fn()
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ExperimentChecklist } from './experiment-checklist';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectsEmpty } from './projects-empty';

const renderWithIntl = (ui: React.ReactElement) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
  return userEvent.setup();
};

describe('ProjectsEmpty (first run)', () => {
  it('welcomes the user, offers to create the first project, and shows what the app adds under it', () => {
    renderWithIntl(
      <ProjectsEmpty>
        <Link href="/characterization/edx">EDX</Link>
      </ProjectsEmpty>
    );

    expect(screen.getByText(en.home.empty.title)).toBeVisible();
    expect(
      screen.getByRole('button', { name: en.home.empty.create })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'EDX' })).toHaveAttribute(
      'href',
      '/characterization/edx'
    );
  });

  it('opens the New project form from the create button', async () => {
    const user = renderWithIntl(<ProjectsEmpty />);

    await user.click(
      screen.getByRole('button', { name: en.home.empty.create })
    );

    expect(
      await screen.findByLabelText(en.projects.form.nameLabel)
    ).toBeVisible();
  });
});

describe('NewProjectDialog', () => {
  it('is a labelled button that opens the form, with the text replaceable', async () => {
    const user = renderWithIntl(<NewProjectDialog label="Start here" />);

    await user.click(screen.getByRole('button', { name: 'Start here' }));

    expect(
      await screen.findByLabelText(en.projects.form.nameLabel)
    ).toBeVisible();
  });

  it('says "New project" by default', () => {
    renderWithIntl(<NewProjectDialog />);

    expect(
      screen.getByRole('button', { name: en.projects.form.title })
    ).toBeVisible();
  });
});

describe('ExperimentChecklist', () => {
  const t = en.experiments.checklist;
  const renderChecklist = (hasColumns: boolean) =>
    renderWithIntl(
      <ExperimentChecklist
        projectId="p1"
        experimentId="e1"
        hasColumns={hasColumns}
      />
    );

  it('starts with both steps to do, and links to the columns, a new sample and the import', () => {
    renderChecklist(false);

    // Both steps are still to do.
    expect(screen.getAllByText(`(${t.todo})`, { exact: false })).toHaveLength(
      2
    );
    expect(screen.queryByText(`(${t.done})`, { exact: false })).toBeNull();
    expect(screen.getByRole('link', { name: t.step1Action })).toHaveAttribute(
      'href',
      '#parameters'
    );
    expect(screen.getByRole('link', { name: t.step2Add })).toHaveAttribute(
      'href',
      '/projects/p1/experiments/e1/samples/new'
    );
    expect(screen.getByRole('link', { name: t.step2Import })).toHaveAttribute(
      'href',
      '/projects/p1/import?experiment=e1'
    );
  });

  it('ticks the first step once the experiment has columns', () => {
    renderChecklist(true);

    expect(
      screen.getByText(`(${t.done})`, { exact: false })
    ).toBeInTheDocument();
  });

  it('says what comes after: attaching the instrument files', () => {
    renderChecklist(false);

    expect(screen.getByText(t.later)).toBeVisible();
  });
});
