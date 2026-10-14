import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FtirNumberField } from './ftir-number-field';

/** A parent that keeps the value, as every real use does. */
const Harness = ({
  start,
  factor,
  isOptional,
  onValue
}: {
  start: number | null;
  factor?: number;
  isOptional?: boolean;
  onValue: (value: number | null) => void;
}) => {
  const [value, setValue] = useState(start);

  return (
    <FtirNumberField
      id="n"
      label="Number"
      value={value}
      factor={factor}
      isOptional={isOptional}
      onChange={next => {
        setValue(next);
        onValue(next);
      }}
    />
  );
};

const setup = (props: {
  start: number | null;
  factor?: number;
  isOptional?: boolean;
}) => {
  const onValue = vi.fn();
  render(<Harness {...props} onValue={onValue} />);

  return {
    onValue,
    user: userEvent.setup(),
    box: screen.getByLabelText('Number')
  };
};

describe('FtirNumberField', () => {
  it('lets a half-typed number through without reporting it, and reports a real one', async () => {
    const { onValue, user, box } = setup({ start: null, isOptional: true });

    await user.type(box, '-');
    expect(onValue).not.toHaveBeenCalled();
    expect(box).toHaveValue('-');

    await user.type(box, '12,5');
    expect(onValue).toHaveBeenLastCalledWith(-12.5);
    expect(box).toHaveValue('-12,5');
  });

  it('reports null when an optional box is emptied, meaning not set', async () => {
    const { onValue, user, box } = setup({ start: 7, isOptional: true });

    await user.clear(box);

    expect(onValue).toHaveBeenLastCalledWith(null);
    expect(box).toHaveValue('');
  });

  it('lets a box that needs a number be emptied to retype, and keeps its last number meanwhile', async () => {
    const { onValue, user, box } = setup({ start: 10 });

    await user.clear(box);
    expect(box).toHaveValue('');
    expect(onValue).not.toHaveBeenCalled();

    await user.type(box, '25');
    expect(onValue).toHaveBeenLastCalledWith(25);
  });

  it('shows a fraction as a percentage and reports it back as a fraction', async () => {
    const { onValue, user, box } = setup({ start: 0.05, factor: 100 });

    expect(box).toHaveValue('5');
    await user.clear(box);
    await user.type(box, '2');

    expect(onValue).toHaveBeenLastCalledWith(0.02);
  });
});
