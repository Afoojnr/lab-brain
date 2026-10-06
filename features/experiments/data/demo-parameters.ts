import type { ParameterDefinition } from '../types';

// TODO: demo data, replace with Drizzle in Step 6. The column names are the
// owner's own examples; the app itself never assumes a technique.
//
// Units are left empty for the Paschen law and temperature calibration experiment
// because the owner has not given them. The PVD experiment has no columns yet, to
// show the empty state.
//
// EXAMPLE VALUES ONLY, NOT REAL SETTINGS: the ALD defaults below are
// placeholders matching the demo samples in demo-samples.ts, to show prefilled
// forms. The five extra ALD columns (Carrier flow to Substrate) and their sample
// values exist only to test a wide table; they have no defaults. Thickness and
// B/C ratio are the two ALD result columns: measured afterwards, never prefilled.
export const DEMO_PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  {
    id: 'demo-parameter-1',
    experimentId: 'demo-experiment-1',
    name: 'Plasma power',
    unit: 'W',
    kind: 'number',
    role: 'parameter',
    defaultValue: 100,
    position: 0
  },
  {
    id: 'demo-parameter-2',
    experimentId: 'demo-experiment-1',
    name: 'Plasma pulse',
    unit: 's',
    kind: 'number',
    role: 'parameter',
    defaultValue: 10,
    position: 1
  },
  {
    id: 'demo-parameter-3',
    experimentId: 'demo-experiment-1',
    name: 'Purge',
    unit: 's',
    kind: 'number',
    role: 'parameter',
    defaultValue: 10,
    position: 2
  },
  {
    id: 'demo-parameter-4',
    experimentId: 'demo-experiment-1',
    name: 'Temperature',
    unit: '°C',
    kind: 'number',
    role: 'parameter',
    defaultValue: 200,
    position: 3
  },
  {
    id: 'demo-parameter-5',
    experimentId: 'demo-experiment-1',
    name: 'Cycles',
    unit: null,
    kind: 'number',
    role: 'parameter',
    defaultValue: 50,
    position: 4
  },
  {
    id: 'demo-parameter-6',
    experimentId: 'demo-experiment-2',
    name: 'Pressure',
    unit: null,
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 0
  },
  {
    id: 'demo-parameter-7',
    experimentId: 'demo-experiment-2',
    name: 'Flow rate',
    unit: null,
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 1
  },
  {
    id: 'demo-parameter-8',
    experimentId: 'demo-experiment-3',
    name: 'Time',
    unit: null,
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 0
  },
  {
    id: 'demo-parameter-9',
    experimentId: 'demo-experiment-3',
    name: 'Temperature',
    unit: null,
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 1
  },
  {
    id: 'demo-parameter-10',
    experimentId: 'demo-experiment-1',
    name: 'Carrier flow',
    unit: 'sccm',
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 5
  },
  {
    id: 'demo-parameter-11',
    experimentId: 'demo-experiment-1',
    name: 'Chamber pressure',
    unit: 'mbar',
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 6
  },
  {
    id: 'demo-parameter-12',
    experimentId: 'demo-experiment-1',
    name: 'TEB pulse',
    unit: 's',
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 7
  },
  {
    id: 'demo-parameter-13',
    experimentId: 'demo-experiment-1',
    name: 'Pump down',
    unit: 'min',
    kind: 'number',
    role: 'parameter',
    defaultValue: null,
    position: 8
  },
  {
    id: 'demo-parameter-14',
    experimentId: 'demo-experiment-1',
    name: 'Substrate',
    unit: null,
    kind: 'text',
    role: 'parameter',
    defaultValue: null,
    position: 9
  },
  {
    id: 'demo-parameter-15',
    experimentId: 'demo-experiment-1',
    name: 'Thickness',
    unit: 'nm',
    kind: 'number',
    role: 'result',
    defaultValue: null,
    position: 10
  },
  {
    id: 'demo-parameter-16',
    experimentId: 'demo-experiment-1',
    name: 'B/C ratio',
    unit: null,
    kind: 'number',
    role: 'result',
    defaultValue: null,
    position: 11
  }
];
