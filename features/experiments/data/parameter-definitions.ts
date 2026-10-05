import type { ParameterDefinition, ParameterInput } from '../types';
import { DEMO_PARAMETER_DEFINITIONS } from './demo-parameters';

// TODO: Step 6 replaces this in-memory list with Drizzle queries. It lives in
// the server process, so it resets when the dev server restarts.
const definitions: ParameterDefinition[] = [...DEMO_PARAMETER_DEFINITIONS];

/**
 * An experiment's parameters (its columns), in display order.
 *
 * @param experimentId - Owning experiment's id.
 * @returns A copy of the list, so callers cannot mutate storage.
 */
export const listParameterDefinitions = async (
  experimentId: string
): Promise<ParameterDefinition[]> =>
  definitions
    .filter(definition => definition.experimentId === experimentId)
    .sort((a, b) => a.position - b.position);

/**
 * Adds a parameter at the end of an experiment's columns. Input must already be
 * validated by `buildParameterFormSchema`. Samples recorded before it simply
 * have no value for it.
 *
 * @param experimentId - Owning experiment's id.
 * @param input - Validated name, unit, kind and default.
 * @returns The stored parameter.
 */
export const createParameterDefinition = async (
  experimentId: string,
  input: ParameterInput
): Promise<ParameterDefinition> => {
  const existing = await listParameterDefinitions(experimentId);
  const definition: ParameterDefinition = {
    id: crypto.randomUUID(),
    experimentId,
    name: input.name,
    unit: input.unit === '' ? null : input.unit,
    kind: input.kind,
    defaultValue: input.defaultValue,
    position:
      existing.length === 0
        ? 0
        : Math.max(...existing.map(item => item.position)) + 1
  };

  definitions.push(definition);
  return definition;
};

/**
 * Changes a parameter's name, unit, kind or default value.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The parameter to change.
 * @param input - Validated parameter.
 * @returns The updated parameter, or undefined when the experiment has none with that id.
 */
export const updateParameterDefinition = async (
  experimentId: string,
  id: string,
  input: ParameterInput
): Promise<ParameterDefinition | undefined> => {
  const index = definitions.findIndex(
    definition =>
      definition.id === id && definition.experimentId === experimentId
  );
  const existing = definitions[index];
  if (!existing) return undefined;

  const updated: ParameterDefinition = {
    ...existing,
    name: input.name,
    unit: input.unit === '' ? null : input.unit,
    kind: input.kind,
    defaultValue: input.defaultValue
  };
  definitions[index] = updated;
  return updated;
};

/**
 * Removes a parameter. Callers must first make sure no sample uses it.
 *
 * @param experimentId - Owning experiment's id.
 * @param id - The parameter to remove.
 * @returns Whether a parameter was removed.
 */
export const deleteParameterDefinition = async (
  experimentId: string,
  id: string
): Promise<boolean> => {
  const index = definitions.findIndex(
    definition =>
      definition.id === id && definition.experimentId === experimentId
  );
  if (index === -1) return false;

  definitions.splice(index, 1);
  return true;
};
