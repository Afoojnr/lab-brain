/**
 * A top-level container for experiment trees. Shape mirrors the planned
 * database table so swapping demo data for Drizzle keeps this type.
 */
export type Project = {
  id: string;
  name: string;
  codePrefix: string;
  /** Default protocol or method; null when not set. */
  protocol: string | null;
  createdAt: Date;
};
