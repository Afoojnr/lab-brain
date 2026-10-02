import type { en } from '../en';
import common from './common.json';
import dashboard from './dashboard.json';
import errors from './errors.json';
import navigation from './navigation.json';
import projects from './projects.json';
import settings from './settings.json';

/** Typed against English, so a key missing here fails `ts-check`. */
export const fr: typeof en = {
  common,
  dashboard,
  errors,
  navigation,
  projects,
  settings
};
