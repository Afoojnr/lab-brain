import { useTranslations } from 'next-intl';

import { isSampleFormError } from '../../schemas';

/** Translates the error keys the sample schema reports; unknown messages show nothing. */
export const useErrorText = () => {
  const t = useTranslations('samples');

  return (message: string | undefined) =>
    isSampleFormError(message) ? t(`form.errors.${message}`) : undefined;
};
