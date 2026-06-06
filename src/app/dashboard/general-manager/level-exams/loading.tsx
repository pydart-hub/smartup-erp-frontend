function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export default function GeneralManagerLevelExamsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-4 w-[32rem] max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-44" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-border-light bg-white p-6 space-y-4">
            <SkeletonBlock className="h-7 w-44" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <div className="space-y-3 pt-2">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
          </div>
          <div className="rounded-[24px] border border-border-light bg-white p-6 space-y-4">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-4 w-56" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </div>
        </div>

        <div className="rounded-[24px] border border-border-light bg-white p-6 space-y-4">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-4 w-[28rem] max-w-full" />
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-10 w-16" />
            <SkeletonBlock className="h-10 w-16" />
            <SkeletonBlock className="h-10 w-16" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-24" />
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-24" />
          </div>
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-36 w-full" />
          <SkeletonBlock className="h-36 w-full" />
        </div>
      </div>
    </div>
  );
}
