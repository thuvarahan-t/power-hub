import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TelemetryFooterProps {
  inputVoltage: number | null;
  outputVoltage: number;
  outputCurrent: number;
  connected: boolean;
}

export const TelemetryFooter: React.FC<TelemetryFooterProps> = ({
  inputVoltage,
  outputVoltage,
  outputCurrent,
  connected
}) => {
  const getValueClass = (value: number, max: number, type: 'voltage' | 'current') => {
    const percentage = (value / max) * 100;
    if (percentage > 90) return 'text-destructive';
    if (percentage > 75) return 'text-warning';
    return type === 'voltage' ? 'text-electric' : 'text-current';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-6">
          <Badge variant="outline" className="gap-2">
            <span className="text-xs text-muted-foreground">VIN:</span>
            <span className={cn(
              "font-mono text-xs font-semibold",
              inputVoltage ? "text-muted-foreground" : "text-muted-foreground/50"
            )}>
              {inputVoltage ? `${inputVoltage.toFixed(2)}V` : 'N/A'}
            </span>
          </Badge>
          
          <Badge variant="outline" className="gap-2">
            <span className="text-xs text-muted-foreground">VOUT:</span>
            <span className={cn(
              "font-mono text-xs font-semibold",
              getValueClass(outputVoltage, 12, 'voltage')
            )}>
              {outputVoltage.toFixed(2)}V
            </span>
          </Badge>
          
          <Badge variant="outline" className="gap-2">
            <span className="text-xs text-muted-foreground">IOUT:</span>
            <span className={cn(
              "font-mono text-xs font-semibold",
              getValueClass(outputCurrent, 2, 'current')
            )}>
              {(outputCurrent * 1000).toFixed(0)}mA
            </span>
          </Badge>
          
          <div className={cn(
            "w-2 h-2 rounded-full transition-colors",
            connected ? "bg-success animate-pulse" : "bg-muted-foreground"
          )} />
        </div>
      </div>
    </div>
  );
};