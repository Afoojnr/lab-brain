import analysis from './analysis.json';
import characterizations from './characterizations.json';
import common from './common.json';
import home from './home.json';
import derived from './derived.json';
import errors from './errors.json';
import experiments from './experiments.json';
import importer from './import.json';
import navigation from './navigation.json';
import parameters from './parameters.json';
import projects from './projects.json';
import samples from './samples.json';
import settings from './settings.json';
import studies from './studies.json';

/** Shared namespaces: common, navigation, errors. Everything else belongs to one feature. */
export const en = {
  analysis,
  characterizations,
  common,
  home,
  derived,
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
