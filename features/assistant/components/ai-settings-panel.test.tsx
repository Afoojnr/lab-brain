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
    expect(screen.getByLabelText(t.settings.model)).toHaveValue('qwen2.5:7b');
    expect(screen.getByRole('button', { name: t.settings.test })).toBeEnabled();
  });

  const choose = async (
    user: ReturnType<typeof renderPanel>,
    provider: keyof typeof t.settings.providers
  ) => {
    await user.click(screen.getByLabelText(t.settings.provider));
    await user.click(
      await screen.findByRole('option', {
        name: t.settings.providers[provider]
      })
    );
  };

  it("says what the app can and cannot do about data for the chosen provider, with the provider's own policy", async () => {
    const user = renderPanel();

    expect(
      screen.getByText(/cannot switch a "do not train" setting for Claude/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: t.settings.policy })
    ).toHaveAttribute('href', expect.stringContaining('anthropic.com'));

    await choose(user, 'openrouter');
    expect(
      screen.getByText(
        /always asks OpenRouter to use only providers that do not collect/
      )
    ).toBeInTheDocument();

    await choose(user, 'ollama');
    expect(
      screen.getByText(/nothing you ask or any record leaves it/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.settings.policy })).toBeNull();
  });

  it('offers zero data retention only for OpenRouter, and saves the choice', async () => {
    const user = renderPanel();
    expect(
      screen.queryByRole('checkbox', { name: t.settings.zeroRetention })
    ).toBeNull();

    await choose(user, 'openrouter');
    const box = screen.getByRole('checkbox', {
      name: t.settings.zeroRetention
    });
    expect(box).not.toBeChecked();
    await user.click(box);

    expect(box).toBeChecked();
  });

  it('shows how to install Ollama and which model to pull, only for Ollama', async () => {
    const user = renderPanel();
    expect(screen.queryByText(t.settings.ollamaHelp.title)).toBeNull();

    await choose(user, 'ollama');
    await user.click(screen.getByText(t.settings.ollamaHelp.title));

    expect(screen.getByText(/ollama.com\/download/)).toBeVisible();
    expect(screen.getByText('ollama pull qwen2.5:7b')).toBeVisible();
    expect(screen.getByText(/Small 3B models often cannot use/)).toBeVisible();
  });
});
