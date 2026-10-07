/**
 * The only way the app reads and writes files. Paths are relative, use `/`, and
 * never leave the storage root. A Nextcloud/WebDAV adapter can replace the
 * local one without any other change.
 */
export type StorageAdapter = {
  /** Writes a file, replacing one at the same path. */
  upload: (path: string, bytes: Uint8Array) => Promise<void>;
  /** The file's bytes, or null when there is no file at the path. */
  download: (path: string) => Promise<Uint8Array | null>;
  /** Every file under a folder, as paths relative to the storage root. */
  list: (prefix: string) => Promise<string[]>;
  /** Removes a file; returns whether there was one. */
  delete: (path: string) => Promise<boolean>;
};
