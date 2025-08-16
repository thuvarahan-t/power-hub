import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelemetryData {
  timestamp: number; // epoch ms
  voltage: number;   // V
  current: number;   // A
  power?: number;    // W (optional; computed if missing)
  temperature: number; // °C
  mode: "load" | "charge" | "standby";
  warnings: string[];
}

interface ChartDataPoint {
  ts: number;       // epoch ms for trimming
  time: string;     // label for X axis
  voltage: number;
  current: number;
  power: number;
  temperature: number;
}

type TimeRange = "1min" | "5min" | "30min" | "2hr";
type Metric = "voltage" | "current" | "power" | "temperature";

interface LiveChartProps {
  telemetry?: TelemetryData | null;
  timeRange: TimeRange;
  isActive: boolean;
  onTimeRangeChange?: (range: TimeRange) => void;

  // Optional overrides (auto-set by metric if undefined)
  selectedMetric?: Metric;
  yAxisDomain?: [number, number];
  yAxisLabel?: string;
  yAxisTicks?: number[];
  refLineValue?: number;
  refLineLabel?: string;

  exportCSV?: boolean;
  exportPNG?: boolean; // NOTE: PNG export placeholder (html2canvas recommended)

  // Mode for dynamic chart config (e.g., "charge", "load", "standby")
  mode?: string;
}

const TIME_RANGE_SECONDS: Record<TimeRange, number> = {
  "1min": 60,
  "5min": 300,
  "30min": 1800,
  "2hr": 7200,
};

const timeRangeOptions: { value: TimeRange; label: string; icon: any }[] = [
  { value: "1min", label: "1 Min", icon: Clock },
  { value: "5min", label: "5 Min", icon: Clock },
  { value: "30min", label: "30 Min", icon: Clock },
  { value: "2hr", label: "2 Hour", icon: Clock },
];

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour12: true });

const metricDefaults = (m: Metric, mode?: string) => {
  // Mode-specific max values
  if (m === "voltage") {
    if (mode === "charge") {
      return {
        domain: [0, 4.35],
        label: "Voltage (V)",
        ticks: [0, 1, 2, 3, 4.35],
        ref: 4.35,
        refLabel: "Max 4.35V",
        stroke: "hsl(var(--electric))",
        name: "Voltage (V)",
        key: "voltage" as const,
      };
    } else if (mode === "mobile") {
      return {
        domain: [0, 5],
        label: "Voltage (V)",
        ticks: [0, 1, 2, 3, 4, 5],
        ref: 5,
        refLabel: "Max 5V (Mobile)",
        stroke: "hsl(var(--electric))",
        name: "Voltage (V)",
        key: "voltage" as const,
      };
    } else if (mode === "load") {
      return {
        domain: [0, 12],
        label: "Voltage (V)",
        ticks: [0, 3, 6, 9, 12],
        ref: 12,
        refLabel: "Max 12V",
        stroke: "hsl(var(--electric))",
        name: "Voltage (V)",
        key: "voltage" as const,
      };
    }
    // Default
    return {
      domain: [0, 12],
      label: "Voltage (V)",
      ticks: [0, 3, 6, 9, 12],
      ref: 12,
      refLabel: "Max 12V",
      stroke: "hsl(var(--electric))",
      name: "Voltage (V)",
      key: "voltage" as const,
    };
  }
  if (m === "current") {
    if (mode === "charge") {
      return {
        domain: [0, 1.5],
        label: "Current (A)",
        ticks: [0, 0.5, 1, 1.5],
        ref: 1.5,
        refLabel: "Max 1.5A",
        stroke: "hsl(var(--current))",
        name: "Current (A)",
        key: "current" as const,
      };
    } else if (mode === "mobile") {
      return {
        domain: [0, 2.4],
        label: "Current (A)",
        ticks: [0, 0.5, 1, 1.5, 2, 2.4],
        ref: 2.4,
        refLabel: "Max 2.4A (Mobile)",
        stroke: "hsl(var(--current))",
        name: "Current (A)",
        key: "current" as const,
      };
    } else if (mode === "load") {
      return {
        domain: [0, 2],
        label: "Current (A)",
        ticks: [0, 0.5, 1, 1.5, 2],
        ref: 2,
        refLabel: "Max 2A",
        stroke: "hsl(var(--current))",
        name: "Current (A)",
        key: "current" as const,
      };
    }
    return {
      domain: [0, 2],
      label: "Current (A)",
      ticks: [0, 0.5, 1, 1.5, 2],
      ref: 2,
      refLabel: "Max 2A",
      stroke: "hsl(var(--current))",
      name: "Current (A)",
      key: "current" as const,
    };
  }
  if (m === "power") {
    if (mode === "charge") {
      return {
        domain: [0, 6.5],
        label: "Power (W)",
        ticks: [0, 2, 4, 6, 6.5],
        ref: 6.5,
        refLabel: "Max 6.5W",
        stroke: "hsl(var(--power))",
        name: "Power (W)",
        key: "power" as const,
      };
    } else if (mode === "mobile") {
      return {
        domain: [0, 12],
        label: "Power (W)",
        ticks: [0, 3, 6, 9, 12],
        ref: 12,
        refLabel: "Max 12W (Mobile)",
        stroke: "hsl(var(--power))",
        name: "Power (W)",
        key: "power" as const,
      };
    } else if (mode === "load") {
      return {
        domain: [0, 24],
        label: "Power (W)",
        ticks: [0, 6, 12, 18, 24],
        ref: 24,
        refLabel: "Max 24W",
        stroke: "hsl(var(--power))",
        name: "Power (W)",
        key: "power" as const,
      };
    }
    return {
      domain: [0, 24],
      label: "Power (W)",
      ticks: [0, 6, 12, 18, 24],
      ref: 24,
      refLabel: "Max 24W",
      stroke: "hsl(var(--power))",
      name: "Power (W)",
      key: "power" as const,
    };
  }
  // Temperature (default)
  return {
    domain: [0, 100],
    label: "Temperature (°C)",
    ticks: [0, 20, 40, 60, 80, 100],
    ref: undefined,
    refLabel: undefined,
    stroke: "hsl(var(--warning))",
    name: "Temperature (°C)",
    key: "temperature" as const,
  };
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(20,20,20,0.9)",
          color: "#fff",
          padding: 8,
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <div style={{ opacity: 0.8 }}>{label}</div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx}>
            {entry.name}: <strong>{entry.value}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const LiveChart: React.FC<LiveChartProps> = ({
  telemetry,
  timeRange,
  isActive,
  onTimeRangeChange,
  selectedMetric: propSelectedMetric = "temperature",
  yAxisDomain,
  yAxisLabel,
  yAxisTicks,
  refLineValue,
  refLineLabel,
  exportCSV = true,
  exportPNG = false, // not implemented here
  // Accept mode as prop (default undefined)
  mode,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] =
    useState<Metric>(propSelectedMetric);

  // React to external metric changes
  useEffect(() => {
    setSelectedMetric(propSelectedMetric);
  }, [propSelectedMetric]);

  // Push new telemetry into ring buffer
  useEffect(() => {
    if (!isActive) return;

    let ts, voltage, current, power, temperature;
    if (telemetry) {
      ts = telemetry.timestamp || Date.now();
      voltage = Number(telemetry.voltage ?? 0);
      current = Number(telemetry.current ?? 0);
      power = telemetry.power !== undefined && telemetry.power !== null
        ? Number(telemetry.power)
        : Number((voltage * current).toFixed(2));
      temperature = Number(telemetry.temperature ?? 0);
    } else {
      // Simulate values for demo/testing
      ts = Date.now();
      // Use mode to set realistic values
      switch (mode) {
        case "charge":
          voltage = 4.1 + Math.random() * 0.2; // 4.1-4.3V
          current = 1.0 + Math.random() * 0.5; // 1.0-1.5A
          power = voltage * current;
          temperature = 30 + Math.random() * 10; // 30-40°C
          break;
        case "mobile":
          voltage = 4.8 + Math.random() * 0.2; // 4.8-5.0V
          current = 1.5 + Math.random() * 0.8; // 1.5-2.3A
          power = voltage * current;
          temperature = 28 + Math.random() * 7; // 28-35°C
          break;
        case "load":
          voltage = 11 + Math.random(); // 11-12V
          current = 1.5 + Math.random() * 0.5; // 1.5-2A
          power = voltage * current;
          temperature = 35 + Math.random() * 10; // 35-45°C
          break;
        default:
          voltage = 3 + Math.random() * 9; // 3-12V
          current = 0.5 + Math.random() * 1.5; // 0.5-2A
          power = voltage * current;
          temperature = 25 + Math.random() * 20; // 25-45°C
      }
    }

    const next: ChartDataPoint = {
      ts,
      time: formatTime(ts),
      voltage,
      current,
      power: Number(power.toFixed(2)),
      temperature: Number(temperature.toFixed(2)),
    };

    const windowMs = TIME_RANGE_SECONDS[timeRange] * 1000;
    const cutoff = ts - windowMs;

    setChartData((prev) => {
      const merged = [...prev, next].filter((p) => p.ts >= cutoff);
      return merged;
    });
  }, [telemetry, isActive, timeRange, mode]);

  // Trim on timeRange change even if no new data
  useEffect(() => {
    setChartData((prev) => {
      const now = Date.now();
      const cutoff = now - TIME_RANGE_SECONDS[timeRange] * 1000;
      return prev.filter((p) => p.ts >= cutoff);
    });
  }, [timeRange]);

  // Auto Y-axis config based on metric (overridable via props)
  const cfg = useMemo(() => {
    const base = metricDefaults(selectedMetric, mode);
    return {
      domain: yAxisDomain ?? base.domain,
      label: yAxisLabel ?? base.label,
      ticks: yAxisTicks ?? base.ticks,
      ref: refLineValue ?? base.ref,
      refLabel: refLineLabel ?? base.refLabel,
      stroke: base.stroke,
      name: base.name,
      key: base.key,
    };
  }, [
    selectedMetric,
    yAxisDomain,
    yAxisLabel,
    yAxisTicks,
    refLineValue,
    refLineLabel,
    mode,
  ]);

  // CSV export
  const handleExportCSV = () => {
    const header = "time,voltage,current,power,temperature\n";
    const rows = chartData
      .map(
        (d) => `${d.time},${d.voltage},${d.current},${d.power},${d.temperature}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetry_${selectedMetric}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Time Range controls */}
      <div className="flex items-center justify-end gap-2 pb-2">
        {timeRangeOptions.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            size="sm"
            variant={timeRange === value ? "default" : "outline"}
            onClick={() => onTimeRangeChange?.(value)}
            className={cn("gap-2")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 280, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 20, left: 12, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={cfg.domain}
              ticks={cfg.ticks}
              label={
                cfg.label
                  ? {
                      value: cfg.label,
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                    }
                  : undefined
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {cfg.ref !== undefined && (
              <ReferenceLine
                y={cfg.ref}
                strokeDasharray="3 3"
                stroke="red"
                label={cfg.refLabel}
              />
            )}

            <Line
              type="monotone"
              dataKey={cfg.key}
              stroke={cfg.stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: cfg.stroke, strokeWidth: 2 }}
              name={cfg.name}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metric selection buttons */}
      <div className="flex justify-center gap-3 mt-4 mb-2 flex-wrap">
        <Button
          size="sm"
          variant={selectedMetric === "temperature" ? "default" : "outline"}
          onClick={() => setSelectedMetric("temperature")}
        >
          Temperature (°C)
        </Button>
        <Button
          size="sm"
          variant={selectedMetric === "current" ? "default" : "outline"}
          onClick={() => setSelectedMetric("current")}
        >
          Current (A)
        </Button>
        <Button
          size="sm"
          variant={selectedMetric === "voltage" ? "default" : "outline"}
          onClick={() => setSelectedMetric("voltage")}
        >
          Voltage (V)
        </Button>
        <Button
          size="sm"
          variant={selectedMetric === "power" ? "default" : "outline"}
          onClick={() => setSelectedMetric("power")}
        >
          Power (W)
        </Button>
      </div>

      {/* Exports */}
      <div className="flex justify-center gap-3 mb-6">
        {exportCSV && (
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            Export CSV (this series)
          </Button>
        )}
        {exportPNG && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              alert(
                "PNG export not wired. Use html2canvas or a chart ref to capture."
              )
            }
          >
            Export PNG
          </Button>
        )}
      </div>
    </div>
  );
};
