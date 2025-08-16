import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelemetryData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  mode: 'load' | 'charge' | 'standby';
  warnings: string[];
}

interface ChartDataPoint {
  time: string;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
}

interface LiveChartProps {
  telemetry: TelemetryData;
  timeRange: string;
  isActive: boolean;
  onTimeRangeChange?: (range: string) => void;
  selectedMetric?: 'voltage' | 'current' | 'power' | 'temperature';
}

const timeRangeOptions = [
  { value: '1min', label: '1 Min', icon: Clock },
  { value: '5min', label: '5 Min', icon: Clock },
  { value: '30min', label: '30 Min', icon: Clock },
  { value: '2hr', label: '2 Hour', icon: Clock },
];

export const LiveChart: React.FC<LiveChartProps> = ({ 
  telemetry, 
  timeRange, 
  isActive,
  onTimeRangeChange,
  selectedMetric = 'temperature'
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (isActive) {
      const newDataPoint: ChartDataPoint = {
        time: new Date(telemetry.timestamp).toLocaleTimeString(),
        voltage: Number(telemetry.voltage.toFixed(2)),
        current: Number((telemetry.current / 1000).toFixed(3)), // Convert mA to A for better chart scaling
        power: Number(telemetry.power.toFixed(2)),
        temperature: Number(telemetry.temperature.toFixed(1))
      };

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        
        // Limit data points based on time range
        const maxPoints = getMaxPointsForRange(timeRange);
        return updated.slice(-maxPoints);
      });
    }
  }, [telemetry, isActive, timeRange]);

  const getMaxPointsForRange = (range: string): number => {
    switch (range) {
      case '1min': return 60;
      case '5min': return 300;
      case '30min': return 360; // 30min with 5s intervals
      case '2hr': return 720; // 2hr with 10s intervals
      default: return 300;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {getUnit(entry.dataKey)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getUnit = (dataKey: string): string => {
    switch (dataKey) {
      case 'voltage': return 'V';
      case 'current': return 'A';
      case 'power': return 'W';
      case 'temperature': return '°C';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Time Control Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Time Range</span>
        </div>
        <div className="flex gap-1">
          {timeRangeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={timeRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onTimeRangeChange?.(option.value)}
                className={cn(
                  "h-8 px-3 text-xs",
                  timeRange === option.value && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-3 w-3 mr-1" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetric === 'temperature' && (
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--warning))", strokeWidth: 2 }}
                name="Temperature (°C)"
              />
            )}
            {selectedMetric === 'current' && (
              <Line
                type="monotone"
                dataKey="current"
                stroke="hsl(var(--current))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--current))", strokeWidth: 2 }}
                name="Current (A)"
              />
            )}
            {selectedMetric === 'power' && (
              <Line
                type="monotone"
                dataKey="power"
                stroke="hsl(var(--power))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--power))", strokeWidth: 2 }}
                name="Power (W)"
              />
            )}
            {selectedMetric === 'voltage' && (
              <Line
                type="monotone"
                dataKey="voltage"
                stroke="hsl(var(--electric))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--electric))", strokeWidth: 2 }}
                name="Voltage (V)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};