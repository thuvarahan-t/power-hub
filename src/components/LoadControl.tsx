import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Activity, 
  Power, 
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadControlProps {
  onVoltageChange: (voltage: number) => void;
  onCurrentChange: (current: number) => void;
  onOutputToggle: (enabled: boolean) => void;
  currentVoltage: number;
  currentCurrent: number;
  outputEnabled: boolean;
}

export const LoadControl: React.FC<LoadControlProps> = ({
  onVoltageChange,
  onCurrentChange,
  onOutputToggle,
  currentVoltage,
  currentCurrent,
  outputEnabled
}) => {
  const [voltage, setVoltage] = useState(5.0);
  const [currentLimit, setCurrentLimit] = useState(1.0);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  const maxVoltage = 12;
  const maxCurrent = 2;

  const handleVoltageChange = (value: number[]) => {
    const newVoltage = value[0];
    setVoltage(newVoltage);
    onVoltageChange(newVoltage);
    
    // Show safety warning for high voltage
    if (newVoltage > 10) {
      setShowSafetyWarning(true);
    } else {
      setShowSafetyWarning(false);
    }
  };

  const handleCurrentChange = (value: number[]) => {
    const newCurrent = value[0];
    setCurrentLimit(newCurrent);
    onCurrentChange(newCurrent);
    
    // Show safety warning for high current
    if (newCurrent > 1.5) {
      setShowSafetyWarning(true);
    } else if (voltage <= 10) {
      setShowSafetyWarning(false);
    }
  };

  const handleOutputToggle = (enabled: boolean) => {
    if (enabled && (voltage > 10 || currentLimit > 1.5)) {
      // Show confirmation for high-risk settings
      const confirmed = window.confirm(
        `Warning: You are about to enable output with ${voltage > 10 ? 'high voltage' : ''} ${voltage > 10 && currentLimit > 1.5 ? 'and ' : ''} ${currentLimit > 1.5 ? 'high current' : ''}. Continue?`
      );
      if (!confirmed) return;
    }
    
    onOutputToggle(enabled);
  };

  const computedPower = voltage * currentLimit;
  const estimatedHeat = computedPower * 0.1; // Simple heat estimation

  const presets = [
    { name: '5V/1A', voltage: 5.0, current: 1.0, description: 'Standard USB' },
    { name: '9V/1.5A', voltage: 9.0, current: 1.5, description: 'Quick Charge' },
    { name: '12V/1A', voltage: 12.0, current: 1.0, description: 'Max Voltage' }
  ];

  const applyPreset = (preset: { voltage: number; current: number }) => {
    setVoltage(preset.voltage);
    setCurrentLimit(preset.current);
    onVoltageChange(preset.voltage);
    onCurrentChange(preset.current);
  };

  return (
    <div className="space-y-6">
      {/* Safety Warning */}
      {showSafetyWarning && (
        <Card className="border-warning/50 bg-gradient-warning/10 animate-pulse-glow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <h3 className="font-semibold text-warning">High Power Warning</h3>
                <p className="text-sm text-warning/80">
                  Settings exceed safe limits. Use caution when enabling output.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voltage Control */}
      <Card className="value-card voltage">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-electric" />
            Output Voltage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="voltage-slider" className="text-lg font-medium">
                Target Voltage
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-electric">
                  {voltage.toFixed(2)}
                </span>
                <span className="text-lg text-muted-foreground">V</span>
              </div>
            </div>
            
            <Slider
              id="voltage-slider"
              min={0}
              max={maxVoltage}
              step={0.1}
              value={[voltage]}
              onValueChange={handleVoltageChange}
              className="control-slider"
            />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0V</span>
              <span className="text-warning">Safety: 12V max</span>
              <span>12V</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="voltage-input">Manual Input</Label>
              <Input
                id="voltage-input"
                type="number"
                min={0}
                max={maxVoltage}
                step={0.1}
                value={voltage}
                onChange={(e) => handleVoltageChange([parseFloat(e.target.value) || 0])}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Output</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-lg font-bold font-mono text-electric">
                  {currentVoltage.toFixed(2)}V
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Control */}
      <Card className="value-card current">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-current" />
            Current Limit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="current-slider" className="text-lg font-medium">
                Maximum Current
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-current">
                  {currentLimit.toFixed(2)}
                </span>
                <span className="text-lg text-muted-foreground">A</span>
              </div>
            </div>
            
            <Slider
              id="current-slider"
              min={0}
              max={maxCurrent}
              step={0.1}
              value={[currentLimit]}
              onValueChange={handleCurrentChange}
              className="control-slider"
            />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0A</span>
              <span className="text-warning">Safety: 2A max</span>
              <span>2A</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current-input">Manual Input</Label>
              <Input
                id="current-input"
                type="number"
                min={0}
                max={maxCurrent}
                step={0.1}
                value={currentLimit}
                onChange={(e) => handleCurrentChange([parseFloat(e.target.value) || 0])}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Output</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-lg font-bold font-mono text-current">
                  {(currentCurrent / 1000).toFixed(3)}A
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Power & Heat Calculation */}
      <Card className="value-card power">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-power" />
            Power Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Computed Max Power</Label>
              <div className="text-3xl font-bold font-mono text-power">
                {computedPower.toFixed(2)} W
              </div>
              <p className="text-sm text-muted-foreground">
                V × I = {voltage.toFixed(1)}V × {currentLimit.toFixed(1)}A
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Estimated Heat</Label>
              <div className="text-3xl font-bold font-mono text-temperature">
                {estimatedHeat.toFixed(2)} W
              </div>
              <p className="text-sm text-muted-foreground">
                ~10% of total power
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => applyPreset(preset)}
              >
                <div className="font-bold">{preset.name}</div>
                <div className="text-sm text-muted-foreground">{preset.description}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Output Control */}
      <Card className={cn(
        'value-card border-2 transition-all',
        outputEnabled ? 'border-success/50 bg-success/5' : 'border-border'
      )}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Output Control</span>
            <Badge 
              variant={outputEnabled ? 'default' : 'secondary'}
              className="text-lg py-2 px-4"
            >
              {outputEnabled ? 'ENABLED' : 'DISABLED'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label className="text-lg">Enable Output</Label>
              <p className="text-sm text-muted-foreground">
                Activate power output with current settings
              </p>
            </div>
            
            <Switch
              checked={outputEnabled}
              onCheckedChange={handleOutputToggle}
              className="scale-150"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={outputEnabled ? "success" : "electric"}
              size="lg"
              onClick={() => handleOutputToggle(!outputEnabled)}
              className="gap-2"
            >
              {outputEnabled ? (
                <>
                  <Square className="h-5 w-5" />
                  Stop Output
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Soft Start
                </>
              )}
            </Button>
            
            <Button
              variant="warning"
              size="lg"
              disabled={!outputEnabled}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Stop
            </Button>
          </div>

          {outputEnabled && (
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-success">
                ⚡ Output is active. Monitor current and temperature closely.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};