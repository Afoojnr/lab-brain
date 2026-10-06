import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../actions/commit-import', () => ({
  commitImportAction: vi.fn()
}));

import { commitImportAction } from '../../actions/commit-import';
import { ImportWizard } from '.';
import type { ImportData } from './types';

const t = en.import;

const DATA: ImportData = {
  experiments: [{ id: 'e1', name: 'Deposition', codePrefix: 'ALD' }],
  newExperiment: {
    otherPrefixes: ['ALD'],
    columns: [],
    studies: [],
    experimentSamples: [],
    otherCodes: ['ALD001']
  },
  existing: {
    e1: {
      otherPrefixes: ['ALD'],
      columns: [
        {
          id: 'c1',
          experimentId: 'e1',
          name: 'Power',
          unit: 'W',
          kind: 'number',
          role: 'parameter',
          defaultValue: null,
          position: 0
        }
      ],
      studies: [],
      experimentSamples: [
        {
          id: 's1',
          experimentId: 'e1',
          code: 'ALD001',
          performedOn: null,
          values: { c1: 100 },
          implementation: null,
          observation: null,
          note: null,
          studyIds: [],
          createdAt: new Date(0)
        }
      ],
      otherCodes: []
    }
  }
};

// Fake data only.
const CSV = 'Sample;Power (W);Remarks\nALD001;200;first\nALD002;abc;second\n';

const renderWizard = (preselected?: string) => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ImportWizard
        projectId="p1"
        data={DATA}
        preselectedExperimentId={preselected}
      />
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

const upload = async (user: ReturnType<typeof userEvent.setup>) => {
  const file = new File([CSV], 'fake.csv', { type: 'text/csv' });
  await user.upload(screen.getByLabelText(t.upload.fileLabel), file);
  await screen.findByText(t.layout.description);
};

const next = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: t.nav.next }));

describe('ImportWizard', () => {
  it('accepts a file dropped on the drop zone', async () => {
    renderWizard();
    const file = new File([CSV], 'fake.csv', { type: 'text/csv' });

    fireEvent.drop(screen.getByText(t.upload.dropTitle), {
      dataTransfer: { files: [file] }
    });

    expect(await screen.findByText(t.layout.description)).toBeVisible();
  });

  it('goes back to an earlier step from the step list and keeps what was entered', async () => {
    const user = renderWizard('e1');
    await upload(user);
    await next(user);
    await next(user);
    expect(screen.getByText(t.mapping.description)).toBeVisible();

    await user.click(
      screen.getByRole('button', {
        name: t.steps.goTo.replace('{step}', t.steps.layout)
      })
    );
    expect(screen.getByText(t.layout.description)).toBeVisible();
    // Not offered for the step you are on or for later ones.
    expect(
      screen.queryByRole('button', {
        name: t.steps.goTo.replace('{step}', t.steps.mapping)
      })
    ).toBeNull();
  });

  it('suggests the mapping from the headers and the prefix from the codes', async () => {
    const user = renderWizard();
    await upload(user);
    await next(user);

    expect(screen.getByLabelText(t.target.nameLabel)).toHaveValue('fake');
    expect(screen.getByLabelText(t.target.prefixLabel)).toHaveValue('ALD');
  });

  it('blocks a prefix the project already uses, with its message', async () => {
    const user = renderWizard();
    await upload(user);
    await next(user);

    expect(await screen.findByText(t.issues.codePrefixDuplicate)).toBeVisible();
    expect(screen.getByRole('button', { name: t.nav.next })).toBeDisabled();
  });

  it('cannot continue from the mapping until a code column is chosen', async () => {
    const user = renderWizard('e1');
    await upload(user);
    await next(user);
    await next(user);

    const codeSelect = screen.getByRole('combobox', {
      name: `${t.mapping.targetHeader}: Sample`
    });
    expect(codeSelect).toHaveTextContent(t.mapping.targets.code);

    await user.click(codeSelect);
    await user.click(
      await screen.findByRole('option', { name: t.mapping.targets.ignore })
    );

    expect(screen.getByRole('button', { name: t.nav.next })).toBeDisabled();
    expect(screen.getByText(t.issues.codeNotMapped)).toBeVisible();
  });

  it('previews a conflict as skipped, flags text in a number column, then imports', async () => {
    vi.mocked(commitImportAction).mockResolvedValue({
      isOk: true,
      created: 1,
      updated: 1,
      skipped: 0,
      experimentId: 'e1'
    });
    const user = renderWizard('e1');
    await upload(user);
    await next(user);
    await next(user);
    await next(user);

    expect(
      await screen.findByText(t.issues.valueNotANumber, { exact: false })
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: t.preview.submit })
    ).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', { name: t.preview.skipErrors })
    );
    const row = screen.getByText('ALD001').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('combobox'));
    await user.click(
      await screen.findByRole('option', { name: t.preview.choice.update })
    );

    await user.click(screen.getByRole('button', { name: t.preview.submit }));

    await waitFor(() => expect(commitImportAction).toHaveBeenCalledTimes(1));
    expect(vi.mocked(commitImportAction).mock.calls[0]?.[1]).toMatchObject({
      choices: { '2': { action: 'update' } },
      shouldSkipErrorRows: true
    });
    expect(await screen.findByText(t.done.reminder)).toBeVisible();
  });
});
