import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/messages/en';

vi.mock('../actions/test-ai-connection', () => ({
  testAiConnectionAction: vi.fn()
}));

import { testAiConnectionAction } from '../actions/test-ai-connection';
import { clearAiSettings } from '../hooks/use-ai-settings';
import { AiSettingsPanel } from './ai-settings-panel';

const t = en.assistant;

const renderPanel = () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AiSettingsPanel />
    </NextIntlClientProvider>
  );

  return userEvent.setup();
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => clearAiSettings());

describe('AiSettingsPanel', () => {
  it('starts on Claude with its default model, and cannot test until a key is typed', () => {
    renderPanel();

    expect(screen.getByLabelText(t.settings.model)).toHaveValue(
      'claude-sonnet-5-5'
    );
    expect(
      screen.getByRole('button', { name: t.settings.test })
    ).toBeDisabled();
  });

  it('hides the key as it is typed, can show it, and keeps it in this browser only', async () => {
    const user = renderPanel();
    const key = screen.getByLabelText(t.settings.key);

    await user.type(key, 'sk-abc');
    expect(key).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: t.settings.showKey }));
    expect(key).toHaveAttribute('type', 'text');
    expect(window.localStorage.getItem('lab-brain:ai-settings')).toContain(
      'sk-abc'
    );
  });

  it('tests the connection with what was typed and says it works', async () => {
    vi.mocked(testAiConnectionAction).mockResolvedValueOnce({ ok: true });
    const user = renderPanel();

    await user.type(screen.getByLabelText(t.settings.key), 'sk-abc');
    await user.click(screen.getByRole('button', { name: t.settings.test }));

    await waitFor(() =>
      expect(testAiConnectionAction).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'anthropic', apiKey: 'sk-abc' })
      )
    );
    expect(await screen.findByText(t.settings.works)).toBeVisible();
  });

  it('explains a refused key', async () => {
    vi.mocked(testAiConnectionAction).mockResolvedValueOnce({
      ok: false,
      error: 'unauthorized'
    });
    const user = renderPanel();

    await user.type(screen.getByLabelText(t.settings.key), 'sk-bad');
    await user.click(screen.getByRole('button', { name: t.settings.test }));

    expect(await screen.findByText(t.errors.unauthorized)).toBeVisible();
  });

  it('asks for an address instead of a key for Ollama, with no key needed to test', async () => {
    const user = renderPanel();

    await user.click(screen.getByLabelText(t.settings.provider));
    await user.click(
      await screen.findByRole('option', { name: t.settings.providers.ollama })
    );

    expect(screen.queryByLabelText(t.settings.key)).toBeNull();
    expect(screen.getByLabelText(t.settings.address)).toHaveValue(
      'http://localhost:11434/v1'
    );
    expect(screen.getByLabelText(t.settings.model)).toHaveValue('llama3.1');
    expect(screen.getByRole('button', { name: t.settings.test })).toBeEnabled();
  });
});
