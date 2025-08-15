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
}

export const LiveChart: React.FC<LiveChartProps> = ({ 
  telemetry, 
  timeRange, 
  isActive 
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
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.3}
          />
          
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ 
              color: 'hsl(var(--foreground))',
              fontSize: '14px'
            }}
          />
          
          <Line
            type="monotone"
            dataKey="voltage"
            stroke="hsl(var(--voltage-color))"
            strokeWidth={2}
            dot={false}
            name="Voltage"
            connectNulls={false}
          />
          
          <Line
            type="monotone"
            dataKey="current"
            stroke="hsl(var(--current-color))"
            strokeWidth={2}
            dot={false}
            name="Current"
            connectNulls={false}
          />
          
          <Line
            type="monotone"
            dataKey="power"
            stroke="hsl(var(--power-color))"
            strokeWidth={2}
            dot={false}
            name="Power"
            connectNulls={false}
          />
          
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="hsl(var(--temperature-color))"
            strokeWidth={2}
            dot={false}
            name="Temperature"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};