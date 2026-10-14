'use client';

import { useState } from 'react';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type FtirNumberFieldProps = {
  id: string;
  label: string;
  /** The number, or null when the box is empty (which means "not set"). */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Shown to the user times this and read back divided by it (e.g. 100 for a percentage). */
  factor?: number;
  placeholder?: string;
  isDisabled?: boolean;
  /** Whether the box may be empty (not set). A box that needs a number keeps its last one when emptied. */
  isOptional?: boolean;
};

const parse = (text: string, factor: number): number | null => {
  if (text.trim() === '') return null;
  const number = Number(text.replace(',', '.'));

  return Number.isFinite(number) ? number / factor : null;
};

/**
 * A number box that lets you type freely (a minus sign, a decimal point, nothing
 * at all) and only reports a value when what is typed is a number. Empty reports null.
 */
export const FtirNumberField = ({
  id,
  label,
  value,
  onChange,
  factor = 1,
  placeholder,
  isDisabled = false,
  isOptional = false
}: FtirNumberFieldProps) => {
  const shown =
    value === null ? '' : String(Number((value * factor).toFixed(6)));
  // What the user typed, and what value it meant. It stays on screen only while
  // that is still the value (otherwise something else changed it, like detecting
  // peaks); a box that needs a number keeps its last number while it is emptied.
  const [draft, setDraft] = useState<{
    text: string;
    meaning: number | null;
  } | null>(null);
  const text = draft !== null && draft.meaning === value ? draft.text : shown;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={isDisabled}
        onChange={event => {
          const next = event.target.value;
          const parsed = parse(next, factor);
          const isEmptied = next.trim() === '' && isOptional;
          setDraft({
            text: next,
            meaning: parsed ?? (isEmptied ? null : value)
          });
          if (parsed !== null) onChange(parsed);
          else if (isEmptied) onChange(null);
        }}
      />
    </Field>
  );
};
