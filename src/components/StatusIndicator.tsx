import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, variant }) => {
  const getIcon = () => {
    switch (status) {
      case 'Connected':
        return <Wifi className="h-4 w-4" />;
      case 'Disconnected':
        return <WifiOff className="h-4 w-4" />;
      case 'Simulating':
        return <Play className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (variant) {
      case 'default':
        return 'status-connected';
      case 'warning':
        return 'status-warning';
      case 'destructive':
        return 'status-warning';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={variant}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium',
        getStatusColor()
      )}
    >
      {getIcon()}
      {status}
    </Badge>
  );
};