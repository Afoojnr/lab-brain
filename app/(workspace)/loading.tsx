import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors PageHeader plus a content block, so the layout does not jump when data arrives. */
export default function WorkspaceLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
