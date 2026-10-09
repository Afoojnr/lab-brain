import { revalidatePath } from 'next/cache';

/**
 * Refreshes the sidebar. It lives in the layout, which is not re-rendered when
 * a page's own path is revalidated, so an action that adds, renames or removes
 * something the sidebar lists (a project) calls this too.
 */
export const revalidateNavigation = () => revalidatePath('/', 'layout');
