/** Optional sign, digits with one `.` or `,` decimal separator, optional exponent. No thousands separators. */
const NUMBER_PATTERN = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/;

/**
 * Reads a number as a person types it: a point or a comma as the decimal
 * separator, an optional sign and exponent, no thousands separators.
 * Anything else, including an empty string, is not a number: the result is
 * `null`, never `NaN` or `0`.
 *
 * @param text - What was typed or read from a file.
 * @returns The number, or null when the text is not one.
 */
export const parseDecimal = (text: string): number | null => {
  const trimmed = text.trim();
  if (!NUMBER_PATTERN.test(trimmed)) return null;

  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};
