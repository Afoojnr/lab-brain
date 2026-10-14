import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders headings (from the second level), bold text and lists', () => {
    render(
      <Markdown>{'# Cleaning\n\nUse **acetone**.\n\n- rinse\n- dry'}</Markdown>
    );

    expect(
      screen.getByRole('heading', { name: 'Cleaning', level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText('acetone').tagName).toBe('STRONG');
    expect(
      screen.getAllByRole('listitem').map(item => item.textContent)
    ).toEqual(['rinse', 'dry']);
  });

  it('renders a table with its header and rows', () => {
    render(
      <Markdown>{'| Step | Time |\n| --- | --- |\n| Pump | 10 min |'}</Markdown>
    );

    expect(
      screen.getByRole('columnheader', { name: 'Step' })
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '10 min' })).toBeInTheDocument();
  });

  it('keeps a single line break, so a protocol written line by line looks the same', () => {
    const { container } = render(
      <Markdown>{'first line\nsecond line'}</Markdown>
    );

    expect(container.querySelectorAll('br')).toHaveLength(1);
  });

  it('renders strikethrough from GitHub-style Markdown', () => {
    const { container } = render(<Markdown>{'~~old~~'}</Markdown>);

    expect(container.querySelector('del')?.textContent).toBe('old');
  });

  it('never runs raw HTML', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script> <b onclick="x()">hi</b>'}</Markdown>
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
  });

  it('does not load pictures, and keeps their text', () => {
    const { container } = render(
      <Markdown>{'![the setup](https://example.com/a.png)'}</Markdown>
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('the setup');
  });

  it('opens links in a new tab without passing the referrer', () => {
    render(<Markdown>{'[paper](https://example.com)'}</Markdown>);

    const link = screen.getByRole('link', { name: 'paper' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('gives # ## ### three clearly different heading sizes, none of them huge', () => {
    render(<Markdown>{'# Main\n\n## Section\n\n### Sub'}</Markdown>);

    const classes = ['Main', 'Section', 'Sub'].map(
      name => screen.getByRole('heading', { name }).className
    );
    expect(classes[0]).toContain('text-lg');
    expect(classes[1]).toContain('text-base');
    expect(classes[2]).toContain('text-sm');
    expect(classes.join(' ')).not.toMatch(/text-(xl|2xl|3xl)/);
  });
});
