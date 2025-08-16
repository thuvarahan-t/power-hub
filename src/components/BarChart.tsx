import React from 'react';
import { BarChart as RechartsBarChart, Bar, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: number[];
  color: string;
  height?: number;
  width?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
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
  console.log('BarChart data:', { data: chartData.slice(-5), color, height });

  return (
    <div style={{ width, height }} className="relative bg-black rounded overflow-hidden border border-gray-600">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Bar
            dataKey="value"
            fill={color}
            radius={[2, 2, 0, 0]}
            animationDuration={1500}
            animationBegin={0}
            isAnimationActive={true}
            animationEasing="ease-out"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};
