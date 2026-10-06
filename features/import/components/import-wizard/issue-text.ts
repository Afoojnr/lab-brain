import type { en } from '@/messages/en';

type IssueKey = keyof typeof en.import.issues;

const ISSUE_KEYS = [
  'codeRequired',
  'codeTooLong',
  'codeDuplicate',
  'dateInvalid',
  'implementationTooLong',
  'observationTooLong',
  'valueNotANumber',
  'valueTooLong',
  'noteTooLong',
  'duplicateInFile',
  'updateNotAllowed',
  'studyNameInvalid',
  'codeNotMapped',
  'targetUsedTwice',
  'unknownColumn',
  'nameRequired',
  'nameTooLong',
  'nameDuplicate',
  'unitTooLong',
  'codePrefixInvalid',
  'codePrefixDuplicate',
  'protocolTooLong'
] as const satisfies readonly IssueKey[];

/**
 * Narrows a validation message to a translation key under `import.issues`,
 * falling back to "unknown" so a new message never shows as a raw key.
 *
 * @param message - The message from the validation report.
 */
export const issueKey = (message: string): IssueKey =>
  ISSUE_KEYS.find(key => key === message) ?? 'unknown';
