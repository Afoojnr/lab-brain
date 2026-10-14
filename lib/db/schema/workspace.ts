import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text
} from 'drizzle-orm/sqlite-core';

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' }).notNull();

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  background: text('background'),
  createdAt: createdAt()
});

export const experiments = sqliteTable(
  'experiments',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    codePrefix: text('code_prefix').notNull(),
    protocol: text('protocol'),
    createdAt: createdAt()
  },
  table => [index('experiments_project_idx').on(table.projectId)]
);

/** A raw stored value: a number for number columns, text otherwise. */
type StoredValue = number | string;

export const parameterDefinitions = sqliteTable(
  'parameter_definitions',
  {
    id: text('id').primaryKey(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unit: text('unit'),
    kind: text('kind', { enum: ['number', 'text'] }).notNull(),
    role: text('role', { enum: ['parameter', 'result'] }).notNull(),
    defaultValue: text('default_value', { mode: 'json' }).$type<StoredValue>(),
    position: integer('position').notNull()
  },
  table => [index('parameters_experiment_idx').on(table.experimentId)]
);

export const derivedColumns = sqliteTable(
  'derived_columns',
  {
    id: text('id').primaryKey(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unit: text('unit'),
    formula: text('formula').notNull(),
    position: integer('position').notNull()
  },
  table => [index('derived_experiment_idx').on(table.experimentId)]
);

export const studies = sqliteTable(
  'studies',
  {
    id: text('id').primaryKey(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: createdAt()
  },
  table => [index('studies_experiment_idx').on(table.experimentId)]
);

export const samples = sqliteTable(
  'samples',
  {
    id: text('id').primaryKey(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    performedOn: text('performed_on'),
    /** Values by column id; a missing key means "not recorded", never zero. */
    values: text('values', { mode: 'json' })
      .$type<Record<string, StoredValue>>()
      .notNull(),
    implementation: text('implementation'),
    observation: text('observation'),
    note: text('note'),
    createdAt: createdAt()
  },
  table => [index('samples_experiment_idx').on(table.experimentId)]
);

export const sampleStudies = sqliteTable(
  'sample_studies',
  {
    sampleId: text('sample_id')
      .notNull()
      .references(() => samples.id, { onDelete: 'cascade' }),
    studyId: text('study_id')
      .notNull()
      .references(() => studies.id, { onDelete: 'cascade' }),
    /** Keeps a sample's studies in the order they were assigned. */
    position: real('position').notNull()
  },
  table => [primaryKey({ columns: [table.sampleId, table.studyId] })]
);
