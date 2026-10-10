import type { Sample } from '../types';

// TODO: demo data, replace with Drizzle in Step 6.
//
// EXAMPLE VALUES ONLY, NOT REAL MEASUREMENTS: a made-up sweep of the ALD
// experiment (temperature x cycles x plasma pulse) so plots, filters and
// grouping have something to show. The thickness and B/C ratio are invented to
// follow a smooth, slightly noisy trend; they say nothing about the process.
//
// Columns (demo-parameters.ts): 1 plasma power, 2 plasma pulse, 3 purge,
// 4 temperature, 5 cycles, 10..14 fixed settings, 15 thickness, 16 B/C ratio.
type SweepRow = {
  pulse: number;
  temperature: number;
  cycles: number;
  thickness: number;
  ratio: number;
};

const SWEEP: SweepRow[] = [
  { pulse: 10, temperature: 150, cycles: 600, thickness: 37.4, ratio: 1.62 },
  { pulse: 20, temperature: 150, cycles: 600, thickness: 39.1, ratio: 1.67 },
  { pulse: 10, temperature: 200, cycles: 600, thickness: 46.9, ratio: 1.74 },
  { pulse: 20, temperature: 200, cycles: 600, thickness: 49.6, ratio: 1.79 },
  { pulse: 10, temperature: 250, cycles: 600, thickness: 53.8, ratio: 1.85 },
  { pulse: 20, temperature: 250, cycles: 600, thickness: 57.3, ratio: 1.9 },
  { pulse: 10, temperature: 300, cycles: 600, thickness: 50.6, ratio: 1.97 },
  { pulse: 20, temperature: 300, cycles: 600, thickness: 52.9, ratio: 2.02 },
  { pulse: 10, temperature: 150, cycles: 800, thickness: 48.5, ratio: 1.59 },
  { pulse: 20, temperature: 150, cycles: 800, thickness: 52.4, ratio: 1.64 },
  { pulse: 10, temperature: 200, cycles: 800, thickness: 61.9, ratio: 1.71 },
  { pulse: 20, temperature: 200, cycles: 800, thickness: 66.1, ratio: 1.77 },
  { pulse: 10, temperature: 250, cycles: 800, thickness: 73.2, ratio: 1.82 },
  { pulse: 20, temperature: 250, cycles: 800, thickness: 74.8, ratio: 1.88 },
  { pulse: 10, temperature: 300, cycles: 800, thickness: 66.7, ratio: 1.94 },
  { pulse: 20, temperature: 300, cycles: 800, thickness: 69.9, ratio: 1.99 }
];

/** ALD007 onwards, one sample per sweep row. */
export const DEMO_SWEEP_SAMPLES: Sample[] = SWEEP.map((row, index) => {
  const date = `2026-09-${String(15 + index).padStart(2, '0')}`;

  return {
    id: `demo-sample-sweep-${index + 1}`,
    experimentId: 'demo-experiment-1',
    code: `ALD${String(index + 7).padStart(3, '0')}`,
    performedOn: date,
    values: {
      'demo-parameter-1': 100,
      'demo-parameter-2': row.pulse,
      'demo-parameter-3': 10,
      'demo-parameter-4': row.temperature,
      'demo-parameter-5': row.cycles,
      'demo-parameter-10': 80,
      'demo-parameter-11': 0.5,
      'demo-parameter-12': 2,
      'demo-parameter-13': 30,
      'demo-parameter-14': 'Example: silicon wafer, native oxide',
      'demo-parameter-15': row.thickness,
      'demo-parameter-16': row.ratio
    },
    note: null,
    implementation:
      'Example: one run of the temperature, cycles and pulse sweep.',
    observation: null,
    studyIds: [],
    createdAt: new Date(`${date}T10:00:00Z`)
  };
});
