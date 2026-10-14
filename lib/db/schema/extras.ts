import {
  index,
  integer,
  real,
  sqliteTable,
  text
} from 'drizzle-orm/sqlite-core';

import { experiments, projects } from './workspace';

export const savedPlots = sqliteTable(
  'saved_plots',
  {
    id: text('id').primaryKey(),
    experimentId: text('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    settings: text('settings', { mode: 'json' }).notNull(),
    filters: text('filters', { mode: 'json' }).notNull(),
    untickedIds: text('unticked_ids', { mode: 'json' }).notNull(),
    style: text('style', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  table => [index('saved_plots_experiment_idx').on(table.experimentId)]
);

export const references = sqliteTable(
  'references',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['pdf', 'link', 'text'] }).notNull(),
    title: text('title').notNull(),
    authors: text('authors'),
    year: integer('year'),
    url: text('url'),
    note: text('note'),
    summary: text('summary'),
    filePath: text('file_path'),
    textPath: text('text_path').notNull(),
    pageCount: integer('page_count'),
    characters: integer('characters').notNull(),
    isTruncated: integer('is_truncated', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  table => [index('references_project_idx').on(table.projectId)]
);

export const ftirBonds = sqliteTable('ftir_bonds', {
  id: text('id').primaryKey(),
  bond: text('bond').notNull(),
  rangeFrom: real('range_from').notNull(),
  rangeTo: real('range_to').notNull(),
  source: text('source').notNull()
});
