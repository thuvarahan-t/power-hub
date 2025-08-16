import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Zap, 
  Activity, 
  Play,
  Square,
  Plus,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Preset {
  id: string;
  name: string;
  voltage: number;
  current: number;
}

interface LoadOutputTabProps {
  outputEnabled: boolean;
  currentVoltage: number;
  currentCurrent: number;
  onVoltageChange: (voltage: number) => void;
  onCurrentChange: (current: number) => void;
  onOutputToggle: (enabled: boolean) => void;
  onSoftStart: () => void;
}

export const LoadOutputTab: React.FC<LoadOutputTabProps> = ({
  outputEnabled,
  currentVoltage,
  currentCurrent,
  onVoltageChange,
  onCurrentChange,
  onOutputToggle,
  onSoftStart
}) => {
  const [voltage, setVoltage] = useState(5.0);
  const [currentLimit, setCurrentLimit] = useState(1.0);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([
    { id: '1', name: '5V/1A USB', voltage: 5.0, current: 1.0 },
    { id: '2', name: '9V/1.5A QC', voltage: 9.0, current: 1.5 },
    { id: '3', name: '12V/1A Max', voltage: 12.0, current: 1.0 }
  ]);
  const [newPresetName, setNewPresetName] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);

  const maxVoltage = 12;
  const maxCurrent = 2;

  const handleVoltageChange = (value: number[]) => {
    const newVoltage = Math.min(maxVoltage, Math.max(0, value[0]));
    setVoltage(newVoltage);
    onVoltageChange(newVoltage);
    checkSafetyLimits(newVoltage, currentLimit);
  };

  const handleCurrentChange = (value: number[]) => {
    const newCurrent = Math.min(maxCurrent, Math.max(0, value[0]));
    setCurrentLimit(newCurrent);
    onCurrentChange(newCurrent);
    checkSafetyLimits(voltage, newCurrent);
  };

  const checkSafetyLimits = (v: number, i: number) => {
    setShowSafetyWarning(v > 10 || i > 1.5);
  };

  const handleOutputToggle = (enabled: boolean) => {
    if (enabled && (voltage > 10 || currentLimit > 1.5)) {
      setShowConfirmation(true);
      return;
    }
    onOutputToggle(enabled);
  };

  const confirmHighPowerOutput = () => {
    onOutputToggle(true);
    setShowConfirmation(false);
  };

  const applyPreset = (preset: Preset) => {
    setVoltage(preset.voltage);
    setCurrentLimit(preset.current);
    onVoltageChange(preset.voltage);
    onCurrentChange(preset.current);
    checkSafetyLimits(preset.voltage, preset.current);
  };

  const addPreset = () => {
    if (newPresetName.trim()) {
      const newPreset: Preset = {
        id: Date.now().toString(),
        name: newPresetName.trim(),
        voltage,
        current: currentLimit
      };
      setPresets([...presets, newPreset]);
      setNewPresetName('');
      setShowAddPreset(false);
    }
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  const computedPower = voltage * currentLimit;

  return (
    <div className="space-y-6">
      {/* Safety Warning */}
      {showSafetyWarning && (
        <Card className="border-warning/50 bg-gradient-warning/10 animate-pulse">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage Control */}
        <Card className="value-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-electric" />
              Voltage Control
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
                step={0.01}
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

            <div>
              <Label htmlFor="voltage-input">Manual Input</Label>
              <Input
                id="voltage-input"
                type="number"
                min={0}
                max={maxVoltage}
                step={0.01}
                value={voltage}
                onChange={(e) => handleVoltageChange([parseFloat(e.target.value) || 0])}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Control */}
        <Card className="value-card">
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
                step={0.01}
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

            <div>
              <Label htmlFor="current-input">Manual Input</Label>
              <Input
                id="current-input"
                type="number"
                min={0}
                max={maxCurrent}
                step={0.01}
                value={currentLimit}
                onChange={(e) => handleCurrentChange([parseFloat(e.target.value) || 0])}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
              variant="electric"
              size="lg"
              onClick={onSoftStart}
              disabled={outputEnabled}
              className="gap-2"
            >
              <Play className="h-5 w-5" />
              Soft Start
            </Button>
            
            <Button
              variant={outputEnabled ? "warning" : "secondary"}
              size="lg"
              onClick={() => onOutputToggle(!outputEnabled)}
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
                  Start Output
                </>
              )}
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

      {/* Presets */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Quick Presets
            <Dialog open={showAddPreset} onOpenChange={setShowAddPreset}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Preset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Settings as Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="e.g., Arduino 5V"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Will save: {voltage.toFixed(2)}V / {currentLimit.toFixed(2)}A
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={addPreset} disabled={!newPresetName.trim()}>
                      Save Preset
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPreset(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="border border-border rounded-lg p-4 space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold">{preset.name}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePreset(preset.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {preset.voltage}V / {preset.current}A
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="w-full"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Power Analysis */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle>Power Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Label>Current Output</Label>
              <div className="text-2xl font-bold font-mono text-electric">
                {currentVoltage.toFixed(2)} V
              </div>
              <div className="text-2xl font-bold font-mono text-current">
                {currentCurrent.toFixed(3)} A
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actual Power</Label>
              <div className="text-3xl font-bold font-mono text-power">
                {(currentVoltage * currentCurrent).toFixed(2)} W
              </div>
              <p className="text-sm text-muted-foreground">
                Live measurement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              High Power Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to enable output with {voltage > 10 ? 'high voltage' : ''} 
              {voltage > 10 && currentLimit > 1.5 ? ' and ' : ''} 
              {currentLimit > 1.5 ? 'high current' : ''}. 
              Current settings: {voltage.toFixed(2)}V / {currentLimit.toFixed(2)}A ({computedPower.toFixed(2)}W)
              
              <br /><br />
              Please ensure proper safety precautions are in place before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmHighPowerOutput} className="bg-warning hover:bg-warning/90">
              Enable Output
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};