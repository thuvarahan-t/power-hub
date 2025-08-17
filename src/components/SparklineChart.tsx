import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  color,
  height = 40,
  width = "100%"
}) => {
  // Ensure we have data to display
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center bg-black rounded">
        <div className="text-xs text-white">No data</div>
      </div>
    );
  }

  // Convert array of numbers to chart data format
  const chartData = data.map((value, index) => ({
    value: Math.max(0, value), // Ensure no negative values
    index
  }));

  // fallback to a theme color if caller didn't provide one
  const strokeColor = color || "hsl(var(--power-color))";

  return (
    // make background transparent so chart blends with dark theme
    <div style={{ width, height }} className="relative bg-transparent rounded overflow-hidden border border-gray-600">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
