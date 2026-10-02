import common from './common.json';
import dashboard from './dashboard.json';
import errors from './errors.json';
import navigation from './navigation.json';
import projects from './projects.json';
import settings from './settings.json';

/** Shared namespaces: common, navigation, errors. Everything else belongs to one feature. */
export const en = { common, dashboard, errors, navigation, projects, settings };
