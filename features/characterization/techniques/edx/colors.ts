/** Colours of the elements in the charts, from the lab notebook; any other element is grey. */
const ELEMENT_COLORS: Record<string, string> = {
  Cu: '#dc2626',
  N: '#2563eb',
  O: '#16a34a',
  C: '#111827',
  B: '#ea580c',
  Si: '#9333ea',
  Ni: '#6b7280',
  Au: '#ca8a04',
  Ag: '#0891b2',
  Na: '#c026d3'
};

export const elementColor = (symbol: string): string =>
  ELEMENT_COLORS[symbol] ?? '#6b7280';

/** Colours for spectra lines, one per spot, repeating after eight. */
const SPOT_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#ca8a04',
  '#c026d3'
];

export const spotColor = (index: number): string =>
  SPOT_COLORS[index % SPOT_COLORS.length] ?? '#6b7280';
