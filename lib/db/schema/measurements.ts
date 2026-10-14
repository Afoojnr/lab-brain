import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text
} from 'drizzle-orm/sqlite-core';

import { samples } from './workspace';

export const characterizations = sqliteTable(
  'characterizations',
  {
    id: text('id').primaryKey(),
    sampleId: text('sample_id')
      .notNull()
      .references(() => samples.id, { onDelete: 'cascade' }),
    technique: text('technique').notNull(),
    measuredOn: text('measured_on'),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  table => [index('characterizations_sample_idx').on(table.sampleId)]
);

/** The bytes live in storage; this row keeps where. */
export const datasets = sqliteTable(
  'datasets',
  {
    id: text('id').primaryKey(),
    characterizationId: text('characterization_id')
      .notNull()
      .references(() => characterizations.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    folder: text('folder'),
    relativePath: text('relative_path'),
    storagePath: text('storage_path').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' }).notNull()
  },
  table => [index('datasets_characterization_idx').on(table.characterizationId)]
);

export const analyses = sqliteTable(
  'analyses',
  {
    id: text('id').notNull(),
    characterizationId: text('characterization_id')
      .notNull()
      .references(() => characterizations.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    settings: text('settings', { mode: 'json' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  table => [primaryKey({ columns: [table.characterizationId, table.kind] })]
);
