"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const data = [
  { type: "Permanent", count: 847, fill: "#3a3a3a" },
  { type: "Long-term", count: 523, fill: "#4a4a4a" },
  { type: "Medium-term", count: 312, fill: "#5a5a5a" },
  { type: "Short-term", count: 189, fill: "#e8613c" },
];

const HIGHLIGHTED_INDEX = data.length - 1;
const HIGHLIGHTED = data[HIGHLIGHTED_INDEX];

export function ClassificationChart() {
  // Static reference label position — placed above the rightmost bar.
  // We rely on the bar's category sitting in the last slot of the X axis.
  const highlightedPercent = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    return ((HIGHLIGHTED!.count / total) * 100).toFixed(1);
  }, []);

  return (
    <div className="flex flex-col h-full justify-center px-4 py-6 sm:px-6 sm:py-8 select-none">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
          Classification Distribution
        </p>
        <p className="font-mono text-[10px] text-foreground-subtle/60 mt-0.5">
          Last 30 days
        </p>
      </div>

      <div
        className="relative w-full focus:outline-none [&_*]:!outline-none [&_svg]:focus:outline-none"
        style={{ height: 280 }}
        tabIndex={-1}
      >
        {/* Highlight column behind the rightmost bar */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: 0,
            bottom: 28,
            right: "2%",
            width: "20%",
            background:
              "linear-gradient(to bottom, rgba(232,97,60,0.12) 0%, rgba(232,97,60,0.06) 60%, transparent 100%)",
            borderLeft: "1px solid rgba(232,97,60,0.15)",
            borderRight: "1px solid rgba(232,97,60,0.15)",
          }}
        />

        {/* Static callout label positioned above the rightmost bar */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            top: 28,
            right: "9%",
            animation: "callout-float 3s ease-in-out infinite",
          }}
        >
          <div className="rounded-lg bg-surface-elevated/95 backdrop-blur-md border border-white/[0.08] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted mb-0.5">
              {HIGHLIGHTED!.type}
            </p>
            <p className="font-mono text-xs text-foreground font-semibold">
              {HIGHLIGHTED!.count.toLocaleString()} memories
            </p>
            <p className="font-mono text-[9px] text-accent mt-0.5">
              {highlightedPercent}% of total
            </p>
          </div>
          {/* Connecting tick mark down to the bar */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-px"
            style={{
              top: "100%",
              height: 12,
              background:
                "linear-gradient(to bottom, rgba(232,97,60,0.6), transparent)",
            }}
          />
        </div>

        <ResponsiveContainer
          width="100%"
          height="100%"
          className="relative z-10"
        >
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1f1f1f"
              vertical={false}
            />
            <XAxis
              dataKey="type"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#6b6b6b",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#6b6b6b",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
              dx={-4}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-out"
              activeBar={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        @keyframes callout-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
