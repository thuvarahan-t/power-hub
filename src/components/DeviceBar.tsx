import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Usb, Wifi, WifiOff, RefreshCw, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DeviceBarProps {
  onConnectionChange: (connected: boolean, transport: 'webserial' | 'bridge' | 'simulation') => void;
  connected: boolean;
  transport: 'webserial' | 'bridge' | 'simulation';
  onSend: (command: string) => void;
}

export const DeviceBar: React.FC<DeviceBarProps> = ({
  onConnectionChange,
  connected,
  transport,
  onSend
}) => {
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<{ time: string; direction: 'sent' | 'received'; message: string }[]>([]);
  const { toast } = useToast();

  // Web Serial availability
  const webSerialAvailable = 'serial' in navigator && !!(navigator as any).serial;

  useEffect(() => {
    if (webSerialAvailable) {
      refreshPorts();
    }
  }, [webSerialAvailable]);

  const refreshPorts = async () => {
    if (!webSerialAvailable) return;
    
    try {
      const serial = (navigator as any).serial;
      const ports = await serial.getPorts();
      const portNames = ports.map((_, index) => `Serial Port ${index + 1}`);
      setAvailablePorts(portNames);
    } catch (error) {
      console.error('Failed to get ports:', error);
      setAvailablePorts([]);
    }
  };

  const requestDevice = async () => {
    if (!webSerialAvailable) {
      toast({
        title: "Web Serial Not Available",
        description: "Use Chrome/Edge on HTTPS for direct device connection",
        variant: "destructive"
      });
      return;
    }

    try {
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      await refreshPorts();
      setSelectedPort('Serial Port 1'); // Default to first port after request
      toast({
        title: "Device Granted",
        description: "Device access granted successfully",
      });
    } catch (error) {
      console.error('Device request failed:', error);
      toast({
        title: "Device Request Failed",
        description: "User cancelled or device not found",
        variant: "destructive"
      });
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedPort === 'simulation') {
        onConnectionChange(true, 'simulation');
        addLog('sent', 'Connected to simulation mode');
      } else if (selectedPort && webSerialAvailable) {
        onConnectionChange(true, 'webserial');
        addLog('sent', `Connected to ${selectedPort}`);
      } else {
        onConnectionChange(true, 'bridge');
        addLog('sent', 'Connected via bridge');
      }
      
      toast({
        title: "Connected",
        description: `Device connected via ${transport}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to device",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    onConnectionChange(false, transport);
    addLog('sent', 'Disconnected');
    toast({
      title: "Disconnected",
      description: "Device disconnected successfully",
    });
  };

  const addLog = (direction: 'sent' | 'received', message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), { time, direction, message }]);
  };

  // Expose addLog for external use
  React.useEffect(() => {
    (window as any).deviceBarAddLog = addLog;
    return () => {
      delete (window as any).deviceBarAddLog;
    };
  }, []);

  const getStatusDot = () => {
    if (isConnecting) {
      return <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />;
    }
    if (connected) {
      return <div className="w-2 h-2 rounded-full bg-success animate-pulse" />;
    }
    return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (connected) {
      switch (transport) {
        case 'webserial': return `Connected to ${selectedPort}`;
        case 'bridge': return 'Connected via Bridge';
        case 'simulation': return 'Simulation Mode';
        default: return 'Connected';
      }
    }
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Port/Device Selector */}
      <Select value={selectedPort} onValueChange={setSelectedPort}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select device..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="simulation">🎮 Simulation Mode</SelectItem>
          {webSerialAvailable ? (
            <>
              {availablePorts.map((port, index) => (
                <SelectItem key={index} value={port}>
                  <div className="flex items-center gap-2">
                    <Usb className="h-3 w-3" />
                    {port}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="request-new">
                ➕ Request New Device
              </SelectItem>
            </>
          ) : (
            <SelectItem value="bridge">🌐 Desktop Bridge</SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Request Device Button */}
      {selectedPort === 'request-new' && (
        <Button size="sm" variant="outline" onClick={requestDevice}>
          <Usb className="h-3 w-3 mr-1" />
          Request
        </Button>
      )}

      {/* Connect/Disconnect Button */}
      <Button
        size="sm"
        variant={connected ? "destructive" : "default"}
        onClick={connected ? disconnect : connect}
        disabled={isConnecting || (!selectedPort && selectedPort !== 'simulation')}
        className="gap-1"
      >
        {isConnecting ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : connected ? (
          <WifiOff className="h-3 w-3" />
        ) : (
          <Wifi className="h-3 w-3" />
        )}
        {isConnecting ? 'Connecting...' : connected ? 'Disconnect' : 'Connect'}
      </Button>

      {/* Refresh Button */}
      <Button size="sm" variant="ghost" onClick={refreshPorts}>
        <RefreshCw className="h-3 w-3" />
      </Button>

      {/* Status Badge */}
      <Badge variant="outline" className="gap-1">
        {getStatusDot()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>

      {/* Logs Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost">
            <FileText className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Communication Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No communication logs yet
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs flex gap-2">
                        <span className="text-muted-foreground min-w-fit">{log.time}</span>
                        <span className={cn(
                          "min-w-fit font-mono",
                          log.direction === 'sent' ? 'text-blue-400' : 'text-green-400'
                        )}>
                          {log.direction === 'sent' ? '→' : '←'}
                        </span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
};