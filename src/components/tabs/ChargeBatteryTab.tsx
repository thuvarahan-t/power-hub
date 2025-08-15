import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Battery, 
  Play,
  Square,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ChargingPhase = 'idle' | 'precheck' | 'cc' | 'cv' | 'done' | 'fault';

interface ChargeBatteryTabProps {
  currentVoltage: number;
  currentCurrent: number;
  onStartCharging: (settings: ChargingSettings) => void;
  onStopCharging: () => void;
  isCharging: boolean;
}

interface ChargingSettings {
  profile: 'liion_hv';
  vmax: number;
  imax: number;
  itermPct: number;
  timeoutMin: number;
  capacity_mAh: number;
}

export const ChargeBatteryTab: React.FC<ChargeBatteryTabProps> = ({
  currentVoltage,
  currentCurrent,
  onStartCharging,
  onStopCharging,
  isCharging
}) => {
  const [capacity, setCapacity] = useState(2000);
  const [targetVoltage, setTargetVoltage] = useState(4.35);
  const [chargeCurrent, setChargeCurrent] = useState(1.0);
  const [termThreshold, setTermThreshold] = useState(3);
  const [timeout, setTimeout] = useState(180);
  const [phase, setPhase] = useState<ChargingPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [deliveredCapacity, setDeliveredCapacity] = useState(0);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

  // Auto-calculate recommended charge current (0.5C)
  useEffect(() => {
    const recommendedCurrent = (capacity / 1000) * 0.5;
    setChargeCurrent(Math.min(2.0, Math.max(0.1, recommendedCurrent)));
  }, [capacity]);

  // Simulate charging phases and progress
  useEffect(() => {
    if (!isCharging) {
      setPhase('idle');
      setProgress(0);
      setDeliveredCapacity(0);
      return;
    }

    const interval = setInterval(() => {
      setDeliveredCapacity(prev => {
        const newDelivered = prev + (currentCurrent * 1000 / 3600); // mAh per second
        const soc = Math.min(99, (newDelivered / capacity) * 100);
        setProgress(soc);

        // Update charging phase based on conditions
        if (currentVoltage < 3.0) {
          setPhase('precheck');
        } else if (currentVoltage < targetVoltage * 0.95) {
          setPhase('cc');
        } else if (currentCurrent > chargeCurrent * (termThreshold / 100)) {
          setPhase('cv');
        } else {
          setPhase('done');
        }

        // Estimate time remaining
        const remainingCapacity = capacity - newDelivered;
        const avgCurrent = phase === 'cv' ? currentCurrent * 0.7 : chargeCurrent * 1000;
        setTimeRemaining(Math.max(0, (remainingCapacity / avgCurrent) * 3600));

        return newDelivered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCharging, currentVoltage, currentCurrent, capacity, chargeCurrent, targetVoltage, termThreshold, phase]);

  const handleStartCharging = () => {
    const settings: ChargingSettings = {
      profile: 'liion_hv',
      vmax: targetVoltage,
      imax: chargeCurrent,
      itermPct: termThreshold,
      timeoutMin: timeout,
      capacity_mAh: capacity
    };
    onStartCharging(settings);
    setPhase('precheck');
  };

  const handleStopCharging = () => {
    setShowStopConfirmation(true);
  };

  const confirmStop = () => {
    onStopCharging();
    setShowStopConfirmation(false);
    setPhase('idle');
  };

  const getPhaseInfo = (phase: ChargingPhase) => {
    switch (phase) {
      case 'idle':
        return { label: 'Ready to Charge', color: 'text-muted-foreground', bg: 'bg-muted' };
      case 'precheck':
        return { label: 'Pre-check', color: 'text-warning', bg: 'bg-warning' };
      case 'cc':
        return { label: 'Constant Current', color: 'text-electric', bg: 'bg-electric' };
      case 'cv':
        return { label: 'Constant Voltage', color: 'text-success', bg: 'bg-success' };
      case 'done':
        return { label: 'Charging Complete', color: 'text-success', bg: 'bg-success' };
      case 'fault':
        return { label: 'Fault', color: 'text-destructive', bg: 'bg-destructive' };
      default:
        return { label: 'Unknown', color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const estimatedFullTime = (capacity / (chargeCurrent * 1000)) * 1.2 * 3600; // seconds

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Battery Configuration */}
        <Card className="value-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-warning" />
              Li-ion HV Battery Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning font-medium">
                Chemistry: Li-ion High Voltage (3.8V nominal, 4.35V full)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="capacity">Battery Capacity (mAh) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={100}
                  max={10000}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1000)}
                  className="font-mono"
                  disabled={isCharging}
                />
              </div>

              <div>
                <Label htmlFor="target-voltage">Target Voltage (Vmax)</Label>
                <Input
                  id="target-voltage"
                  type="number"
                  min={3.0}
                  max={4.35}
                  step={0.01}
                  value={targetVoltage}
                  onChange={(e) => setTargetVoltage(Math.min(4.35, parseFloat(e.target.value) || 4.35))}
                  className="font-mono"
                  disabled={isCharging}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: 4.35V for Li-ion HV
                </p>
              </div>

              <div>
                <Label htmlFor="charge-current">Charge Current (A)</Label>
                <Input
                  id="charge-current"
                  type="number"
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={chargeCurrent}
                  onChange={(e) => setChargeCurrent(Math.min(2.0, parseFloat(e.target.value) || 0.5))}
                  className="font-mono"
                  disabled={isCharging}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: {((capacity / 1000) * 0.5).toFixed(1)}A (0.5C)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="term-threshold">Termination (%)</Label>
                  <Input
                    id="term-threshold"
                    type="number"
                    min={1}
                    max={10}
                    value={termThreshold}
                    onChange={(e) => setTermThreshold(parseInt(e.target.value) || 3)}
                    className="font-mono"
                    disabled={isCharging}
                  />
                </div>

                <div>
                  <Label htmlFor="timeout">Timeout (min)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={60}
                    max={480}
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value) || 180)}
                    className="font-mono"
                    disabled={isCharging}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charging Status */}
        <Card className="value-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-electric" />
              Charging Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Readings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Battery Voltage</Label>
                <div className="text-2xl font-bold font-mono text-electric">
                  {currentVoltage.toFixed(3)}V
                </div>
              </div>
              <div className="space-y-2">
                <Label>Charge Current</Label>
                <div className="text-2xl font-bold font-mono text-current">
                  {currentCurrent.toFixed(3)}A
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Charge Progress</Label>
                <span className="text-sm font-mono">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Capacity Progress */}
            <div className="space-y-2">
              <Label>Delivered Capacity</Label>
              <div className="text-lg font-mono">
                {deliveredCapacity.toFixed(0)} / {capacity} mAh
              </div>
            </div>

            {/* Time Estimates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Estimated Full Time</Label>
                <div className="font-mono">~{formatTime(estimatedFullTime)}</div>
              </div>
              <div>
                <Label>Time Remaining</Label>
                <div className="font-mono">~{formatTime(timeRemaining)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charging State Machine */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle>Charging State Machine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {(['precheck', 'cc', 'cv', 'done'] as ChargingPhase[]).map((p, index) => {
              const phaseInfo = getPhaseInfo(p);
              const isActive = phase === p;
              const isCompleted = ['precheck', 'cc', 'cv', 'done'].indexOf(phase) > index;
              
              return (
                <React.Fragment key={p}>
                  <div className="flex flex-col items-center space-y-2">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive && "border-primary bg-primary/20 animate-pulse",
                      isCompleted && "border-success bg-success/20",
                      !isActive && !isCompleted && "border-muted bg-muted/20"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-success" />
                      ) : (
                        <span className="text-sm font-bold">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <Badge 
                      variant={isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {phaseInfo.label}
                    </Badge>
                  </div>
                  {index < 3 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 transition-all",
                      isCompleted ? "bg-success" : "bg-muted"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="text-center">
            <Badge variant={phase === 'idle' ? 'secondary' : 'default'} className="text-lg py-2 px-4">
              {getPhaseInfo(phase).label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle>Charging Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {!isCharging ? (
              <Button
                variant="success"
                size="lg"
                onClick={handleStartCharging}
                disabled={!capacity || capacity < 100}
                className="gap-2 flex-1"
              >
                <Play className="h-5 w-5" />
                Start Charging
              </Button>
            ) : (
              <Button
                variant="warning"
                size="lg"
                onClick={handleStopCharging}
                className="gap-2 flex-1"
              >
                <Square className="h-5 w-5" />
                Stop Charging
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="lg"
              disabled={!isCharging}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Stop
            </Button>
          </div>

          {phase === 'done' && (
            <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-success font-medium">
                  Charging Complete! Battery is fully charged.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={showStopConfirmation} onOpenChange={setShowStopConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Charging?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop the charging process? The battery is currently at {progress.toFixed(1)}% charge.
              Output will be disabled and voltage/current will be set to 0V/0A.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStopConfirmation(false)}>
              Continue Charging
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStop} className="bg-warning hover:bg-warning/90">
              Stop Charging
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};