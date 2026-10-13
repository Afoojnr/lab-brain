import { handleChat } from '@/features/assistant/server';

export const maxDuration = 120;

/** Streams the assistant's answer to one question. */
export const POST = (request: Request) => handleChat(request);
