'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import {
  SendIcon,
  SparklesIcon,
  SquareIcon,
  TriangleAlertIcon
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Markdown } from '@/components/markdown';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { chatErrorKey } from '../chat/chat-error';
import { collectSources, isWithoutRecords } from '../chat/chat-sources';
import { isAiReady } from '../ai/settings';
import type { ChatMetadata } from '../types';
import { useAiSettings } from '../hooks/use-ai-settings';

type AssistantMessage = UIMessage<ChatMetadata>;

export type ChatScope = { projectId?: string; experimentId?: string };

const EXAMPLES = ['example1', 'example2', 'example3'] as const;

/**
 * The conversation: questions in, streamed answers out, with the records each
 * answer names and the tokens it cost. It lasts while the page is open. The
 * scope (which project or experiment) and the user's AI settings are sent with
 * each question, so changing page or scope never restarts the chat.
 */
export const AssistantChat = ({ scope }: { scope: ChatScope }) => {
  const t = useTranslations('assistant.chat');
  const tErrors = useTranslations('assistant.errors');
  const tSettings = useTranslations('assistant.settings');
  const [settings] = useAiSettings();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    setMessages
  } = useChat<AssistantMessage>({
    transport: new DefaultChatTransport({ api: '/api/assistant' })
  });
  const isReady = isAiReady(settings);
  const canAsk = isReady && scope.projectId !== undefined;
  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (error) {
      toast.error(tErrors(chatErrorKey(error)));
      clearError();
    }
  }, [error, clearError, tErrors]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, status]);

  const ask = (text: string) => {
    const question = text.trim();
    if (question === '' || isBusy || !canAsk) return;
    setDraft('');
    void sendMessage({ text: question }, { body: { scope, settings } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {!isReady && (
          <div className="bg-muted mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 text-sm">
            <p>{t('notReady')}</p>
            <Link
              href="/settings"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('openSettings')}
            </Link>
          </div>
        )}

        {scope.projectId === undefined && (
          <p className="text-muted-foreground mb-4 text-sm">{t('noProject')}</p>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <SparklesIcon
              aria-hidden
              className="text-muted-foreground size-5"
            />
            <h3 className="text-sm font-medium">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground text-sm">{t('emptyHint')}</p>
            <div className="flex flex-col items-start gap-2">
              {EXAMPLES.map(key => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 text-left whitespace-normal"
                  disabled={!canAsk}
                  onClick={() => ask(t(key))}
                >
                  {t(key)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-5" aria-live="polite">
            {messages.map(message => {
              const text = message.parts
                .map(part => (part.type === 'text' ? part.text : ''))
                .join('');
              const isAnswer = message.role === 'assistant';
              const sources = isAnswer ? collectSources(message.parts) : [];
              const tokens = message.metadata?.totalTokens;
              const isLast = message.id === messages.at(-1)?.id;
              const hasNoRecords =
                isAnswer &&
                !(isBusy && isLast) &&
                isWithoutRecords(message.parts);

              return (
                <li
                  key={message.id}
                  className={
                    isAnswer
                      ? 'min-w-0 text-sm'
                      : 'bg-muted self-end rounded-lg px-3 py-2 text-sm'
                  }
                >
                  {isAnswer ? (
                    <>
                      {text !== '' && <Markdown>{text}</Markdown>}
                      {hasNoRecords && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                          <TriangleAlertIcon
                            aria-hidden
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                          {t('noRecords')}
                          {settings.provider === 'ollama' &&
                            ` ${tSettings('ollamaHelp.smallModels')}`}
                        </p>
                      )}
                      {sources.length > 0 && (
                        <p className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          <span>{t('sources')}:</span>
                          {sources.map(source => (
                            <Link
                              key={source.path}
                              href={source.path}
                              className="underline underline-offset-4"
                            >
                              {source.label}
                            </Link>
                          ))}
                        </p>
                      )}
                      {tokens !== undefined && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {t('tokens', { count: tokens })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                  )}
                </li>
              );
            })}
            {isBusy && (
              <li className="text-muted-foreground text-xs">{t('working')}</li>
            )}
          </ol>
        )}
      </div>

      <div className="shrink-0 border-t p-4">
        <form
          className="flex items-end gap-2"
          onSubmit={event => {
            event.preventDefault();
            ask(draft);
          }}
        >
          <Textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                ask(draft);
              }
            }}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            rows={2}
            maxLength={4000}
            className="min-h-0 flex-1 resize-none"
          />
          {isBusy ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('stop')}
              onClick={() => void stop()}
            >
              <SquareIcon aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label={t('send')}
              disabled={!canAsk || draft.trim() === ''}
            >
              <SendIcon aria-hidden />
            </Button>
          )}
        </form>
        <div className="text-muted-foreground mt-2 flex items-start justify-between gap-2 text-xs">
          <p>{t('privacy')}</p>
          {messages.length > 0 && !isBusy && (
            <button
              type="button"
              className="shrink-0 underline underline-offset-4"
              onClick={() => setMessages([])}
            >
              {t('newChat')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
