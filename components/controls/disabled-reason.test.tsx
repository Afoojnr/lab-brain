import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { DisabledReason } from './disabled-reason';

describe('DisabledReason', () => {
  it('shows the reason when the greyed-out button is hovered', async () => {
    render(
      <DisabledReason reason="Another column uses this one. Delete it first.">
        <button type="button" disabled>
          Delete
        </button>
      </DisabledReason>
    );

    await userEvent.hover(
      screen.getByText('Delete').parentElement as HTMLElement
    );

    expect(
      await screen.findAllByText(
        'Another column uses this one. Delete it first.'
      )
    ).not.toHaveLength(0);
  });

  it('shows the reason when it is reached with the keyboard', async () => {
    render(
      <DisabledReason reason="Not now.">
        <button type="button" disabled>
          Delete
        </button>
      </DisabledReason>
    );

    await userEvent.tab();

    expect(await screen.findAllByText('Not now.')).not.toHaveLength(0);
  });

  it('adds nothing around an enabled button', () => {
    const { container } = render(
      <DisabledReason reason={null}>
        <button type="button">Delete</button>
      </DisabledReason>
    );

    expect(container.querySelectorAll('span')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });
});
