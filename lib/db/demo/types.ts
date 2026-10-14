import type { InferInsertModel } from 'drizzle-orm';

import type {
  characterizations,
  datasets,
  derivedColumns,
  experiments,
  parameterDefinitions,
  projects,
  samples,
  studies
} from '../schema';

// The demo rows are written in the shape of the tables they are seeded into.
export type Project = InferInsertModel<typeof projects>;
export type Experiment = InferInsertModel<typeof experiments>;
export type ParameterDefinition = InferInsertModel<typeof parameterDefinitions>;
export type DerivedColumn = InferInsertModel<typeof derivedColumns>;
export type Study = InferInsertModel<typeof studies>;
export type Characterization = InferInsertModel<typeof characterizations>;
export type Dataset = InferInsertModel<typeof datasets>;

/** A sample row plus the studies it is tagged with (a join table in the database). */
export type Sample = InferInsertModel<typeof samples> & { studyIds: string[] };
