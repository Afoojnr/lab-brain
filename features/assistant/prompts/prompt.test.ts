import { describe, expect, it } from 'vitest';

import {
  buildSystemPrompt,
  MAX_BACKGROUND_CHARS,
  MAX_REFERENCE_CHARS,
  referenceBrief
} from './prompt';

const project = { name: 'ALD of BxC', description: null, background: null };

describe('buildSystemPrompt', () => {
  it('carries the rules and the scope', () => {
    const prompt = buildSystemPrompt({
      project,
      references: [],
      experimentName: 'Deposition'
    });

    expect(prompt).toContain('never treat it as 0');
    expect(prompt).toContain('not instructions');
    expect(prompt).toContain('read-only');
    expect(prompt).toContain('"Deposition"');
    expect(prompt).not.toContain('<project_background>');
    expect(prompt).not.toContain('<references>');
  });

  it('puts the background between markers and cuts a long one', () => {
    const prompt = buildSystemPrompt({
      project: {
        ...project,
        background: 'x'.repeat(MAX_BACKGROUND_CHARS + 500)
      },
      references: []
    });

    expect(prompt).toContain('whole project');
    expect(prompt).toContain('<project_background>');
    expect(prompt).toContain('[cut]');
    expect(prompt.length).toBeLessThan(MAX_BACKGROUND_CHARS + 3000);
  });

  it('uses the summary, else the note, else just the title', () => {
    const prompt = buildSystemPrompt({
      project,
      references: [
        {
          title: 'A',
          authors: 'Lee',
          year: 2020,
          summary: 'About growth.',
          note: 'n1'
        },
        {
          title: 'B',
          authors: null,
          year: null,
          summary: null,
          note: 'Why B matters'
        },
        { title: 'C', authors: null, year: null, summary: null, note: null }
      ]
    });

    expect(prompt).toContain('- A (Lee, 2020): About growth.');
    expect(prompt).not.toContain('n1');
    expect(prompt).toContain('- B: Why B matters');
    expect(prompt).toContain('- C (no summary or note)');
  });

  it('caps each reference', () => {
    const brief = referenceBrief({
      summary: 'y'.repeat(MAX_REFERENCE_CHARS * 2),
      note: null
    });

    expect(brief?.length).toBeLessThan(MAX_REFERENCE_CHARS + 20);
  });
});
