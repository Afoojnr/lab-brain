import { inArray } from 'drizzle-orm';

import { DEMO_CHARACTERIZATIONS } from './demo/demo-characterizations';
import { DEMO_DATASETS } from './demo/demo-datasets';
import { DEMO_DERIVED_COLUMNS } from './demo/demo-derived-columns';
import { DEMO_EXPERIMENTS } from './demo/demo-experiments';
import { DEMO_PARAMETER_DEFINITIONS } from './demo/demo-parameters';
import { DEMO_PROJECTS } from './demo/demo-projects';
import { DEMO_SAMPLES } from './demo/demo-samples';
import { DEMO_STUDIES } from './demo/demo-studies';
import type { Database } from './client';
import {
  characterizations,
  datasets,
  derivedColumns,
  experiments,
  parameterDefinitions,
  projects,
  sampleStudies,
  samples,
  studies
} from './schema';

/** The ids of the example projects, so they can be told apart from the user's own. */
export const DEMO_PROJECT_IDS = DEMO_PROJECTS.map(project => project.id);

/** Rows are inserted in slices: SQLite limits how many values one statement may carry. */
const SLICE = 200;

const insertAll = async <Row>(
  rows: Row[],
  insert: (slice: Row[]) => Promise<unknown>
) => {
  for (let start = 0; start < rows.length; start += SLICE) {
    await insert(rows.slice(start, start + SLICE));
  }
};

/**
 * Adds the example project, experiments, samples and measurements. It does
 * nothing for example projects that are already there, and never touches the
 * user's own records.
 */
export const seedDemo = async (database: Database): Promise<boolean> => {
  const existing = await database
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.id, DEMO_PROJECT_IDS));
  if (existing.length > 0) return false;

  await insertAll(DEMO_PROJECTS, rows =>
    database.insert(projects).values(rows)
  );
  await insertAll(DEMO_EXPERIMENTS, rows =>
    database.insert(experiments).values(rows)
  );
  await insertAll(DEMO_PARAMETER_DEFINITIONS, rows =>
    database.insert(parameterDefinitions).values(rows)
  );
  await insertAll(DEMO_DERIVED_COLUMNS, rows =>
    database.insert(derivedColumns).values(rows)
  );
  await insertAll(DEMO_STUDIES, rows => database.insert(studies).values(rows));
  await insertAll(
    DEMO_SAMPLES.map(({ studyIds: _studyIds, ...row }) => row),
    rows => database.insert(samples).values(rows)
  );
  await insertAll(
    DEMO_SAMPLES.flatMap(sample =>
      sample.studyIds.map((studyId, position) => ({
        sampleId: sample.id,
        studyId,
        position
      }))
    ),
    rows => database.insert(sampleStudies).values(rows)
  );
  await insertAll(DEMO_CHARACTERIZATIONS, rows =>
    database.insert(characterizations).values(rows)
  );
  await insertAll(DEMO_DATASETS, rows =>
    database.insert(datasets).values(rows)
  );

  return true;
};

/**
 * Seeds the examples into a database with no projects at all (a fresh demo or a
 * test database), so a user's own data is never mixed with them unasked.
 */
export const seedDemoIfEmpty = async (database: Database): Promise<void> => {
  const [first] = await database
    .select({ id: projects.id })
    .from(projects)
    .limit(1);
  if (!first) await seedDemo(database);
};

/** Whether the example projects are currently in the database. */
export const hasDemo = async (database: Database): Promise<boolean> => {
  const rows = await database
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.id, DEMO_PROJECT_IDS));

  return rows.length > 0;
};
