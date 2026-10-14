'use client';

import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { DeleteDialog } from './delete-dialog';
import type { DeleteDetails } from './delete-dialog';

type RecordMenuProps = {
  /** Edit: a page to go to, or what to do (open the edit dialog). */
  edit: { label: string; href?: string; onSelect?: () => void };
  /** Delete and its confirmation; left out when the page cannot delete. */
  details?: DeleteDetails;
};

/**
 * The "More actions" (⋯) button at the end of a page's header buttons. It holds
 * Edit and Delete; Delete opens its confirmation dialog and nothing is deleted
 * until its red button.
 */
export const RecordMenu = ({ edit, details }: RecordMenuProps) => {
  const t = useTranslations('experiments.delete');
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('moreActions')}
            />
          }
        >
          <EllipsisIcon aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem
            render={edit.href ? <Link href={edit.href} /> : undefined}
            onClick={edit.onSelect}
          >
            <PencilIcon aria-hidden />
            {edit.label}
          </DropdownMenuItem>
          {details && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2Icon aria-hidden />
              {t(`${details.kind}.menuItem`)}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {details && (
        <DeleteDialog
          details={details}
          isOpen={isDeleting}
          onOpenChange={setIsDeleting}
        />
      )}
    </>
  );
};
