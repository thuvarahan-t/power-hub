export interface TelemetryData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  mode: 'load' | 'charge' | 'standby';
  warnings: string[];
}

export interface SparklineData {
  inputPower: number[];
  outputPower: number[];
  outputVoltage: number[];
  outputCurrent: number[];
}

export type ExportFormat = 'csv' | 'json' | 'txt';
export type TimeRange = '1min' | '5min' | '30min' | '1hr' | '2hr' | 'all';

export interface ExportOptions {
  format: ExportFormat;
  timeRange: TimeRange;
  includeHeaders: boolean;
  includeSparklines: boolean;
  includeMetadata: boolean;
  filename: string;
}

export const TIME_RANGE_MS = {
  '1min': 60 * 1000,
  '5min': 5 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hr': 60 * 60 * 1000,
  '2hr': 2 * 60 * 60 * 1000,
  'all': Infinity
} as const;

export const generateExportData = (
  telemetry: TelemetryData,
  sparklineData: SparklineData,
  timeRange: TimeRange
) => {
  const now = Date.now();
  const startTime = timeRange === 'all' ? 0 : now - TIME_RANGE_MS[timeRange];
  
  // Create data points from sparkline data
  const maxLength = Math.max(
    sparklineData.inputPower.length,
    sparklineData.outputPower.length,
    sparklineData.outputVoltage.length,
    sparklineData.outputCurrent.length
  );

  const dataPoints = [];
  for (let i = 0; i < maxLength; i++) {
    const timestamp = now - (maxLength - i) * 1000; // 1 second intervals
    if (timestamp >= startTime) {
      dataPoints.push({
        timestamp,
        inputPower: sparklineData.inputPower[i] || 0,
        outputPower: sparklineData.outputPower[i] || 0,
        outputVoltage: sparklineData.outputVoltage[i] || 0,
        outputCurrent: sparklineData.outputCurrent[i] || 0,
        temperature: telemetry.temperature + (Math.random() - 0.5) * 2, // Simulate temperature variation
        mode: telemetry.mode
      });
    }
  }

  return dataPoints;
};

export const exportToCSV = (data: any[], includeHeaders: boolean = true) => {
  const headers = ['Timestamp', 'Input Power (W)', 'Output Power (W)', 'Output Voltage (V)', 'Output Current (A)', 'Temperature (°C)', 'Mode'];
  const csvContent = [
    includeHeaders ? headers.join(',') : '',
    ...data.map(row => [
      new Date(row.timestamp).toISOString(),
      row.inputPower.toFixed(3),
      row.outputPower.toFixed(3),
      row.outputVoltage.toFixed(3),
      row.outputCurrent.toFixed(3),
      row.temperature.toFixed(1),
      row.mode
    ].join(','))
  ].filter(Boolean).join('\n');

  return csvContent;
};

export const exportToJSON = (
  data: any[],
  sparklineData: SparklineData,
  options: ExportOptions
) => {
  const exportData: any = {
    exportInfo: {
      timestamp: new Date().toISOString(),
      format: 'json',
      timeRange: options.timeRange,
      dataPoints: data.length
    }
  };

  if (options.includeMetadata) {
    exportData.metadata = {
      device: 'Power Hub',
      version: '1.0.0',
      exportSettings: {
        format: options.format,
        timeRange: options.timeRange,
        includeHeaders: options.includeHeaders,
        includeSparklines: options.includeSparklines,
        includeMetadata: options.includeMetadata
      }
    };
  }

  exportData.telemetry = data;

  if (options.includeSparklines) {
    exportData.sparklines = sparklineData;
  }

  return JSON.stringify(exportData, null, 2);
};

export const exportToTXT = (data: any[], options: ExportOptions) => {
  let content = 'Power Hub Telemetry Export\n';
  content += '='.repeat(50) + '\n\n';

  if (options.includeMetadata) {
    content += `Export Date: ${new Date().toISOString()}\n`;
    content += `Time Range: ${options.timeRange}\n`;
    content += `Data Points: ${data.length}\n`;
    content += `Format: ${options.format.toUpperCase()}\n\n`;
  }

  content += 'Telemetry Data:\n';
  content += '-'.repeat(30) + '\n';

  data.forEach((row, index) => {
    content += `[${index + 1}] ${new Date(row.timestamp).toLocaleString()}\n`;
    content += `  Input Power: ${row.inputPower.toFixed(3)} W\n`;
    content += `  Output Power: ${row.outputPower.toFixed(3)} W\n`;
    content += `  Output Voltage: ${row.outputVoltage.toFixed(3)} V\n`;
    content += `  Output Current: ${row.outputCurrent.toFixed(3)} A\n`;
    content += `  Temperature: ${row.temperature.toFixed(1)} °C\n`;
    content += `  Mode: ${row.mode}\n\n`;
  });

  return content;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getMimeType = (format: ExportFormat): string => {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
  }
};

export const getFileExtension = (format: ExportFormat): string => {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    case 'txt':
      return 'txt';
  }
};

export const getTimeRangeLabel = (range: TimeRange): string => {
  switch (range) {
    case '1min': return '1 Minute';
    case '5min': return '5 Minutes';
    case '30min': return '30 Minutes';
    case '1hr': return '1 Hour';
    case '2hr': return '2 Hours';
    case 'all': return 'All Data';
  }
};
