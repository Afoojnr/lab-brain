import type { Dataset } from '../types';

// TODO: demo data, replace with Drizzle in Step 6.
//
// PLACEHOLDER FILES ONLY, NOT MEASUREMENTS: the two files are checked into
// `storage/demo/` to show how attached files appear. One is on the first EDX
// record of ALD003 and one is an image on ALD001's SEM record. They only exist
// when the storage folder is the default `./storage`.
export const DEMO_DATASETS: Dataset[] = [
  {
    id: 'demo-dataset-1',
    characterizationId: 'demo-characterization-1',
    fileName: 'example-image-not-a-measurement.png',
    folder: null,
    relativePath: null,
    storagePath: 'demo/example-image-not-a-measurement.png',
    contentType: 'image/png',
    sizeBytes: 3333,
    uploadedAt: new Date('2026-09-15T10:30:00Z')
  },
  {
    id: 'demo-dataset-2',
    characterizationId: 'demo-characterization-4',
    fileName: 'example-file-not-data.txt',
    folder: null,
    relativePath: null,
    storagePath: 'demo/example-file-not-data.txt',
    contentType: 'text/plain',
    sizeBytes: 105,
    uploadedAt: new Date('2026-09-18T10:30:00Z')
  }
];
