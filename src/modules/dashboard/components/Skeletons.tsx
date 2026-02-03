export function SkeletonCard() {
  return (
    <div className="bg-gradient-to-br from-card to-secondary/20 rounded-xl border border-primary/10 p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 bg-muted/40 rounded-lg" />
          <div className="h-8 w-32 bg-muted/30 rounded-lg" />
        </div>
        <div className="h-10 w-10 bg-muted/40 rounded-lg" />
      </div>
      <div className="h-3 w-20 bg-muted/30 rounded-lg" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-6 border-b border-border space-y-3 animate-skeleton">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
      <div className="space-y-0">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-skeleton"
          >
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-28 bg-muted rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-br from-card to-secondary/20 rounded-xl border border-primary/10 p-6 overflow-hidden"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
          <div className="relative space-y-3">
            <div className="h-4 w-28 bg-muted/40 rounded-lg" />
            <div className="h-8 w-24 bg-muted/30 rounded-lg" />
            <div className="flex gap-2">
              <div className="h-3 w-16 bg-muted/30 rounded-lg" />
              <div className="h-3 w-20 bg-muted/30 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-gradient-to-br from-card to-secondary/20 rounded-xl border border-primary/10 p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
      <div className="relative space-y-4">
        <div className="h-6 w-40 bg-muted/40 rounded-lg" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/30 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6 animate-skeleton">
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
    </div>
  );
}
