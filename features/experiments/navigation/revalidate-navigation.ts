import { revalidatePath } from 'next/cache';

/** Refreshes the sidebar. */
export const revalidateNavigation = () => revalidatePath('/', 'layout');
