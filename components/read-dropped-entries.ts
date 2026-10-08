/** A file with the path it had inside the folder it came from (just its name when picked alone). */
export type PickedFile = { file: File; path: string };

/** Names the operating system adds (`.DS_Store`, `._x`) are never wanted. */
export const isHiddenName = (name: string): boolean => name.startsWith('.');

type Entry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (
    success: (file: File) => void,
    failure: (error: unknown) => void
  ) => void;
  createReader?: () => {
    readEntries: (
      success: (entries: Entry[]) => void,
      failure: (error: unknown) => void
    ) => void;
  };
};

const readAll = async (entry: Entry): Promise<Entry[]> => {
  const reader = entry.createReader?.();
  if (!reader) return [];

  const all: Entry[] = [];
  // A directory reader hands back its entries in batches until it returns none.
  for (;;) {
    const batch = await new Promise<Entry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (batch.length === 0) return all;
    all.push(...batch);
  }
};

const walk = async (entry: Entry, prefix: string): Promise<PickedFile[]> => {
  if (isHiddenName(entry.name)) return [];

  const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) =>
      entry.file?.(resolve, reject)
    );
    return [{ file, path }];
  }
  if (!entry.isDirectory) return [];

  const children = await readAll(entry);
  const nested = await Promise.all(children.map(child => walk(child, path)));

  return nested.flat();
};

/**
 * Every file in what was dropped, folders included, with each file's path
 * inside its folder. Hidden files are left out.
 *
 * @param entries - The dropped items as file system entries.
 */
export const readDroppedEntries = async (
  entries: Entry[]
): Promise<PickedFile[]> =>
  (await Promise.all(entries.map(entry => walk(entry, '')))).flat();
