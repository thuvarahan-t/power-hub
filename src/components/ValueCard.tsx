import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValueCardProps {
  title: string;
  value: number;
  unit: string;
  max: number;
  icon: LucideIcon;
  type: 'voltage' | 'current' | 'power' | 'temperature';
  trend?: 'increasing' | 'decreasing' | 'stable';
  className?: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  title,
  value,
  unit,
  max,
  icon: Icon,
  type,
  trend = 'stable',
  className
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const formatValue = (val: number) => {
    if (type === 'current' && unit === 'mA') {
      return val.toFixed(0);
    }
    return val.toFixed(2);
  };

  const getTypeColor = () => {
    switch (type) {
      case 'voltage': return 'text-[hsl(var(--electric))]';
      case 'current': return 'text-[hsl(var(--current))]';
      case 'power': return 'text-[hsl(var(--power))]';
      case 'temperature': return 'text-[hsl(var(--warning))]';
      default: return 'text-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-3 w-3 text-success" />;
      case 'decreasing': return <TrendingDown className="h-3 w-3 text-destructive" />;
      case 'stable': return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const isWarning = percentage > 90;
  const isCritical = percentage > 95;

  return (
    <Card className={cn(
      'value-card animate-slide-up',
      type,
      isWarning && 'border-warning/50',
      isCritical && 'border-destructive/50 animate-pulse-glow',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-5 w-5', getTypeColor())} />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Main Value */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className={cn('text-3xl font-bold font-mono', getTypeColor())}>
                  {formatValue(value)}
                </span>
                <span className="text-lg text-muted-foreground font-mono">
                  {unit}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}% of max
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <Badge 
              variant={isCritical ? 'destructive' : isWarning ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {isCritical ? 'CRITICAL' : isWarning ? 'HIGH' : 'NORMAL'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all duration-500 ease-out rounded-full',
                  type === 'voltage' && 'bg-gradient-to-r from-electric/60 to-electric',
                  type === 'current' && 'bg-gradient-to-r from-current/60 to-current',
                  type === 'power' && 'bg-gradient-to-r from-power/60 to-power',
                  type === 'temperature' && 'bg-gradient-to-r from-temperature/60 to-temperature',
                  isCritical && 'bg-gradient-to-r from-destructive to-warning animate-pulse'
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>0</span>
              <span>{max} {unit}</span>
            </div>
          </div>

          {/* Safety Indicator */}
          {isCritical && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-medium">
                Safety limit approached
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};