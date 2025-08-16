import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Smartphone, 
  Play,
  Square,
  Clock,
  Pause,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChargeMobileTabProps {
  currentVoltage: number;
  currentCurrent: number;
  onStartMobileCharge: (settings: MobileChargeSettings) => void;
  onStopMobileCharge: () => void;
  isMobileCharging: boolean;
}

interface MobileChargeSettings {
  name: string;
  voltage: number;
  current: number;
  durationSec: number;
}

export const ChargeMobileTab: React.FC<ChargeMobileTabProps> = ({
  currentVoltage,
  currentCurrent,
  onStartMobileCharge,
  onStopMobileCharge,
  isMobileCharging
}) => {
  const [mobileName, setMobileName] = useState('');
  const [voltage, setVoltage] = useState(5.0);
  const [currentLimit, setCurrentLimit] = useState(1.0);
  const [duration, setDuration] = useState(60); // minutes
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!isMobileCharging || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer finished
          onStopMobileCharge();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMobileCharging, isPaused, onStopMobileCharge]);

  const handleStartCharging = () => {
    const settings: MobileChargeSettings = {
      name: mobileName || 'Mobile Device',
      voltage: Math.min(5.0, voltage),
      current: Math.min(2.0, currentLimit),
      durationSec: duration * 60
    };
    
    setTimeRemaining(duration * 60);
    onStartMobileCharge(settings);
  };

  const handleStopCharging = () => {
    setShowStopConfirmation(true);
  };

  const confirmStop = () => {
    onStopMobileCharge();
    setShowStopConfirmation(false);
    setTimeRemaining(0);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? ((duration * 60 - timeRemaining) / (duration * 60)) * 100 : 0;

  const presetDurations = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mobile Configuration */}
        <Card className="value-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-success" />
              Mobile Device Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-success font-medium">
                Safe charging: Maximum 5V / 2A for mobile devices
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mobile-name">Device Name (Optional)</Label>
                <Input
                  id="mobile-name"
                  value={mobileName}
                  onChange={(e) => setMobileName(e.target.value)}
                  placeholder="e.g., iPhone 15, Samsung Galaxy"
                  disabled={isMobileCharging}
                />
              </div>

              <div>
                <Label htmlFor="mobile-voltage">Voltage (V)</Label>
                <Input
                  id="mobile-voltage"
                  type="number"
                  min={0}
                  max={5.0}
                  step={0.01}
                  value={voltage}
                  onChange={(e) => setVoltage(Math.min(5.0, parseFloat(e.target.value) || 5.0))}
                  className="font-mono"
                  disabled={isMobileCharging}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: 5.0V for mobile device safety
                </p>
              </div>

              <div>
                <Label htmlFor="mobile-current">Current Limit (A)</Label>
                <Input
                  id="mobile-current"
                  type="number"
                  min={0}
                  max={2.0}
                  step={0.01}
                  value={currentLimit}
                  onChange={(e) => setCurrentLimit(Math.min(2.0, parseFloat(e.target.value) || 1.0))}
                  className="font-mono"
                  disabled={isMobileCharging}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: 2.0A for device protection
                </p>
              </div>

              <div>
                <Label htmlFor="duration-select">Charging Duration</Label>
                <Select 
                  value={duration.toString()} 
                  onValueChange={(value) => setDuration(parseInt(value))}
                  disabled={isMobileCharging}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetDurations.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value.toString()}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-duration">Custom Duration (minutes)</Label>
                <Input
                  id="custom-duration"
                  type="number"
                  min={1}
                  max={360}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="font-mono"
                  disabled={isMobileCharging}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charging Status */}
        <Card className="value-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-electric" />
              Charging Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Readings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Output Voltage</Label>
                <div className="text-2xl font-bold font-mono text-electric">
                  {currentVoltage.toFixed(3)}V
                </div>
              </div>
              <div className="space-y-2">
                <Label>Output Current</Label>
                <div className="text-2xl font-bold font-mono text-current">
                  {currentCurrent.toFixed(3)}A
                </div>
              </div>
            </div>

            {/* Timer Display */}
            {isMobileCharging && (
              <>
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold font-mono text-primary">
                    {formatTime(timeRemaining)}
                  </div>
                  <Badge 
                    variant={isPaused ? 'warning' : 'default'} 
                    className="text-lg py-2 px-4"
                  >
                    {isPaused ? 'PAUSED' : 'CHARGING'}
                  </Badge>
                </div>

                {/* Progress Ring */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Progress</Label>
                    <span className="text-sm font-mono">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  {mobileName && (
                    <p>Charging: {mobileName}</p>
                  )}
                  <p>
                    {voltage.toFixed(2)}V / {currentLimit.toFixed(2)}A
                    {' • '}
                    Started {formatTime((duration * 60) - timeRemaining)} ago
                  </p>
                </div>
              </>
            )}

            {!isMobileCharging && (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ready to charge mobile device</p>
                <p className="text-sm">
                  Will charge at {voltage.toFixed(2)}V / {currentLimit.toFixed(2)}A for {duration} minutes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Power Analysis */}
      <Card className="value-card">
        <CardHeader>
          <CardTitle>Power Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Configured Power</Label>
              <div className="text-3xl font-bold font-mono text-power">
                {(voltage * currentLimit).toFixed(2)} W
              </div>
              <p className="text-sm text-muted-foreground">
                {voltage.toFixed(1)}V × {currentLimit.toFixed(1)}A
              </p>
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

            <div className="space-y-2">
              <Label>Energy Delivered</Label>
              <div className="text-3xl font-bold font-mono text-success">
                {((currentVoltage * currentCurrent * ((duration * 60 - timeRemaining) / 3600))).toFixed(2)} Wh
              </div>
              <p className="text-sm text-muted-foreground">
                Total energy so far
              </p>
            </div>
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
            {!isMobileCharging ? (
              <Button
                variant="success"
                size="lg"
                onClick={handleStartCharging}
                disabled={voltage <= 0 || currentLimit <= 0 || duration <= 0}
                className="gap-2 flex-1"
              >
                <Play className="h-5 w-5" />
                Start Charging
              </Button>
            ) : (
              <>
                <Button
                  variant={isPaused ? "success" : "warning"}
                  size="lg"
                  onClick={handlePauseResume}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-5 w-5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5" />
                      Pause
                    </>
                  )}
                </Button>
                
                <Button
                  variant="warning"
                  size="lg"
                  onClick={handleStopCharging}
                  className="gap-2 flex-1"
                >
                  <Square className="h-5 w-5" />
                  Stop Charging
                </Button>
              </>
            )}
            
            <Button
              variant="destructive"
              size="lg"
              disabled={!isMobileCharging}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Stop
            </Button>
          </div>

          {timeRemaining <= 0 && progressPercentage >= 100 && (
            <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-success font-medium">
                  Charging Complete! Timer has expired and output has been stopped.
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
            <AlertDialogTitle>Stop Mobile Charging?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop charging? {timeRemaining > 0 && (
                <>Time remaining: {formatTime(timeRemaining)}. </>
              )}
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