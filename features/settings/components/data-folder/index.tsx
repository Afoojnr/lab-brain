import { getTranslations } from 'next-intl/server';

import { getDataFolderState } from '../../data-folder/state';
import { BackupsList } from './backups-list';
import { FolderForm } from './folder-form';

/** Where the files and backups are kept, and the backups themselves. */
export const DataFolderSection = async () => {
  const [t, state] = await Promise.all([
    getTranslations('settings.dataFolder'),
    getDataFolderState()
  ]);
  if (state.isDemo) return null;

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="text-sm font-medium">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 mb-6 max-w-xl text-sm">
        {t('description')}
      </p>
      <FolderForm
        currentFolder={state.dataFolder}
        isManaged={state.isManaged}
      />
      <BackupsList
        hasFolder={state.backupFolder !== null}
        lastBackupAt={state.lastBackupAt}
        lastBackupError={state.lastBackupError}
        backups={state.backups.map(backup => ({
          ...backup,
          createdAt: backup.createdAt.toISOString()
        }))}
      />
    </section>
  );
};
