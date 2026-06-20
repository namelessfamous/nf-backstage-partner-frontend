export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-8 py-16 text-center">
      {icon && (
        <div className="mb-4 text-[var(--brand-muted)]/50">{icon}</div>
      )}
      <p className="font-medium text-[var(--brand-foreground)]">{title}</p>
      {message && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--brand-muted)]">
          {message}
        </p>
      )}
    </div>
  );
}
