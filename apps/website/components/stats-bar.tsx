"use client";

const stats = [
  { value: "Hybrid", label: "Vector + Keyword Search", sublabel: "RRF fusion" },
  {
    value: "4",
    label: "MCP Tools",
    sublabel: "Save, search, feedback, delete",
  },
  {
    value: "Auto",
    label: "Temporal Classification",
    sublabel: "Permanent to short-term",
  },
  { value: "10+", label: "REST Endpoints", sublabel: "Full API access" },
];

export function StatsBar() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl border border-white/[0.06]" />
          <div className="relative rounded-2xl bg-surface/30 backdrop-blur-sm border border-white/[0.04] overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="px-4 sm:px-6 py-6 sm:py-8 text-center"
                >
                  <div className="text-2xl sm:text-3xl font-display font-bold text-accent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-foreground mb-0.5">
                    {stat.label}
                  </div>
                  <div className="text-xs text-foreground-subtle">
                    {stat.sublabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
