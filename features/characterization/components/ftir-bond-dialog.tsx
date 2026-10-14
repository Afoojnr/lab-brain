'use client';

import { PencilIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { saveBondAction } from '../actions/ftir-bonds';
import { MAX_BONDS, parseBondRows } from '../techniques/ftir/bonds';
import type { FtirBond } from '../techniques/ftir/types';

type BondFormValues = {
  bond: string;
  from: string;
  to: string;
  source: string;
};

type FtirBondFormProps = {
  /** The bond being changed; none when adding. */
  bond?: FtirBond;
  /** Every bond, so a repeat is caught before it is sent. */
  bonds: FtirBond[];
  onCancel: () => void;
  onSaved: () => void;
};

const BondForm = ({ bond, bonds, onCancel, onSaved }: FtirBondFormProps) => {
  const t = useTranslations('analysis.ftir.bonds');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<BondFormValues>({
    defaultValues: {
      bond: bond?.bond ?? '',
      from: bond ? String(bond.from) : '',
      to: bond && bond.to !== bond.from ? String(bond.to) : '',
      source: bond?.source ?? ''
    }
  });

  const submit = handleSubmit(values => {
    // The same reading rules as a pasted table: one source of truth.
    const { bonds: read, problems } = parseBondRows(
      [
        ['Bond', 'From', 'To', 'Source'],
        [values.bond, values.from, values.to, values.source]
      ],
      bonds.filter(item => item.id !== bond?.id)
    );
    const [problem] = problems;
    if (problem || !read[0]) {
      const field =
        problem?.reason === 'missingBond' ||
        problem?.reason === 'duplicate' ||
        problem?.reason === 'alreadyThere'
          ? 'bond'
          : problem?.reason === 'rangeOrder' || problem?.column === 'To'
            ? 'to'
            : 'from';
      setError(field, { message: problem?.reason ?? 'missingFrom' });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveBondAction(read[0], bond?.id);
        if (!result.ok) {
          toast.error(
            result.error === 'tooMany'
              ? t('errors.tooMany', { max: MAX_BONDS })
              : result.error === 'duplicate'
                ? t('errors.duplicate')
                : t('errors.failed')
          );
          return;
        }

        toast.success(t('saved'));
        onSaved();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  });

  const errorText = (message: string | undefined) => {
    if (!message) return undefined;

    return message === 'notNumber' ||
      message === 'rangeOrder' ||
      message === 'missingBond' ||
      message === 'missingFrom' ||
      message === 'duplicate' ||
      message === 'alreadyThere'
      ? t(`errors.${message}`)
      : undefined;
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.bond)}>
          <FieldLabel htmlFor="bond-name">{t('bond')}</FieldLabel>
          <Input
            id="bond-name"
            autoComplete="off"
            maxLength={100}
            aria-invalid={Boolean(errors.bond)}
            {...register('bond')}
          />
          <FieldError>{errorText(errors.bond?.message)}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.from)}>
            <FieldLabel htmlFor="bond-from">{t('from')}</FieldLabel>
            <Input
              id="bond-from"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={Boolean(errors.from)}
              {...register('from')}
            />
            <FieldError>{errorText(errors.from?.message)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.to)}>
            <FieldLabel htmlFor="bond-to">{t('to')}</FieldLabel>
            <Input
              id="bond-to"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={Boolean(errors.to)}
              {...register('to')}
            />
            <FieldError>{errorText(errors.to?.message)}</FieldError>
          </Field>
        </div>
        <FieldDescription>{t('toHint')}</FieldDescription>
        <Field>
          <FieldLabel htmlFor="bond-source">{t('source')}</FieldLabel>
          <Input
            id="bond-source"
            autoComplete="off"
            maxLength={200}
            placeholder={t('sourcePlaceholder')}
            {...register('source')}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
};

/** A button that opens a form to add a bond to the table, or (with a bond) to change it. */
export const FtirBondDialog = ({
  bond,
  bonds
}: {
  bond?: FtirBond;
  bonds: FtirBond[];
}) => {
  const t = useTranslations('analysis.ftir.bonds');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          bond ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('edit', { bond: bond.bond })}
            />
          ) : (
            <Button type="button" variant="outline" size="sm" />
          )
        }
      >
        {bond ? (
          <PencilIcon aria-hidden />
        ) : (
          <>
            <PlusIcon aria-hidden />
            {t('add')}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bond ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {/* Remounts on each open, so a cancelled edit never keeps old values. */}
        {isOpen && (
          <BondForm
            bond={bond}
            bonds={bonds}
            onCancel={() => setIsOpen(false)}
            onSaved={() => setIsOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
