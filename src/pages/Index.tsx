import React, { useState, useEffect } from 'react';
import { PowerHubHeader } from '@/components/PowerHubHeader';
import { TabNavigation } from '@/components/TabNavigation';
import { LoadOutputTab } from '@/components/tabs/LoadOutputTab';
import { ChargeBatteryTab } from '@/components/tabs/ChargeBatteryTab';
import { ChargeMobileTab } from '@/components/tabs/ChargeMobileTab';
import { LiveChart } from '@/components/LiveChart';
import { SparklineChart } from '@/components/SparklineChart';
import { BarChart } from '@/components/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TelemetryData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  mode: 'load' | 'charge' | 'standby';
  warnings: string[];
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('load');
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [isMobileCharging, setIsMobileCharging] = useState(false);
  const [timeRange, setTimeRange] = useState('5min');
  const { toast } = useToast();
  
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: Date.now(),
    voltage: 0,
    current: 0,
    power: 0,
    temperature: 25,
    mode: 'standby',
    warnings: []
  });

  const [sparklineData, setSparklineData] = useState({
    inputPower: Array(60).fill(0).map(() => Math.random() * 2 + 1), // Initialize with some random values
    outputPower: Array(60).fill(0).map(() => Math.random() * 2), 
    outputVoltage: Array(60).fill(0).map(() => Math.random() * 3 + 2),
    outputCurrent: Array(60).fill(0).map(() => Math.random() * 0.5 + 0.1)
  });

  // Simulate real-time telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now();
      const baseVoltage = outputEnabled ? 5 + Math.sin(time / 5000) * 2 : 0;
      const baseCurrent = outputEnabled ? 0.5 + Math.sin(time / 3000) * 0.2 : 0;
      const power = baseVoltage * baseCurrent;
      
      const newTelemetry = {
        timestamp: time,
        voltage: Math.max(0, baseVoltage + (Math.random() - 0.5) * 0.1),
        current: Math.max(0, baseCurrent + (Math.random() - 0.5) * 0.05),
        power: power,
        temperature: 25 + Math.sin(time / 8000) * 10 + (Math.random() - 0.5) * 2,
        mode: (isCharging ? 'charge' : outputEnabled ? 'load' : 'standby') as 'load' | 'charge' | 'standby',
        warnings: Math.random() > 0.98 ? ['High temperature detected'] : []
      };

      setTelemetry(newTelemetry);

      // Update sparkline data with more dramatic changes for better visualization
      setSparklineData(prev => {
        const timeFactor = time / 1000; // Time factor for more dynamic changes
        
        // Create more dynamic simulated values
        const inputPowerValue = outputEnabled 
          ? Math.max(0.5, power * 1.1 + Math.sin(timeFactor * 2) * 0.5 + (Math.random() - 0.5) * 0.3)
          : Math.max(0.1, Math.sin(timeFactor * 0.5) * 0.3 + (Math.random() - 0.5) * 0.1);
        
        const outputPowerValue = outputEnabled
          ? Math.max(0, power + Math.sin(timeFactor * 1.5) * 0.4 + (Math.random() - 0.5) * 0.2)
          : Math.max(0, Math.sin(timeFactor * 0.3) * 0.2 + (Math.random() - 0.5) * 0.1);
        
        const outputVoltageValue = outputEnabled
          ? Math.max(0.5, newTelemetry.voltage + Math.sin(timeFactor * 1.8) * 0.3 + (Math.random() - 0.5) * 0.15)
          : Math.max(0.1, Math.sin(timeFactor * 0.4) * 0.5 + (Math.random() - 0.5) * 0.1);
        
        const outputCurrentValue = outputEnabled
          ? Math.max(0.05, newTelemetry.current + Math.sin(timeFactor * 2.2) * 0.2 + (Math.random() - 0.5) * 0.1)
          : Math.max(0.01, Math.sin(timeFactor * 0.6) * 0.1 + (Math.random() - 0.5) * 0.05);

        return {
          inputPower: [...prev.inputPower.slice(-59), inputPowerValue].slice(-60),
          outputPower: [...prev.outputPower.slice(-59), outputPowerValue].slice(-60),
          outputVoltage: [...prev.outputVoltage.slice(-59), outputVoltageValue].slice(-60),
          outputCurrent: [...prev.outputCurrent.slice(-59), outputCurrentValue].slice(-60)
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [outputEnabled, isCharging]);

  // Handle voltage/current changes
  const handleVoltageChange = (voltage: number) => {
    // TODO: Send to backend
    console.log('Setting voltage:', voltage);
  };

  const handleCurrentChange = (current: number) => {
    // TODO: Send to backend
    console.log('Setting current:', current);
  };

  const handleOutputToggle = (enabled: boolean) => {
    setOutputEnabled(enabled);
    toast({
      title: enabled ? "Output Enabled" : "Output Disabled",
      description: enabled ? "Power output is now active" : "Power output has been stopped",
    });
  };

  const handleSoftStart = () => {
    toast({
      title: "Soft Start Initiated",
      description: "Gradually ramping up to target voltage and current",
    });
    setOutputEnabled(true);
  };

  const handleStartCharging = (settings: any) => {
    setIsCharging(true);
    setActiveTab('battery');
    toast({
      title: "Battery Charging Started",
      description: `Li-ion HV charging at ${settings.vmax}V / ${settings.imax}A`,
    });
  };

  const handleStopCharging = () => {
    setIsCharging(false);
    setOutputEnabled(false);
    toast({
      title: "Charging Stopped",
      description: "Output disabled and set to 0V / 0A",
    });
  };

  const handleStartMobileCharge = (settings: any) => {
    setIsMobileCharging(true);
    setOutputEnabled(true);
    toast({
      title: "Mobile Charging Started",
      description: `${settings.name || 'Mobile device'} charging at ${settings.voltage}V / ${settings.current}A`,
    });
  };

  const handleStopMobileCharge = () => {
    setIsMobileCharging(false);
    setOutputEnabled(false);
    toast({
      title: "Mobile Charging Stopped",
      description: "Timer expired or manually stopped. Output set to 0V / 0A",
    });
  };

  const handleExport = () => {
    toast({
      title: "Exporting Data",
      description: "CSV export feature coming soon",
    });
  };

  const handleSettings = () => {
    toast({
      title: "Settings",
      description: "Settings panel coming soon",
    });
  };

  const connectionStatus = {
    backend: 'connected' as const,
    device: 'simulating' as const
  };

  const metrics = {
    inputPower: telemetry.power * 1.1,
    outputPower: telemetry.power,
    outputVoltage: telemetry.voltage,
    outputCurrent: telemetry.current
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <PowerHubHeader
        connectionStatus={connectionStatus}
        metrics={metrics}
        sparklineData={sparklineData}
        telemetry={telemetry}
        onExport={handleExport}
        onSettings={handleSettings}
      />

      {/* Viewport-bounded grid wrapper with independent scrolling */}
      <div className="grid grid-cols-1 md:grid-cols-[20%_80%] h-[calc(100vh-56px)] overflow-hidden">
        {/* Left sidebar: output metric boxes */}
        <aside className="min-h-0 overflow-y-auto border-r bg-card/40 p-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Input Power (Pin)</div>
            <div className="text-2xl font-bold font-mono text-electric">
              {metrics.inputPower?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">W</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <SparklineChart 
                data={sparklineData.inputPower} 
                color="#3b82f6" 
                height={50}
              />
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Power (Pout)</div>
            <div className="text-2xl font-bold font-mono text-power">
              {metrics.outputPower?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">W</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <BarChart 
                data={sparklineData.outputPower} 
                color="#f59e0b" 
                height={50}
              />
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Voltage (Vout)</div>
            <div className="text-2xl font-bold font-mono text-electric">
              {metrics.outputVoltage?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">V</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <BarChart 
                data={sparklineData.outputVoltage} 
                color="#10b981" 
                height={50}
              />
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Current (Iout)</div>
            <div className="text-2xl font-bold font-mono text-current">
              {metrics.outputCurrent?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">A</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <BarChart 
                data={sparklineData.outputCurrent} 
                color="#ef4444" 
                height={50}
              />
            </div>
          </Card>
        </aside>

        {/* Main content area: navigation tabs and content */}
        <main className="min-w-0 min-h-0 overflow-y-auto">
          {/* Navigation tabs at the top of main content */}
          <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Tab content */}
          <div className="p-6 space-y-6">
            {activeTab === 'load' && (
              <LoadOutputTab
                outputEnabled={outputEnabled}
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onVoltageChange={handleVoltageChange}
                onCurrentChange={handleCurrentChange}
                onOutputToggle={handleOutputToggle}
                onSoftStart={handleSoftStart}
              />
            )}
            {activeTab === 'battery' && (
              <ChargeBatteryTab
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onStartCharging={handleStartCharging}
                onStopCharging={handleStopCharging}
                isCharging={isCharging}
              />
            )}
            {activeTab === 'mobile' && (
              <ChargeMobileTab
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onStartMobileCharge={handleStartMobileCharge}
                onStopMobileCharge={handleStopMobileCharge}
                isMobileCharging={isMobileCharging}
              />
            )}

            {/* Live Charts with explicit height */}
            <Card className="value-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Live Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 280 }}>
                  <LiveChart
                    telemetry={telemetry}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    isActive={true}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;