export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-surface-elevated" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-elevated" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-surface-elevated" />
    </div>
  );
}
