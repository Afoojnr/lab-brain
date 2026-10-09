import type { AnalysisKind } from '../types';

/**
 * The techniques the app can analyse, in the order the sidebar lists them. A
 * technique is listed only once its analysis exists (FTIR, UV-Vis, ... join
 * when theirs is added), and each opens its workspace.
 */
export const TECHNIQUES = [
  { kind: 'edx' },
  { kind: 'ellipsometry' }
] as const satisfies readonly { kind: AnalysisKind }[];

/**
 * Whether a URL segment names a technique the app can analyse.
 *
 * @param value - The segment, e.g. `edx`.
 */
export const isTechniqueKind = (value: string): value is AnalysisKind =>
  TECHNIQUES.some(technique => technique.kind === value);
