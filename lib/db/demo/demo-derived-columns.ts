import type { DerivedColumn } from './types';

// Demo data, seeded into the database.
//
// Growth per cycle on the ALD experiment in Å (thickness in nm x 10 / cycles),
// and a second column built on the first, back in nm. The app never converts
// units itself, so the factor is in the formula.
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
