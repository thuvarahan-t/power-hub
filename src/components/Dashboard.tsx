import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Gauge, 
  Battery, 
  Thermometer, 
  Activity,
  Power,
  Settings,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';
import { LiveChart } from '@/components/LiveChart';
import { ValueCard } from '@/components/ValueCard';
import { StatusIndicator } from '@/components/StatusIndicator';

interface TelemetryData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  mode: 'load' | 'charge' | 'standby';
  warnings: string[];
}

export const Dashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: Date.now(),
    voltage: 0,
    current: 0,
    power: 0,
    temperature: 25,
    mode: 'standby',
    warnings: []
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);
  const [chartTimeRange, setChartTimeRange] = useState('5min');

  // Simulate real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSimulating) {
        const time = Date.now();
        const baseVoltage = 5 + Math.sin(time / 5000) * 2;
        const baseCurrent = 500 + Math.sin(time / 3000) * 200;
        
        setTelemetry(prev => ({
          ...prev,
          timestamp: time,
          voltage: Math.max(0, baseVoltage + (Math.random() - 0.5) * 0.5),
          current: Math.max(0, baseCurrent + (Math.random() - 0.5) * 50),
          power: (baseVoltage * baseCurrent) / 1000,
          temperature: 25 + Math.sin(time / 8000) * 10 + (Math.random() - 0.5) * 2,
          warnings: Math.random() > 0.95 ? ['High temperature detected'] : []
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleExportData = () => {
    // TODO: Implement CSV export
    console.log('Exporting data...');
  };

  const getConnectionStatus = () => {
    if (isConnected) return { status: 'Connected', variant: 'default' as const };
    if (isSimulating) return { status: 'Simulating', variant: 'warning' as const };
    return { status: 'Disconnected', variant: 'destructive' as const };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent">
            Power Hub Control
          </h1>
          <p className="text-muted-foreground">
            Advanced power management and monitoring system
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <StatusIndicator 
            status={connectionStatus.status}
            variant={connectionStatus.variant}
          />
          
          <Button 
            variant="control" 
            size="sm"
            onClick={handleExportData}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Safety Banner */}
      {telemetry.warnings.length > 0 && (
        <div className="p-4 bg-gradient-warning/10 border border-warning/30 rounded-xl animate-pulse-glow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <h3 className="font-semibold text-warning">Safety Alert</h3>
              <p className="text-sm text-warning/80">{telemetry.warnings.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ValueCard
          title="Output Voltage"
          value={telemetry.voltage}
          unit="V"
          max={12}
          icon={Zap}
          type="voltage"
          trend="stable"
        />
        
        <ValueCard
          title="Output Current"
          value={telemetry.current}
          unit="mA"
          max={2000}
          icon={Activity}
          type="current"
          trend="increasing"
        />
        
        <ValueCard
          title="Power Output"
          value={telemetry.power}
          unit="W"
          max={24}
          icon={Power}
          type="power"
          trend="stable"
        />
        
        <ValueCard
          title="Temperature"
          value={telemetry.temperature}
          unit="°C"
          max={80}
          icon={Thermometer}
          type="temperature"
          trend="decreasing"
        />
      </div>

      {/* Mode and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="value-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Current Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Badge 
                variant={telemetry.mode === 'load' ? 'default' : 'secondary'}
                className="text-lg py-2 px-4"
              >
                {telemetry.mode.toUpperCase()}
              </Badge>
              
              <div className="grid grid-cols-2 gap-4">
                <Button variant="electric" size="sm">
                  Load Mode
                </Button>
                <Button variant="warning" size="sm">
                  Charge Mode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="value-card col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                System Status
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success">All Systems Normal</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Output Status:</span>
                <span className="ml-2 text-success font-mono">ENABLED</span>
              </div>
              <div>
                <span className="text-muted-foreground">Safety Status:</span>
                <span className="ml-2 text-success font-mono">OK</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Update:</span>
                <span className="ml-2 font-mono">{new Date(telemetry.timestamp).toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Uptime:</span>
                <span className="ml-2 font-mono">2h 34m 12s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Charts */}
      <Card className="value-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Live Telemetry
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                {['1min', '5min', '30min', '2hr'].map((range) => (
                  <Button
                    key={range}
                    variant={chartTimeRange === range ? "electric" : "ghost"}
                    size="sm"
                    onClick={() => setChartTimeRange(range)}
                    className="rounded-none border-0"
                  >
                    {range}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSimulating(!isSimulating)}
                className="gap-2"
              >
                {isSimulating ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LiveChart 
            telemetry={telemetry}
            timeRange={chartTimeRange}
            isActive={isSimulating}
          />
        </CardContent>
      </Card>
    </div>
  );
};