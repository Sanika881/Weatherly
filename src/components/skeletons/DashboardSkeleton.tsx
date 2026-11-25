export function DashboardSkeleton() {
  return (
    <div aria-label="Loading weather forecast" aria-busy="true" className="space-y-5 animate-pulse">
      {/* Top Hero + 7-Day Glass Forecast skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 rounded-3xl bg-white/60 border border-white/60 p-7 h-[336px] flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-6 w-44 rounded-full bg-slate-900/10" />
              <div className="h-4 w-56 rounded-full bg-slate-900/10" />
            </div>
            <div className="h-10 w-24 rounded-full bg-slate-900/10" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-16 w-36 rounded-2xl bg-slate-900/10" />
              <div className="h-4 w-48 rounded-full bg-slate-900/10" />
            </div>
            <div className="h-24 w-24 rounded-full bg-slate-900/10" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded-2xl bg-slate-900/10" />
            <div className="h-16 rounded-2xl bg-slate-900/10" />
            <div className="h-16 rounded-2xl bg-slate-900/10" />
          </div>
        </div>

        <div className="xl:col-span-5 rounded-3xl bg-white/25 border border-white/30 p-6 h-[336px] flex flex-col justify-between">
          <div className="mx-auto space-y-2 flex flex-col items-center">
            <div className="h-6 w-28 rounded-full bg-white/30" />
            <div className="h-4 w-24 rounded-full bg-white/25" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="h-5 w-full rounded-full bg-white/20" />
            ))}
          </div>
        </div>
      </div>

      {/* Metrics row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div
            key={tile}
            className="h-32 rounded-3xl bg-white/60 border border-white/60 p-5 flex flex-col justify-between"
          >
            <div className="h-4 w-24 rounded-full bg-slate-900/10" />
            <div className="h-8 w-28 rounded-xl bg-slate-900/10" />
            <div className="h-2.5 w-full rounded-full bg-slate-900/10" />
          </div>
        ))}
      </div>

      {/* Hourly strip skeleton */}
      <div className="h-48 rounded-3xl bg-white/60 border border-white/60 p-6 flex flex-col justify-between">
        <div className="h-5 w-32 rounded-full bg-slate-900/10" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((slot) => (
            <div key={slot} className="h-28 rounded-2xl bg-slate-900/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
