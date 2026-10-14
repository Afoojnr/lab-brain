'use client';

import { useTranslations } from 'next-intl';

import type { AiProvider } from '../ai/settings';

/** Each provider's own statement of what it does with data sent to it; the app never paraphrases these as promises. */
const POLICY_LINKS: Record<AiProvider, string | null> = {
  anthropic: 'https://www.anthropic.com/legal/privacy',
  openai: 'https://platform.openai.com/docs/guides/your-data',
  openrouter: 'https://openrouter.ai/docs/provider-routing',
  ollama: null
};

/**
 * What the app can and cannot do about the user's data for the chosen provider,
 * with a link to that provider's own policy.
 */
export const AiProviderNotes = ({ provider }: { provider: AiProvider }) => {
  const t = useTranslations('assistant.settings');
  const policy = POLICY_LINKS[provider];
  const code = (chunks: React.ReactNode) => (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">
      {chunks}
    </code>
  );

  return (
    <div className="grid gap-4">
      <section className="grid gap-1">
        <h3 className="text-sm font-medium">{t('privacyHeading')}</h3>
        <p className="text-muted-foreground text-xs">
          {t(`privacyBy.${provider}`)}
        </p>
        {policy && (
          <a
            href={policy}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline underline-offset-4"
          >
            {t('policy')}
          </a>
        )}
      </section>
      {provider === 'ollama' && (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            {t('ollamaHelp.title')}
          </summary>
          <ol className="text-muted-foreground mt-3 grid list-decimal gap-2 pl-5 text-xs">
            <li>{t.rich('ollamaHelp.install', { code })}</li>
            <li>{t.rich('ollamaHelp.pull', { code })}</li>
            <li>{t.rich('ollamaHelp.run', { code })}</li>
          </ol>
        </details>
      )}
    </div>
  );
};
