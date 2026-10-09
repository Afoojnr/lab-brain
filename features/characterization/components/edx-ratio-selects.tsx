'use client';

import { useTranslations } from 'next-intl';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type EdxRatioSelectsProps = {
  /** The elements to offer. */
  elements: string[];
  numerator: string;
  denominator: string;
  onChange: (numerator: string, denominator: string) => void;
  /** Distinguishes the field ids when more than one is on the page. */
  idPrefix?: string;
};

/** The two elements of the ratio, e.g. B over N; any pair of elements can be chosen. */
export const EdxRatioSelects = ({
  elements,
  numerator,
  denominator,
  onChange,
  idPrefix = 'edx'
}: EdxRatioSelectsProps) => {
  const t = useTranslations('analysis.edx');
  const items = elements.map(element => ({ value: element, label: element }));
  const values = { numerator, denominator };

  return (
    <section className="grid gap-3">
      <h3 className="font-medium">{t('ratioTitle')}</h3>
      <div className="flex flex-wrap gap-4">
        {(['numerator', 'denominator'] as const).map(side => (
          <Field key={side} className="w-40">
            <FieldLabel htmlFor={`${idPrefix}-${side}`}>{t(side)}</FieldLabel>
            <Select
              items={items}
              value={values[side]}
              onValueChange={element => {
                if (!element) return;
                onChange(
                  side === 'numerator' ? element : numerator,
                  side === 'denominator' ? element : denominator
                );
              }}
            >
              <SelectTrigger id={`${idPrefix}-${side}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ))}
      </div>
    </section>
  );
};
