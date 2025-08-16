import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Clock,
  Activity,
  Zap,
  Thermometer
} from 'lucide-react';
import { 
  TelemetryData, 
  SparklineData, 
  ExportFormat, 
  TimeRange, 
  ExportOptions,
  generateExportData,
  exportToCSV,
  exportToJSON,
  exportToTXT,
  downloadFile,
  getMimeType,
  getFileExtension,
  getTimeRangeLabel
} from '@/lib/export-utils';

interface ExportDialogProps {
  telemetry: TelemetryData;
  sparklineData: SparklineData;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  telemetry,
  sparklineData,
  isOpen,
  onOpenChange
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [timeRange, setTimeRange] = useState<TimeRange>('5min');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeSparklines, setIncludeSparklines] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [filename, setFilename] = useState(`power-hub-export-${new Date().toISOString().split('T')[0]}`);

  const handleExport = () => {
    const data = generateExportData(telemetry, sparklineData, timeRange);
    let content = '';
    const mimeType = getMimeType(format);
    const extension = getFileExtension(format);

    const options: ExportOptions = {
      format,
      timeRange,
      includeHeaders,
      includeSparklines,
      includeMetadata,
      filename
    };

    switch (format) {
      case 'csv':
        content = exportToCSV(data, includeHeaders);
        break;
      case 'json':
        content = exportToJSON(data, sparklineData, options);
        break;
      case 'txt':
        content = exportToTXT(data, options);
        break;
    }

    downloadFile(content, `${filename}.${extension}`, mimeType);
    onOpenChange(false);
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
        return <FileText className="h-4 w-4" />;
      case 'txt':
        return <FileText className="h-4 w-4" />;
    }
  };

  const dataPoints = generateExportData(telemetry, sparklineData, timeRange);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Telemetry Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(['csv', 'json', 'txt'] as ExportFormat[]).map((fmt) => (
                  <Button
                    key={fmt}
                    variant={format === fmt ? 'default' : 'outline'}
                    className="flex items-center gap-2"
                    onClick={() => setFormat(fmt)}
                  >
                    {getFormatIcon(fmt)}
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['1min', '5min', '30min', '1hr', '2hr', 'all'] as TimeRange[]).map((range) => (
                    <SelectItem key={range} value={range}>
                      {getTimeRangeLabel(range)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="headers"
                  checked={includeHeaders}
                  onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
                />
                <Label htmlFor="headers">Include column headers (CSV)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sparklines"
                  checked={includeSparklines}
                  onCheckedChange={(checked) => setIncludeSparklines(checked as boolean)}
                />
                <Label htmlFor="sparklines">Include sparkline data (JSON)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata">Include export metadata</Label>
              </div>
            </CardContent>
          </Card>

          {/* Filename */}
          <Card>
            <CardHeader>
              <CardTitle>Filename</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Export Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-electric" />
                    <span>Data Points:</span>
                    <Badge variant="outline">{dataPoints.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Time Range:</span>
                    <Badge variant="outline">{getTimeRangeLabel(timeRange)}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Format:</span>
                    <Badge variant="outline">{format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-temperature" />
                    <span>Current Temp:</span>
                    <Badge variant="outline">{telemetry.temperature.toFixed(1)}°C</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
