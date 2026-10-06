import type { en } from '../en';
import characterizations from './characterizations.json';
import common from './common.json';
import dashboard from './dashboard.json';
import errors from './errors.json';
import experiments from './experiments.json';
import importer from './import.json';
import navigation from './navigation.json';
import parameters from './parameters.json';
import projects from './projects.json';
import samples from './samples.json';
import settings from './settings.json';
import studies from './studies.json';

/** Typed against English, so a key missing here fails `ts-check`. */
export const fr: typeof en = {
  characterizations,
  common,
  dashboard,
  errors,
  experiments,
  import: importer,
  navigation,
  parameters,
  projects,
  samples,
  settings,
  studies
};
