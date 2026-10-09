import type { DerivedColumn } from '../types';

// TODO: demo data, replace with Drizzle in Step 6.
//
// An example calculated column on the ALD experiment: the growth per cycle in
// Å, from the thickness (demo-parameter-15, nm) and cycles (demo-parameter-5).
// The factor 10 turns nm into Å; the app never converts units itself.
export const DEMO_DERIVED_COLUMNS: DerivedColumn[] = [
  {
    id: 'demo-derived-1',
    experimentId: 'demo-experiment-1',
    name: 'GPC',
    unit: 'Å/cycle',
    formula: '[#demo-parameter-15] * 10 / [#demo-parameter-5]',
    position: 0
  }
];
