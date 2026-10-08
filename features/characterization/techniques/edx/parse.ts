import Papa from 'papaparse';

const SYMBOL = 'Element symbol';
const ATOMIC = 'Atomic concentration percentage';

export type QuantificationResult =
  | { isOk: true; atomic: Record<string, number> }
  | { isOk: false; reason: 'missingColumns' | 'invalidNumber' | 'empty' };

/**
 * Reads one spot's `quantification.csv`: the element symbol and its atomic
 * concentration (a fraction). Nothing else is used, as in the lab notebook.
 *
 * @param text - The file's contents.
 */
export const parseQuantification = (text: string): QuantificationResult => {
  const { data, meta } = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ''),
    { header: true, skipEmptyLines: 'greedy' }
  );
  if (!meta.fields?.includes(SYMBOL) || !meta.fields.includes(ATOMIC)) {
    return { isOk: false, reason: 'missingColumns' };
  }
  if (data.length === 0) return { isOk: false, reason: 'empty' };

  const atomic: Record<string, number> = {};
  for (const row of data) {
    const symbol = row[SYMBOL]?.trim();
    const value = Number(row[ATOMIC]);
    if (!symbol || row[ATOMIC]?.trim() === '' || !Number.isFinite(value)) {
      return { isOk: false, reason: 'invalidNumber' };
    }
    atomic[symbol] = value;
  }

  return { isOk: true, atomic };
};

/**
 * Reads an EMSA spectrum (`spectrum.emsa`): counts per channel, with the
 * energy of each channel from the header (`OFFSET + channel × XPERCHAN`, in eV).
 *
 * @param text - The file's contents.
 * @returns The spectrum in keV, or null when the header or data is missing.
 */
export const parseEmsa = (
  text: string
): { energyKev: number[]; counts: number[] } | null => {
  const header = new Map<string, string>();
  const counts: number[] = [];
  let isData = false;

  for (const line of text.split(/\r?\n/)) {
    if (isData) {
      const value = Number(line.split(',')[0]);
      if (line.trim() !== '' && Number.isFinite(value)) counts.push(value);
      continue;
    }
    const match = /^#\s*([A-Z]+)[^:]*:\s*(.*)$/.exec(line);
    if (match?.[1] === 'SPECTRUM') isData = true;
    else if (match?.[1]) header.set(match[1], match[2] ?? '');
  }

  const perChannel = Number.parseFloat(header.get('XPERCHAN') ?? '');
  const offset = Number.parseFloat(header.get('OFFSET') ?? '');
  if (
    counts.length === 0 ||
    !Number.isFinite(perChannel) ||
    !Number.isFinite(offset)
  ) {
    return null;
  }

  return {
    energyKev: counts.map(
      (_count, channel) => (offset + channel * perChannel) / 1000
    ),
    counts
  };
};
