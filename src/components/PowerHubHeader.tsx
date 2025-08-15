import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Download, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTileProps {
  label: string;
  value: number | null;
  unit: string;
  sparklineData?: number[];
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, unit, sparklineData }) => (
  <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold font-mono text-electric">
      {value !== null ? `${value.toFixed(2)}` : 'N/A'}
      <span className="text-lg text-muted-foreground ml-1">{unit}</span>
    </div>
    {sparklineData && (
      <div className="h-6 flex items-end gap-0.5">
        {sparklineData.slice(-20).map((point, i) => (
          <div
            key={i}
            className="bg-electric/30 w-1 rounded-sm transition-all"
            style={{ height: `${Math.max(2, (point / Math.max(...sparklineData)) * 24)}px` }}
          />
        ))}
      </div>
    )}
  </div>
);

interface ConnectionStatus {
  backend: 'connected' | 'disconnected';
  device: 'connected' | 'not-found' | 'simulating';
}

interface PowerHubHeaderProps {
  connectionStatus: ConnectionStatus;
  metrics: {
    inputPower: number | null;
    outputPower: number;
    outputVoltage: number;
    outputCurrent: number;
  };
  sparklineData: {
    inputPower: number[];
    outputPower: number[];
    outputVoltage: number[];
    outputCurrent: number[];
  };
  onExport: () => void;
  onSettings: () => void;
}

export const PowerHubHeader: React.FC<PowerHubHeaderProps> = ({
  connectionStatus,
  metrics,
  sparklineData,
  onExport,
  onSettings
}) => {
  const getBackendStatus = () => {
    const isConnected = connectionStatus.backend === 'connected';
    return {
      label: isConnected ? 'Backend Connected' : 'Backend Disconnected',
      variant: isConnected ? 'default' : 'destructive',
      icon: isConnected ? Wifi : WifiOff,
      pulse: !isConnected
    };
  };

  const getDeviceStatus = () => {
    const { device } = connectionStatus;
    switch (device) {
      case 'connected':
        return {
          label: 'Device Connected',
          variant: 'default',
          icon: Activity,
          pulse: false
        };
      case 'simulating':
        return {
          label: 'Simulating',
          variant: 'warning',
          icon: Activity,
          pulse: true
        };
      default:
        return {
          label: 'Device Not Found',
          variant: 'destructive',
          icon: Activity,
          pulse: true
        };
    }
  };

  const backendStatus = getBackendStatus();
  const deviceStatus = getDeviceStatus();

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      {/* Hero Bar */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent">
              Power Hub
            </h1>
            <p className="text-lg text-muted-foreground">
              Portable charging & voltage regulation
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Backend Status */}
            <Badge 
              variant={backendStatus.variant as any}
              className={cn(
                "flex items-center gap-2 text-sm py-2 px-4",
                backendStatus.pulse && "animate-pulse"
              )}
            >
              <backendStatus.icon className="h-4 w-4" />
              {backendStatus.label}
            </Badge>
            
            {/* Device Status */}
            <Badge 
              variant={deviceStatus.variant as any}
              className={cn(
                "flex items-center gap-2 text-sm py-2 px-4",
                deviceStatus.pulse && "animate-pulse"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                deviceStatus.variant === 'default' && "bg-success animate-pulse",
                deviceStatus.variant === 'warning' && "bg-warning animate-pulse",
                deviceStatus.variant === 'destructive' && "bg-destructive animate-pulse"
              )} />
              {deviceStatus.label}
            </Badge>
            
            <Button 
              variant="control" 
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSettings}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile 
            label="Input Power (Pin)"
            value={metrics.inputPower}
            unit="W"
            sparklineData={sparklineData.inputPower}
          />
          <MetricTile 
            label="Output Power (Pout)"
            value={metrics.outputPower}
            unit="W"
            sparklineData={sparklineData.outputPower}
          />
          <MetricTile 
            label="Output Voltage (Vout)"
            value={metrics.outputVoltage}
            unit="V"
            sparklineData={sparklineData.outputVoltage}
          />
          <MetricTile 
            label="Output Current (Iout)"
            value={metrics.outputCurrent}
            unit="A"
            sparklineData={sparklineData.outputCurrent}
          />
        </div>
      </div>
    </div>
  );
};