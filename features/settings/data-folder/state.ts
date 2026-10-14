import { isDemoMode, readLocalSettings } from '@/lib/config/local-settings';
import { getBackupFolder, listBackups } from '@/lib/db/backup';
import type { BackupFile } from '@/lib/db/backup';

export type DataFolderState = {
  /** The public demo keeps nothing, so there is no folder to choose. */
  isDemo: boolean;
  /** The server's owner fixed the storage folder (an environment setting). */
  isManaged: boolean;
  dataFolder: string | null;
  /** Where backups are written (the data folder's, or the server's fixed one), or null. */
  backupFolder: string | null;
  lastBackupAt: string | null;
  lastBackupError: string | null;
  backups: BackupFile[];
};

/** What the Settings page shows about the data folder and its backups. */
export const getDataFolderState = async (): Promise<DataFolderState> => {
  const settings = readLocalSettings();

  return {
    isDemo: isDemoMode(),
    isManaged: Boolean(process.env.LAB_BRAIN_STORAGE_DIR),
    dataFolder: settings.dataFolder,
    backupFolder: getBackupFolder(),
    lastBackupAt: settings.lastBackupAt,
    lastBackupError: settings.lastBackupError,
    backups: await listBackups()
  };
};
