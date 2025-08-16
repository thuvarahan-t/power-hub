import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Download, Wifi, WifiOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExportDialog } from './ExportDialog';
import { TelemetryData, SparklineData } from '@/lib/export-utils';

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
  sparklineData: SparklineData;
  telemetry: TelemetryData;
  onExport: () => void;
  onSettings: () => void;
}

export const PowerHubHeader: React.FC<PowerHubHeaderProps> = ({
  connectionStatus,
  metrics,
  sparklineData,
  telemetry,
  onExport,
  onSettings
}) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
    <>
      <header className="h-14 sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="flex items-center justify-between h-full px-4">
          <div className="relative z-10">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              PowerHub
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Backend Status */}
            <Badge 
              variant={backendStatus.variant as any}
              className={cn(
                "flex items-center gap-1 text-xs py-1 px-2",
                backendStatus.pulse && "animate-pulse"
              )}
            >
              <backendStatus.icon className="h-3 w-3" />
              {backendStatus.label}
            </Badge>
            
            {/* Device Status */}
            <Badge 
              variant={deviceStatus.variant as any}
              className={cn(
                "flex items-center gap-1 text-xs py-1 px-2",
                deviceStatus.pulse && "animate-pulse"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                deviceStatus.variant === 'default' && "bg-success animate-pulse",
                deviceStatus.variant === 'warning' && "bg-warning animate-pulse",
                deviceStatus.variant === 'destructive' && "bg-destructive animate-pulse"
              )} />
              {deviceStatus.label}
            </Badge>
            
            <Button 
              variant="control" 
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              className="gap-1 h-8 px-3"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSettings}
              className="gap-1 h-8 px-3"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Export Dialog */}
      <ExportDialog
        telemetry={telemetry}
        sparklineData={sparklineData}
        isOpen={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </>
  );
};