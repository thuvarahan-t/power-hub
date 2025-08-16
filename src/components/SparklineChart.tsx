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

  // Debug: log the data to console
  console.log('SparklineChart data:', { data: chartData.slice(-5), color, height });

  return (
    <div style={{ width, height }} className="relative bg-black rounded overflow-hidden border border-gray-600">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={false}
            animationDuration={1500}
            animationBegin={0}
            isAnimationActive={true}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
