import type { ParameterDefinition, ParameterValues } from './types';

/** A parsed formula: numbers, columns, `+ - * /`, parentheses and a leading minus. */
export type FormulaNode =
  | { type: 'number'; value: number }
  | { type: 'column'; columnId: string }
  | { type: 'negate'; operand: FormulaNode }
  | {
      type: 'binary';
      operator: '+' | '-' | '*' | '/';
      left: FormulaNode;
      right: FormulaNode;
    };

/** Keys under `derived.form.errors` for a formula that cannot be used. */
export type FormulaError =
  'empty' | 'syntax' | 'unknownColumn' | 'notANumberColumn';

export type ParsedFormula =
  | {
      isOk: true;
      ast: FormulaNode;
      /** The formula with each column written by id (`[#id]`), so renaming a column keeps it working. */
      stored: string;
      /** The ids of the columns it uses. */
      columnIds: string[];
    }
  | {
      isOk: false;
      error: FormulaError;
      /** Where in the text it went wrong (a character index). */
      position: number;
      /** For an unknown or non-number column, the name that was written. */
      name?: string;
    };

type Token =
  | { kind: 'number'; text: string; start: number; end: number }
  | { kind: 'reference'; text: string; start: number; end: number }
  | {
      kind: 'operator';
      text: '+' | '-' | '*' | '/';
      start: number;
      end: number;
    }
  | { kind: 'open' | 'close'; text: string; start: number; end: number };

class FormulaFailure extends Error {
  constructor(
    readonly error: FormulaError,
    readonly position: number,
    readonly detail?: string
  ) {
    super(error);
  }
}

const NUMBER = /\d+(?:[.,]\d+)?|[.,]\d+/y;

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text.charAt(index);
    if (/\s/.test(char)) {
      index += 1;
    } else if (char === '[') {
      const end = text.indexOf(']', index);
      if (end === -1) throw new FormulaFailure('syntax', index);
      tokens.push({
        kind: 'reference',
        text: text.slice(index + 1, end).trim(),
        start: index,
        end: end + 1
      });
      index = end + 1;
    } else if ('+-*/'.includes(char)) {
      tokens.push({
        kind: 'operator',
        text: char as '+' | '-' | '*' | '/',
        start: index,
        end: index + 1
      });
      index += 1;
    } else if (char === '(' || char === ')') {
      tokens.push({
        kind: char === '(' ? 'open' : 'close',
        text: char,
        start: index,
        end: index + 1
      });
      index += 1;
    } else {
      NUMBER.lastIndex = index;
      const match = NUMBER.exec(text);
      if (!match) throw new FormulaFailure('syntax', index);
      tokens.push({
        kind: 'number',
        text: match[0],
        start: index,
        end: index + match[0].length
      });
      index += match[0].length;
    }
  }

  return tokens;
};

const findColumn = (
  reference: string,
  columns: Pick<ParameterDefinition, 'id' | 'name' | 'kind'>[]
) =>
  reference.startsWith('#')
    ? columns.find(column => column.id === reference.slice(1))
    : columns.find(
        column => column.name.trim().toLowerCase() === reference.toLowerCase()
      );

/**
 * Reads a formula such as `[Thickness] * 10 / [Cycles]`. Columns are written
 * `[Name]` (any case) and must be number columns of the experiment. Nothing is
 * evaluated as code: only numbers, columns, `+ - * /` and parentheses exist.
 * A decimal comma is read as a point.
 *
 * @param text - What the user typed.
 * @param columns - The experiment's columns.
 */
export const parseFormula = (
  text: string,
  columns: Pick<ParameterDefinition, 'id' | 'name' | 'kind'>[]
): ParsedFormula => {
  try {
    if (text.trim() === '') throw new FormulaFailure('empty', 0);
    const tokens = tokenize(text);
    const columnIds: string[] = [];
    const idOf = new Map<Token, string>();
    let cursor = 0;

    const peek = () => tokens[cursor];
    const fail = (): never => {
      throw new FormulaFailure('syntax', peek()?.start ?? text.length);
    };

    const parseFactor = (): FormulaNode => {
      const token = peek();
      if (!token) return fail();
      cursor += 1;

      if (token.kind === 'number') {
        return { type: 'number', value: Number(token.text.replace(',', '.')) };
      }
      if (token.kind === 'reference') {
        const column = findColumn(token.text, columns);
        if (!column) {
          throw new FormulaFailure('unknownColumn', token.start, token.text);
        }
        if (column.kind !== 'number') {
          throw new FormulaFailure(
            'notANumberColumn',
            token.start,
            column.name
          );
        }
        idOf.set(token, column.id);
        if (!columnIds.includes(column.id)) columnIds.push(column.id);
        return { type: 'column', columnId: column.id };
      }
      if (
        token.kind === 'operator' &&
        (token.text === '-' || token.text === '+')
      ) {
        const operand = parseFactor();
        return token.text === '-' ? { type: 'negate', operand } : operand;
      }
      if (token.kind === 'open') {
        const inner = parseExpression();
        if (peek()?.kind !== 'close') return fail();
        cursor += 1;
        return inner;
      }
      cursor -= 1;
      return fail();
    };

    const parseBinary = (
      operators: string[],
      next: () => FormulaNode
    ): FormulaNode => {
      let left = next();
      for (;;) {
        const token = peek();
        if (token?.kind !== 'operator' || !operators.includes(token.text)) {
          return left;
        }
        cursor += 1;
        left = { type: 'binary', operator: token.text, left, right: next() };
      }
    };

    const parseTerm = () => parseBinary(['*', '/'], parseFactor);
    const parseExpression = (): FormulaNode =>
      parseBinary(['+', '-'], parseTerm);

    const ast = parseExpression();
    if (cursor < tokens.length) fail();

    // The same text with each column written by id.
    let stored = text;
    for (const token of [...idOf.keys()].reverse()) {
      stored = `${stored.slice(0, token.start)}[#${idOf.get(token)}]${stored.slice(token.end)}`;
    }

    return { isOk: true, ast, stored, columnIds };
  } catch (error) {
    if (error instanceof FormulaFailure) {
      return {
        isOk: false,
        error: error.error,
        position: error.position,
        name: error.detail
      };
    }
    throw error;
  }
};

/**
 * The value of a formula for one sample, or null when it cannot be calculated:
 * a column it uses is not recorded (or is text), it divides by 0, or the result
 * is not a finite number. Never 0 or NaN.
 *
 * @param ast - From {@link parseFormula}.
 * @param values - The sample's values by column id.
 */
export const evaluateFormula = (
  ast: FormulaNode,
  values: ParameterValues
): number | null => {
  switch (ast.type) {
    case 'number':
      return ast.value;
    case 'column': {
      const value = values[ast.columnId];
      return typeof value === 'number' ? value : null;
    }
    case 'negate': {
      const operand = evaluateFormula(ast.operand, values);
      return operand === null ? null : -operand;
    }
    case 'binary': {
      const left = evaluateFormula(ast.left, values);
      const right = evaluateFormula(ast.right, values);
      if (left === null || right === null) return null;

      const result =
        ast.operator === '+'
          ? left + right
          : ast.operator === '-'
            ? left - right
            : ast.operator === '*'
              ? left * right
              : right === 0
                ? null
                : left / right;

      return result !== null && Number.isFinite(result) ? result : null;
    }
  }
};

/**
 * A stored formula shown with the columns' current names (`[Thickness]`).
 *
 * @param stored - The formula with `[#id]` references.
 * @param columns - The experiment's columns.
 */
export const displayFormula = (
  stored: string,
  columns: Pick<ParameterDefinition, 'id' | 'name'>[]
): string =>
  stored.replace(/\[#([^\]]+)\]/g, (_match, id: string) => {
    const column = columns.find(candidate => candidate.id === id);
    return column ? `[${column.name}]` : `[#${id}]`;
  });

/**
 * The value of a stored formula for a sample, parsing it first. Used where
 * many samples share one formula, so parse once with {@link parseFormula}
 * and call {@link evaluateFormula} instead.
 */
export const evaluateStored = (
  stored: string,
  columns: Pick<ParameterDefinition, 'id' | 'name' | 'kind'>[],
  values: ParameterValues
): number | null => {
  const parsed = parseFormula(stored, columns);
  return parsed.isOk ? evaluateFormula(parsed.ast, values) : null;
};
