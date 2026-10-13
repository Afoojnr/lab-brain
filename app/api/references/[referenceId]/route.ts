import { getStorage } from '@/lib/storage';

import { getReferenceById } from '@/features/references/server';

/** Opens a reference's PDF in the browser; nothing else is ever served from here. */
export const GET = async (
  _request: Request,
  context: RouteContext<'/api/references/[referenceId]'>
) => {
  const { referenceId } = await context.params;
  const reference = await getReferenceById(referenceId);
  const bytes = reference?.filePath
    ? await getStorage().download(reference.filePath)
    : null;
  if (!reference || !bytes) return new Response('Not found', { status: 404 });

  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache'
    }
  });
};
