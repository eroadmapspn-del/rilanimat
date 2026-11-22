export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
