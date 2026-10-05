'use client';

import { Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { deleteParameterDefinitionAction } from '../actions/delete-parameter-definition';

type DeleteParameterButtonProps = {
  projectId: string;
  experimentId: string;
  parameter: { id: string; name: string };
  /** Samples hold values for it, so it cannot be deleted. */
  isInUse: boolean;
};

/** Removes an unused parameter; disabled, with the reason, once samples use it. */
export const DeleteParameterButton = ({
  projectId,
  experimentId,
  parameter,
  isInUse
}: DeleteParameterButtonProps) => {
  const t = useTranslations('parameters');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      try {
        const wasDeleted = await deleteParameterDefinitionAction(
          projectId,
          experimentId,
          parameter.id
        );
        if (wasDeleted) toast.success(t('deleted', { name: parameter.name }));
        else toast.error(tErrors('unexpected'));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('panel.delete', { name: parameter.name })}
      title={isInUse ? t('panel.inUse') : undefined}
      disabled={isInUse || isPending}
      onClick={remove}
    >
      <Trash2Icon aria-hidden />
    </Button>
  );
};
