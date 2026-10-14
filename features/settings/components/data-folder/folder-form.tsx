'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import {
  checkDataFolderAction,
  setDataFolderAction
} from '../../actions/data-folder';
import type { FolderCheck } from '../../data-folder/inspect-folder';
import { FolderPicker } from './folder-picker';

type Mode = 'move' | 'use';

const INFO_POINTS = [
  'files',
  'backups',
  'database',
  'restore',
  'oneComputer',
  'privacy'
] as const;

/** The short explanation, folded away until asked for. */
const MoreInfo = () => {
  const t = useTranslations('settings.dataFolder.moreInfo');

  return (
    <Collapsible>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm outline-none focus-visible:underline">
        {t('trigger')}
        <ChevronDownIcon
          aria-hidden
          className="size-4 transition-transform group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="text-muted-foreground mt-2 grid list-disc gap-1.5 pl-5 text-sm">
          {INFO_POINTS.map(point => (
            <li key={point}>{t(point)}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * The data folder: its path (shown in the field), a button to change it, and
 * what to do with the files kept so far. A folder is checked before it is used.
 */
export const FolderForm = ({
  currentFolder,
  isManaged
}: {
  currentFolder: string | null;
  isManaged: boolean;
}) => {
  const t = useTranslations('settings.dataFolder');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [typed, setTyped] = useState(currentFolder ?? '');
  const [mode, setMode] = useState<Mode>('move');
  const [check, setCheck] = useState<FolderCheck | null>(null);
  const [isPending, startTransition] = useTransition();

  const errorText = (code: string, path?: string) =>
    t(`errors.${code}` as 'errors.empty', { path: path ?? '' });

  const verify = (folder: string = typed) =>
    startTransition(async () => {
      try {
        const result = await checkDataFolderAction(folder);
        if (result.isOk) {
          setCheck(result);
          // A folder that already has files is used as it is by default.
          setMode(result.hasFiles ? 'use' : 'move');
          return;
        }
        setCheck(null);
        toast.error(errorText(result.reason));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  const apply = () =>
    startTransition(async () => {
      try {
        const result = await setDataFolderAction(typed, mode);
        if (!result.isOk) {
          toast.error(errorText(result.code, result.path));
          return;
        }
        toast.success(t('applied'));
        // The field then shows the Lab Brain folder in use.
        if (check?.isOk) setTyped(check.folder);
        setCheck(null);
        router.refresh();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  if (isManaged) {
    return <p className="text-muted-foreground text-sm">{t('managed')}</p>;
  }

  const recommended: Mode = check?.isOk && check.hasFiles ? 'use' : 'move';

  return (
    <div className="grid max-w-xl gap-5">
      <Field>
        <FieldLabel htmlFor="data-folder-path">{t('pathLabel')}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="data-folder-path"
            autoComplete="off"
            placeholder={t('pathPlaceholder')}
            value={typed}
            onChange={event => {
              setTyped(event.target.value);
              setCheck(null);
            }}
          />
          <FolderPicker
            startAt={typed.trim() === '' ? currentFolder : typed.trim()}
            hasFolder={currentFolder !== null}
            isDisabled={isPending}
            onSelect={folder => {
              setTyped(folder);
              verify(folder);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={
              isPending || typed.trim() === '' || typed.trim() === currentFolder
            }
            onClick={() => verify()}
          >
            {t('check')}
          </Button>
        </div>
        <FieldDescription>
          {currentFolder ? t('pathHelp') : t('none')}
        </FieldDescription>
      </Field>

      {check?.isOk && (
        <div className="grid gap-4 text-sm">
          <div className="grid gap-1" role="status">
            <p>{t('checkOk')}</p>
            <p>
              {t('willUse')}{' '}
              <span className="font-medium break-all">{check.folder}</span>
              {check.isNew ? ` ${t('willCreate')}` : ''}
            </p>
            {!check.isNew && (
              <p className="text-muted-foreground">
                {t('alreadyThere')}
                {check.hasFiles ? ` ${t('hasFiles')}` : ''}
                {check.hasBackups ? ` ${t('hasBackups')}` : ''}
              </p>
            )}
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">{t('chooseTitle')}</legend>
            <RadioGroup
              value={mode}
              onValueChange={value => setMode(value as Mode)}
            >
              {(['move', 'use'] as const).map(option => (
                <label key={option} className="flex items-start gap-3">
                  <RadioGroupItem value={option} className="mt-0.5" />
                  <span className="grid gap-0.5">
                    <span>
                      {t(option === 'move' ? 'modeMove' : 'modeUse')}
                      {option === recommended && (
                        <span className="text-muted-foreground ml-1">
                          {t('recommended')}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {t(option === 'move' ? 'modeMoveHint' : 'modeUseHint')}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div>
            <Button type="button" disabled={isPending} onClick={apply}>
              {t('apply')}
            </Button>
          </div>
        </div>
      )}

      <MoreInfo />
    </div>
  );
};
