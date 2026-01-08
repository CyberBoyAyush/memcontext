"use client";

import * as React from "react";
import { Tooltip as RechartsTooltip } from "recharts";

export interface ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  };
}

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }
  return context;
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactNode;
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const colorVars = React.useMemo(() => {
    return Object.entries(config).reduce(
      (acc, [key, value]) => {
        acc[`--color-${key}`] = value.color;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={className} style={colorVars} {...props}>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  labelKey?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  hideLabel = false,
  labelKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const displayLabel = labelKey
    ? (payload[0]?.payload?.[labelKey] as string)
    : label;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      {!hideLabel && displayLabel && (
        <p className="text-sm font-medium text-foreground mb-1.5">
          {displayLabel}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const configItem = config[item.dataKey];
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {indicator === "dot" && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {indicator === "line" && (
                <span
                  className="h-0.5 w-3 rounded shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {indicator === "dashed" && (
                <span
                  className="h-0.5 w-3 rounded shrink-0 border-t-2 border-dashed"
                  style={{ borderColor: item.color }}
                />
              )}
              <span className="text-foreground-muted">
                {configItem?.label || item.name}:
              </span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartTooltip = RechartsTooltip;
