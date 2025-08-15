import React, { useState, useEffect } from 'react';
import { PowerHubHeader } from '@/components/PowerHubHeader';
import { TabNavigation } from '@/components/TabNavigation';
import { LoadOutputTab } from '@/components/tabs/LoadOutputTab';
import { ChargeBatteryTab } from '@/components/tabs/ChargeBatteryTab';
import { ChargeMobileTab } from '@/components/tabs/ChargeMobileTab';
import { LiveChart } from '@/components/LiveChart';
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
    inputPower: [] as number[],
    outputPower: [] as number[],
    outputVoltage: [] as number[],
    outputCurrent: [] as number[]
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

      // Update sparkline data
      setSparklineData(prev => ({
        inputPower: [...prev.inputPower.slice(-59), power * 1.1].slice(-60),
        outputPower: [...prev.outputPower.slice(-59), power].slice(-60),
        outputVoltage: [...prev.outputVoltage.slice(-59), newTelemetry.voltage].slice(-60),
        outputCurrent: [...prev.outputCurrent.slice(-59), newTelemetry.current].slice(-60)
      }));
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
      <PowerHubHeader
        connectionStatus={connectionStatus}
        metrics={metrics}
        sparklineData={sparklineData}
        onExport={handleExport}
        onSettings={handleSettings}
      />
      
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="container mx-auto">
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

        {/* Live Charts */}
        <div className="p-6">
          <Card className="value-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Live Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveChart 
                telemetry={telemetry}
                timeRange="5min"
                isActive={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;