"use client";

const stats = [
  {
    value: "Hybrid",
    label: "Vector + Keyword Search",
    sublabel: "RRF fusion",
  },
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
  {
    value: "10+",
    label: "REST Endpoints",
    sublabel: "Full API access",
  },
];

export function StatsBar() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative">
          {/* Shiny border corner glows — matches how-it-works + CTA pattern */}
          <div
            aria-hidden
            className="absolute -top-px -left-px w-28 h-20 rounded-2xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 35%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-px -right-px w-28 h-20 rounded-2xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at bottom right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 35%, transparent 70%)",
            }}
          />

          {/* Soft coral ambient behind the panel */}
          <div
            aria-hidden
            className="absolute -inset-6 rounded-3xl blur-3xl opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(232,97,60,0.15) 0%, transparent 65%)",
            }}
          />

          {/* Main card */}
          <div className="relative rounded-2xl bg-surface/40 backdrop-blur-md border border-white/[0.08] shadow-2xl shadow-black/30 overflow-hidden">
            {/* Inner top-left gradient sheen */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent rounded-2xl pointer-events-none"
            />
            {/* Top specular highlight */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
              }}
            />

            <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.06]">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="group relative px-5 sm:px-8 py-8 sm:py-10 text-center"
                >
                  {/* Subtle hover backdrop */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, rgba(232,97,60,0.06) 0%, transparent 70%)",
                    }}
                  />

                  {/* Value with soft coral halo */}
                  <div className="relative inline-block mb-3">
                    <div
                      aria-hidden
                      className="absolute inset-0 blur-2xl opacity-50 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse at center, rgba(232,97,60,0.35) 0%, transparent 70%)",
                      }}
                    />
                    <div className="relative text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-accent tracking-tight leading-none">
                      {stat.value}
                    </div>
                  </div>

                  <div className="relative text-sm sm:text-[15px] font-semibold text-foreground tracking-tight mb-1.5">
                    {stat.label}
                  </div>

                  <div className="relative text-[11px] sm:text-xs font-mono text-foreground-subtle/80 uppercase tracking-[0.12em]">
                    {stat.sublabel}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom inner shadow edge */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
