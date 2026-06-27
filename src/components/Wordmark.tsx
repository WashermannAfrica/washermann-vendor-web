/** Simple Washermann wordmark — avoids an image asset dependency. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className ?? 'text-xl font-bold tracking-tight text-forest'}>
      Washermann
      <span className="text-primary">.</span>
    </span>
  );
}
