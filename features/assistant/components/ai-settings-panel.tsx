'use client';

import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { testAiConnectionAction } from '../actions/test-ai-connection';
import type { AiErrorKey } from '../ai/ai-errors';
import {
  AI_PROVIDERS,
  DEFAULT_MODEL,
  isAiReady,
  MODEL_SUGGESTIONS
} from '../ai/settings';
import type { AiProvider } from '../ai/settings';
import { AiProviderNotes } from './ai-provider-notes';
import { useAiSettings } from '../hooks/use-ai-settings';

type TestResult = { ok: true } | { ok: false; error: AiErrorKey } | null;

/**
 * Where the user chooses the AI that answers their questions: Claude, OpenAI or
 * Ollama (on their own computer), with their own key. Everything is kept in
 * this browser only, sent with each question, and never stored or logged by the
 * server.
 */
export const AiSettingsPanel = () => {
  const t = useTranslations('assistant.settings');
  const tErrors = useTranslations('assistant.errors');
  const [settings, save] = useAiSettings();
  const [isKeyShown, setIsKeyShown] = useState(false);
  const [result, setResult] = useState<TestResult>(null);
  const [isTesting, startTest] = useTransition();
  const providerItems = AI_PROVIDERS.map(provider => ({
    value: provider,
    label: t(`providers.${provider}`)
  }));
  const isOllama = settings.provider === 'ollama';

  const change = (changes: Partial<typeof settings>) => {
    setResult(null);
    save({ ...settings, ...changes });
  };

  const test = () =>
    startTest(async () => {
      try {
        setResult(await testAiConnectionAction(settings));
      } catch {
        setResult({ ok: false, error: 'failed' });
      }
    });

  return (
    <div className="grid max-w-xl gap-5">
      <Field>
        <FieldLabel htmlFor="ai-provider">{t('provider')}</FieldLabel>
        <Select
          items={providerItems}
          value={settings.provider}
          onValueChange={value => {
            if (!value) return;
            const provider = value as AiProvider;
            change({ provider, model: DEFAULT_MODEL[provider] });
          }}
        >
          <SelectTrigger id="ai-provider" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providerItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isOllama ? (
        <Field>
          <FieldLabel htmlFor="ai-base-url">{t('address')}</FieldLabel>
          <Input
            id="ai-base-url"
            autoComplete="off"
            value={settings.baseUrl}
            onChange={event => change({ baseUrl: event.target.value })}
          />
          <FieldDescription>{t('addressHint')}</FieldDescription>
        </Field>
      ) : (
        <Field>
          <FieldLabel htmlFor="ai-key">{t('key')}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="ai-key"
              type={isKeyShown ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={settings.apiKey}
              onChange={event => change({ apiKey: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t(isKeyShown ? 'hideKey' : 'showKey')}
              aria-pressed={isKeyShown}
              onClick={() => setIsKeyShown(!isKeyShown)}
            >
              {isKeyShown ? (
                <EyeOffIcon aria-hidden />
              ) : (
                <EyeIcon aria-hidden />
              )}
            </Button>
          </div>
          <FieldDescription>{t('keyHint')}</FieldDescription>
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor="ai-model">{t('model')}</FieldLabel>
        <Input
          id="ai-model"
          list="ai-model-suggestions"
          autoComplete="off"
          spellCheck={false}
          value={settings.model}
          onChange={event => change({ model: event.target.value })}
        />
        <datalist id="ai-model-suggestions">
          {MODEL_SUGGESTIONS[settings.provider].map(model => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <FieldDescription>{t('modelHint')}</FieldDescription>
      </Field>

      {settings.provider === 'openrouter' && (
        <Field orientation="horizontal">
          <Checkbox
            id="ai-zero-retention"
            checked={settings.isZeroRetention}
            onCheckedChange={isChecked =>
              change({ isZeroRetention: isChecked })
            }
          />
          <div className="grid gap-1">
            <FieldLabel htmlFor="ai-zero-retention">
              {t('zeroRetention')}
            </FieldLabel>
            <FieldDescription>{t('zeroRetentionHint')}</FieldDescription>
          </div>
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={!isAiReady(settings) || isTesting}
          onClick={test}
        >
          {isTesting ? t('testing') : t('test')}
        </Button>
        {result && (
          <p
            role="status"
            className={result.ok ? 'text-sm' : 'text-destructive text-sm'}
          >
            {result.ok ? t('works') : tErrors(result.error)}
          </p>
        )}
      </div>

      <AiProviderNotes provider={settings.provider} />
      <p className="text-muted-foreground text-xs">{t('privacy')}</p>
    </div>
  );
};
