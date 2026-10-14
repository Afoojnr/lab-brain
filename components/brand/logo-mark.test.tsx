import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LogoMark } from './logo-mark';

describe('LogoMark', () => {
  it('is hidden from assistive technology unless it has a title', () => {
    const { container, rerender } = render(<LogoMark />);

    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<LogoMark title="Lab Brain" />);
    expect(screen.getByRole('img', { name: 'Lab Brain' })).toBeVisible();
  });

  it('keeps the network of dots in the full mark and drops it in the compact one', () => {
    const { container, rerender } = render(<LogoMark variant="full" />);
    expect(container.querySelectorAll('circle')).toHaveLength(3);

    rerender(<LogoMark variant="compact" />);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('takes its size and colours from props', () => {
    const { container } = render(
      <LogoMark size={48} background="var(--primary)" corner={0} />
    );
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '48');
    expect(container.querySelector('rect')).toHaveAttribute('rx', '0');
    expect(container.querySelector('rect')).toHaveStyle({
      fill: 'var(--primary)'
    });
  });
});
