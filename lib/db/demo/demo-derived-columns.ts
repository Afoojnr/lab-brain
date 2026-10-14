import type { DerivedColumn } from './types';

// Demo data, seeded into the database.
//
// An example calculated column on the ALD experiment: the growth per cycle in
// Å, from the thickness (demo-parameter-15, nm) and cycles (demo-parameter-5).
// The factor 10 turns nm into Å; the app never converts units itself. The second
// column is built on the first (a calculated column can use another one): GPC
// in nm per cycle, so the factor 10 turns Å back into nm.
export const DEMO_DERIVED_COLUMNS: DerivedColumn[] = [
  {
    id: 'demo-derived-1',
    experimentId: 'demo-experiment-1',
    name: 'GPC',
    unit: 'Å/cycle',
    formula: '[#demo-parameter-15] * 10 / [#demo-parameter-5]',
    position: 0
  },
  {
    id: 'demo-derived-2',
    experimentId: 'demo-experiment-1',
    name: 'GPC nm',
    unit: 'nm/cycle',
    formula: '[#demo-derived-1] / 10',
    position: 1
  }
];
