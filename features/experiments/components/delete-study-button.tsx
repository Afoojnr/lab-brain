'use client';

import { Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { deleteStudyAction } from '../actions/delete-study';
import { DeleteDialog } from './delete-dialog';

/** A bin next to a study's pencil: opens the confirmation. Its samples stay and only lose the tag. */
export const DeleteStudyButton = ({
  projectId,
  experimentId,
  study,
  sampleCount
}: {
  projectId: string;
  experimentId: string;
  study: { id: string; name: string };
  sampleCount: number;
}) => {
  const t = useTranslations('studies.panel');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={t('delete', { name: study.name })}
        onClick={() => setIsOpen(true)}
      >
        <Trash2Icon aria-hidden />
      </Button>
      <DeleteDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        details={{
          kind: 'study',
          sampleCount,
          onDelete: async () =>
            (await deleteStudyAction(projectId, experimentId, study.id)) !==
            null,
          afterHref: `/projects/${projectId}/experiments/${experimentId}`
        }}
      />
    </>
  );
};
