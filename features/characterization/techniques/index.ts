import type { AnalysisKind } from '../types';

/** The techniques the app can analyse, in the order the sidebar lists them. */
export const TECHNIQUES = [
  { kind: 'edx' },
  { kind: 'ellipsometry' },
  { kind: 'ftir' }
] as const satisfies readonly { kind: AnalysisKind }[];

/** Whether a URL segment names a technique the app can analyse. */
export const isTechniqueKind = (value: string): value is AnalysisKind =>
  TECHNIQUES.some(technique => technique.kind === value);
