import type { ParameterDefinition } from '../types';

/** A parameter's name with its unit in muted text, e.g. "Plasma power (W)". */
export const ParameterLabel = ({
  definition
}: {
  definition: Pick<ParameterDefinition, 'name' | 'unit'>;
}) => (
  <>
    {definition.name}
    {definition.unit && (
      <span className="text-muted-foreground font-normal">
        {' '}
        ({definition.unit})
      </span>
    )}
  </>
);
