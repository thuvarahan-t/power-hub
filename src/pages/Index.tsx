import React, { useEffect, useRef, useState } from "react";
import { PowerHubHeader } from "@/components/PowerHubHeader";
import { TabNavigation } from "@/components/TabNavigation";
import { LoadOutputTab } from "@/components/tabs/LoadOutputTab";
import { ChargeBatteryTab } from "@/components/tabs/ChargeBatteryTab";
import { ChargeMobileTab } from "@/components/tabs/ChargeMobileTab";
import { LiveChart } from "@/components/LiveChart";
import { SparklineChart } from "@/components/SparklineChart";
import { BarChart } from "@/components/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TelemetryFooter } from "@/components/TelemetryFooter";

type Transport = "webserial" | "bridge" | "simulation";

interface TelemetryData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  mode: "load" | "charge" | "standby";
  warnings: string[];
  simulated?: boolean;
  inputVoltage?: number;
}

interface ChargingSettings {
  profile: "liion_hv";
  vmax: number;
  imax: number;
  itermPct: number;
  timeoutMin: number;
  capacity_mAh: number;
}

interface MobileChargeSettings {
  name?: string;
  voltage: number;
  current: number;
  durationSec: number;
}

const Index: React.FC = () => {
  // UI state
  const [activeTab, setActiveTab] = useState<"load" | "battery" | "mobile">("load");
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [isMobileCharging, setIsMobileCharging] = useState(false);
  const [timeRange, setTimeRange] = useState<"1min" | "5min" | "30min" | "2hr">("5min");
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<Transport>("simulation");
  const { toast } = useToast();

  // Active output mode enforcement (only one at a time)
  const [activeOutputMode, setActiveOutputMode] = useState<"load" | "battery" | "mobile" | null>(null);
  const [currentBatterySettings, setCurrentBatterySettings] = useState<ChargingSettings | null>(null);
  const [currentMobileSettings, setCurrentMobileSettings] = useState<MobileChargeSettings | null>(null);

  // user-configured targets for "load" mode
  const [targetVoltage, setTargetVoltage] = useState<number>(5.0);
  const [targetCurrent, setTargetCurrent] = useState<number>(1.0);

  // telemetry & sparklines
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    timestamp: Date.now(),
    voltage: 0,
    current: 0,
    power: 0,
    temperature: 25,
    mode: "standby",
    warnings: [],
    simulated: true,
  });

  const [sparklineData, setSparklineData] = useState({
    inputPower: Array(60).fill(0),
    outputPower: Array(60).fill(0),
    outputVoltage: Array(60).fill(0),
    outputCurrent: Array(60).fill(0),
  });

  // refs for intervals/flags
  const simIntervalRef = useRef<number | null>(null);
  const inputRampRef = useRef<number | null>(null);
  const firstRealReceivedRef = useRef(false);
  const lastInputValueRef = useRef<number>(0);

  // polling ref for backend 500ms reads after soft-start / output enabled
  const pollingRef = useRef<number | null>(null);

  // Helper: compute setpoint Pin for current active mode when not connected
  const computeActivePin = (): number => {
    if (activeOutputMode === "load") return Number((targetVoltage * targetCurrent).toFixed(3));
    if (activeOutputMode === "battery" && currentBatterySettings) {
      return Number((currentBatterySettings.vmax * currentBatterySettings.imax).toFixed(3));
    }
    if (activeOutputMode === "mobile" && currentMobileSettings) {
      return Number((currentMobileSettings.voltage * currentMobileSettings.current).toFixed(3));
    }
    return 0;
  };

  // Ramp helpers: smooth interpolation to avoid graph discontinuities
  const readLastInputValue = () => lastInputValueRef.current ?? sparklineData.inputPower[sparklineData.inputPower.length - 1] ?? 0;

  const startInputPowerRamp = (targetPin: number, steps = 12, stepMs = 60) => {
    if (inputRampRef.current) {
      window.clearInterval(inputRampRef.current);
      inputRampRef.current = null;
    }
    const startVal = readLastInputValue();
    const delta = targetPin - startVal;
    let stepIndex = 0;
    inputRampRef.current = window.setInterval(() => {
      stepIndex += 1;
      const fraction = Math.min(1, stepIndex / steps);
      const value = Number((startVal + delta * fraction).toFixed(3));
      lastInputValueRef.current = value;
      setSparklineData((prev) => ({
        ...prev,
        inputPower: [...prev.inputPower.slice(-59), value].slice(-60),
      }));
      if (fraction >= 1 && inputRampRef.current) {
        window.clearInterval(inputRampRef.current);
        inputRampRef.current = null;
      }
    }, stepMs);
  };

  const rampDownInputPower = () => {
    startInputPowerRamp(0);
  };

  // requestStart/stopActiveOutput enforce single active mode
  const requestStart = (mode: "load" | "battery" | "mobile", settings?: any) => {
    if (activeOutputMode && activeOutputMode !== mode) {
      toast({
        title: "Stop previous output first",
        description: `Active output: ${activeOutputMode}. Stop it before starting ${mode}.`,
        variant: "destructive",
      });
      return false;
    }
    setActiveOutputMode(mode);
    if (mode === "battery" && settings) setCurrentBatterySettings(settings);
    if (mode === "mobile" && settings) setCurrentMobileSettings(settings);
    if (mode === "load") setOutputEnabled(true);
    return true;
  };

  const stopActiveOutput = () => {
    if (!activeOutputMode) return;
    const prev = activeOutputMode;
    setActiveOutputMode(null);
    if (prev === "load") {
      setOutputEnabled(false);
      rampDownInputPower();
      // stop polling when load output stops
      stopBackendPolling();
    } else if (prev === "battery") {
      setIsCharging(false);
      setCurrentBatterySettings(null);
    } else if (prev === "mobile") {
      setIsMobileCharging(false);
      setCurrentMobileSettings(null);
      setOutputEnabled(false);
    }
    toast({ title: "Output stopped", description: `Stopped ${prev} output.` });
  };

  // Start polling backend every 500ms for measured telemetry.
  // Adjust endpoint '/api/device/telemetry' to match your backend.
  const startBackendPolling = () => {
    // avoid duplicate polling
    if (pollingRef.current) return;
    pollingRef.current = window.setInterval(async () => {
      try {
    const res = await fetch('http://localhost:8000/read', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        // Basic validation and mapping into TelemetryData shape
        if (!data) return;
        const newTelemetry: TelemetryData = {
          timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
          voltage: Number(data.voltage ?? 0),
          current: Number(data.current ?? 0),
          power: Number(data.power ?? (Number(data.voltage ?? 0) * Number(data.current ?? 0))),
          temperature: Number(data.temperature ?? telemetry.temperature),
          mode: (data.mode === 'charge' ? 'charge' : data.mode === 'load' ? 'load' : 'standby'),
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
          simulated: false,
          inputVoltage: Number(data.inputVoltage ?? 0)
        };

        // push the telemetry into state
        setTelemetry(newTelemetry);

        const usingRealDevice = connected && transport !== 'simulation';

        // On first real sample: stop sim and seed buffers for smooth transition
        if (!firstRealReceivedRef.current) {
          firstRealReceivedRef.current = true;
          if (simIntervalRef.current) {
            window.clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
          }
          const inputVal = Number(((newTelemetry.inputVoltage ?? newTelemetry.voltage) as number).toFixed(3));
          setSparklineData({
            inputPower: Array(60).fill(inputVal),
            outputPower: Array(60).fill(Number(newTelemetry.power.toFixed(3))),
            outputVoltage: Array(60).fill(Number(newTelemetry.voltage.toFixed(3))),
            outputCurrent: Array(60).fill(Number(newTelemetry.current.toFixed(3))),
          });
          lastInputValueRef.current = inputVal;
          return;
        }

        // Subsequent samples: append to buffers, including input voltage
        setSparklineData(prev => ({
          ...prev,
          inputPower: [...prev.inputPower.slice(-59), Number(((newTelemetry.inputVoltage ?? newTelemetry.voltage) as number).toFixed(3))].slice(-60),
          outputPower: [...prev.outputPower.slice(-59), Number(newTelemetry.power.toFixed(3))].slice(-60),
          outputVoltage: [...prev.outputVoltage.slice(-59), Number(newTelemetry.voltage.toFixed(3))].slice(-60),
          outputCurrent: [...prev.outputCurrent.slice(-59), Number(newTelemetry.current.toFixed(3))].slice(-60)
        }));
      } catch (e) {
        // silent failure; polling will continue
        // optionally: console.debug('telemetry poll failed', e);
      }
    }, 500);
  };

  const stopBackendPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Device telemetry listener (real device should dispatch CustomEvent('device-telemetry', { detail: TelemetryData }))
  useEffect(() => {
    const onDeviceTelemetry = (ev: Event) => {
      const ce = ev as CustomEvent<TelemetryData>;
      if (!ce?.detail) return;
      const newTelemetry = { ...ce.detail, simulated: false };
      setTelemetry(newTelemetry);

      const usingRealDevice = connected && transport !== "simulation";

      // On first real sample after connection, fill buffers with the real value for smoothness
      if (usingRealDevice && !firstRealReceivedRef.current) {
        firstRealReceivedRef.current = true;

        // Stop simulator immediately so it doesn't overwrite real data
        if (simIntervalRef.current) {
          window.clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }

        const inputVal = (newTelemetry.power ?? newTelemetry.voltage * newTelemetry.current) * 1.05;
        setSparklineData({
          inputPower: Array(60).fill(Number(inputVal.toFixed(3))),
          outputPower: Array(60).fill(Number((newTelemetry.power ?? newTelemetry.voltage * newTelemetry.current).toFixed(3))),
          outputVoltage: Array(60).fill(Number(newTelemetry.voltage.toFixed(3))),
          outputCurrent: Array(60).fill(Number(newTelemetry.current.toFixed(3))),
        });
        lastInputValueRef.current = Number(inputVal.toFixed(3));
        return;
      }

      // Normal push - DO NOT overwrite inputPower (it's driven by user/start logic)
      setSparklineData((prev) => ({
        ...prev,
        outputPower: [...prev.outputPower.slice(-59), Number((newTelemetry.power ?? newTelemetry.voltage * newTelemetry.current).toFixed(3))].slice(-60),
        outputVoltage: [...prev.outputVoltage.slice(-59), Number(newTelemetry.voltage.toFixed(3))].slice(-60),
        outputCurrent: [...prev.outputCurrent.slice(-59), Number(newTelemetry.current.toFixed(3))].slice(-60),
      }));
    };

    window.addEventListener("device-telemetry", onDeviceTelemetry as EventListener);
    return () => window.removeEventListener("device-telemetry", onDeviceTelemetry as EventListener);
  }, [connected, transport]);

  // Simulator loop: runs only when NOT using a real device OR until the first real sample arrives.
  useEffect(() => {
    // keep simulator running until a real telemetry sample is received
    const shouldRunSim = !(connected && transport !== "simulation" && firstRealReceivedRef.current === true);

    // clear any previous
    if (simIntervalRef.current) {
      window.clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (!shouldRunSim) return;

    simIntervalRef.current = window.setInterval(() => {
      const time = Date.now();
      // smooth deterministic simulation, but inputPower is controlled by user/start logic
      const baseVoltage = outputEnabled ? 5 + Math.sin(time / 5000) * 1.5 : 0;
      const baseCurrent = outputEnabled ? 0.6 + Math.cos(time / 3000) * 0.12 : 0;
      const power = Number((baseVoltage * baseCurrent).toFixed(3));

      const simulatedTelemetry: TelemetryData = {
        timestamp: time,
        voltage: Number(Math.max(0, baseVoltage + Math.sin(time / 7000) * 0.02).toFixed(3)),
        current: Number(Math.max(0, baseCurrent + Math.cos(time / 6000) * 0.01).toFixed(4)),
        power,
        temperature: Number((25 + Math.sin(time / 8000) * 4).toFixed(2)),
        mode: outputEnabled ? "load" : "standby",
        warnings: [],
        simulated: true,
      };

      setTelemetry(simulatedTelemetry);

      // Update sparkline buffers: inputPower should follow active mode setpoint when output enabled; otherwise remain last value
      const targetPin = computeActivePin();
      const inputValue = outputEnabled ? targetPin : readLastInputValue();
      lastInputValueRef.current = inputValue;

      setSparklineData((prev) => {
        const timeFactor = time / 1000;
        const outputPowerValue = outputEnabled
          ? Number((power + Math.sin(timeFactor * 1.5) * 0.2).toFixed(3))
          : Number((Math.sin(timeFactor * 0.3) * 0.05).toFixed(3));
        const outputVoltageValue = simulatedTelemetry.voltage;
        const outputCurrentValue = simulatedTelemetry.current;

        return {
          inputPower: [...prev.inputPower.slice(-59), Number(inputValue.toFixed(3))].slice(-60),
          outputPower: [...prev.outputPower.slice(-59), outputPowerValue].slice(-60),
          outputVoltage: [...prev.outputVoltage.slice(-59), outputVoltageValue].slice(-60),
          outputCurrent: [...prev.outputCurrent.slice(-59), outputCurrentValue].slice(-60),
        };
      });
    }, 1000);

    return () => {
      if (simIntervalRef.current) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputEnabled, isCharging, connected, transport, targetVoltage, targetCurrent, activeOutputMode]);

  // Cleanup ramp interval on unmount
  useEffect(() => {
    return () => {
      if (inputRampRef.current) {
        window.clearInterval(inputRampRef.current);
        inputRampRef.current = null;
      }
      if (simIntervalRef.current) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  // Connection handler forwarded from header/devicebar
  const handleConnectionChange = (connectedFlag: boolean, tr: Transport) => {
    setConnected(connectedFlag);
    setTransport(tr);
    if (connectedFlag && tr !== "simulation") {
      firstRealReceivedRef.current = false; // wait for first real sample
      // start polling immediately upon real device connection
      startBackendPolling();
    } else {
      // stop polling when disconnected or switched to simulation
      stopBackendPolling();
    }
    // simulation-theme: show red when disconnected OR explicit simulation selected
    const showSimulationTheme = !connectedFlag || tr === "simulation";
    document.documentElement.classList.toggle("simulation-mode", showSimulationTheme);
  };

  // Handlers for control changes
  const handleVoltageChange = (voltage: number) => {
    setTargetVoltage(voltage);
    // if output active in load mode, ramp to new pin
    if (activeOutputMode === "load" && outputEnabled) {
      const pin = Number((voltage * targetCurrent).toFixed(3));
      startInputPowerRamp(pin);
    }
    console.log("Setting voltage:", voltage);

    // If connected to real device, send to backend (amps -> mA handled server-side)
    if (connected && transport !== 'simulation') {
      fetch('http://localhost:8000/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voltage })
      }).catch(() => {});
    }
  };

  const handleCurrentChange = (current: number) => {
    setTargetCurrent(current);
    if (activeOutputMode === "load" && outputEnabled) {
      const pin = Number((targetVoltage * current).toFixed(3));
      startInputPowerRamp(pin);
    }
    console.log("Setting current:", current);

    if (connected && transport !== 'simulation') {
      fetch('http://localhost:8000/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current })
      }).catch(() => {});
    }
  };

  const handleOutputToggle = (enabled: boolean) => {
    if (enabled) {
      const ok = requestStart("load");
      if (!ok) return;
      setOutputEnabled(true);
      const pin = computeActivePin();
      startInputPowerRamp(pin);
      toast({ title: "Output Enabled", description: "Power output is now active" });
      if (connected && transport !== 'simulation') {
    fetch('http://localhost:8000/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: true }) }).catch(() => {});
      }
    } else {
      // disable load output
      if (activeOutputMode === "load") stopActiveOutput();
      else {
        setOutputEnabled(false);
        rampDownInputPower();
      }
      toast({ title: "Output Disabled", description: "Power output has been stopped" });
      if (connected && transport !== 'simulation') {
    fetch('http://localhost:8000/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: false }) }).catch(() => {});
      }
    }
  };

  const handleSoftStart = () => {
    toast({ title: "Soft Start Initiated", description: "Gradually ramping up to target voltage and current" });
    const ok = requestStart("load");
    if (!ok) return;
    const pin = computeActivePin();
    setOutputEnabled(true);
    startInputPowerRamp(pin);

    // start backend polling to get measured voltage/current every 0.5s
    startBackendPolling();

    if (connected && transport !== 'simulation') {
      fetch('http://localhost:8000/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: true }) }).catch(() => {});
      fetch('http://localhost:8000/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voltage: targetVoltage, current: targetCurrent }) }).catch(() => {});
    }
  };

  const handleStartCharging = (settings: ChargingSettings) => {
    const ok = requestStart("battery", settings);
    if (!ok) return;
    setIsCharging(true);
    setActiveTab("battery");
    toast({ title: "Battery Charging Started", description: `Li-ion HV charging at ${settings.vmax}V / ${settings.imax}A` });
    // set inputPin and ramp if necessary
    const pin = Number((settings.vmax * settings.imax).toFixed(3));
    startInputPowerRamp(pin);
  };

  const handleStopCharging = () => {
    stopActiveOutput();
    toast({ title: "Charging Stopped", description: "Output disabled and set to 0V / 0A" });
  };

  const handleStartMobileCharge = (settings: MobileChargeSettings) => {
    const ok = requestStart("mobile", settings);
    if (!ok) return;
    setIsMobileCharging(true);
    setOutputEnabled(true);
    setActiveTab("mobile");
    setCurrentMobileSettings(settings);
    toast({ title: "Mobile Charging Started", description: `${settings.name || "Mobile device"} charging at ${settings.voltage}V / ${settings.current}A` });
    const pin = Number((settings.voltage * settings.current).toFixed(3));
    startInputPowerRamp(pin);
  };

  const handleStopMobileCharge = () => {
    stopActiveOutput();
    toast({ title: "Mobile Charging Stopped", description: "Timer expired or manually stopped. Output set to 0V / 0A" });
  };

  const handleSend = (command: string) => {
    if ((window as any).deviceBarAddLog) (window as any).deviceBarAddLog("sent", command);
    console.log("Sending command:", command);
  };

  const handleExport = () => toast({ title: "Exporting Data", description: "CSV export feature coming soon" });
  const handleSettings = () => toast({ title: "Settings", description: "Settings panel coming soon" });

  // displayed metrics logic: prefer recent real telemetry when available,
  // otherwise use active mode setpoints (or zeros when no active mode).
  const now = Date.now();
  const telemetryRecent = telemetry && typeof telemetry.timestamp === 'number' && (now - telemetry.timestamp) < 5000; // 5s freshness window
  const hasRealTelemetry = telemetry.simulated === false && telemetryRecent;

  const displayedMetrics = (() => {
    // Prefer recent real telemetry immediately when available
    if (hasRealTelemetry) {
      return {
        inputPower: (telemetry.inputVoltage ?? 0),
        outputPower: telemetry.power,
        outputVoltage: telemetry.voltage,
        outputCurrent: telemetry.current,
      };
    }

    // If no recent real telemetry, fall back to setpoints or zeros

    // No real device: if no active mode, show zeros
    if (!activeOutputMode) {
      return { inputPower: 0, outputPower: 0, outputVoltage: 0, outputCurrent: 0 };
    }

    // Not using real device => show setpoints for the active mode
    if (activeOutputMode === "load") {
      return {
        inputPower: 12.0,
        outputPower: Number((targetVoltage * targetCurrent).toFixed(3)),
        outputVoltage: targetVoltage,
        outputCurrent: targetCurrent,
      };
    }

    if (activeOutputMode === "battery" && currentBatterySettings) {
      return {
        inputPower: 12.0,
        outputPower: Number((currentBatterySettings.vmax * currentBatterySettings.imax).toFixed(3)),
        outputVoltage: currentBatterySettings.vmax,
        outputCurrent: currentBatterySettings.imax,
      };
    }

    if (activeOutputMode === "mobile" && currentMobileSettings) {
      return {
        inputPower: 12.0,
        outputPower: Number((currentMobileSettings.voltage * currentMobileSettings.current).toFixed(3)),
        outputVoltage: currentMobileSettings.voltage,
        outputCurrent: currentMobileSettings.current,
      };
    }

    return { inputPower: 0, outputPower: 0, outputVoltage: 0, outputCurrent: 0 };
  })();

  const connectionStatus = {
    backend: "connected" as const,
    // show "connected" only when we have recent real telemetry, otherwise show "simulating"
    device: hasRealTelemetry ? ("connected" as const) : ("simulating" as const),
  };

  // Render
  return (
    <div className="min-h-screen bg-background">
      <PowerHubHeader
        connectionStatus={connectionStatus}
        metrics={{
          inputPower: displayedMetrics.inputPower,
          outputPower: displayedMetrics.outputPower,
          outputVoltage: displayedMetrics.outputVoltage,
          outputCurrent: displayedMetrics.outputCurrent,
        }}
        sparklineData={sparklineData as any}
        telemetry={telemetry}
        onExport={handleExport}
        onSettings={handleSettings}
        onSend={handleSend}
        connected={connected}
        transport={transport}
        onConnectionChange={handleConnectionChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-[20%_80%] h-[calc(100vh-56px)] overflow-hidden">
        <aside className="min-h-0 overflow-y-auto border-r bg-card/40 p-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Input Voltage (Vin)</div>
            <div className="text-2xl font-bold font-mono text-electric">
              {displayedMetrics.inputPower?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">V</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <SparklineChart data={sparklineData.inputPower} color="#3b82f6" height={50} />
            </div>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Power (Pout)</div>
            <div className="text-2xl font-bold font-mono text-power">
              {displayedMetrics.outputPower?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">W</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <SparklineChart data={sparklineData.outputPower} color="hsl(var(--power-color))" height={50} />
            </div>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Voltage (Vout)</div>
            <div className="text-2xl font-bold font-mono text-electric">
              {displayedMetrics.outputVoltage?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">V</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <SparklineChart data={sparklineData.outputVoltage} color="hsl(var(--voltage-color))" height={50} />
            </div>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Output Current (Iout)</div>
            <div className="text-2xl font-bold font-mono text-current">
              {displayedMetrics.outputCurrent?.toFixed(2)}
              <span className="text-lg text-muted-foreground ml-1">A</span>
            </div>
            <div className="border border-dashed border-muted-foreground/30 rounded p-1">
              <SparklineChart data={sparklineData.outputCurrent} color="hsl(var(--current-color))" height={50} />
            </div>
          </Card>
        </aside>

        <main className="min-w-0 min-h-0 overflow-y-auto">
          <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4">
            <TabNavigation activeTab={activeTab} onTabChange={(t) => setActiveTab(t as any)} />
          </div>

          <div className="p-6 space-y-6">
            {activeTab === "load" && (
              <LoadOutputTab
                outputEnabled={outputEnabled}
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onVoltageChange={handleVoltageChange}
                onCurrentChange={handleCurrentChange}
                onOutputToggle={handleOutputToggle}
                onSoftStart={handleSoftStart}
                connected={connected}
                onSend={handleSend}
              />
            )}

            {activeTab === "battery" && (
              <ChargeBatteryTab
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onStartCharging={handleStartCharging}
                onStopCharging={handleStopCharging}
                isCharging={isCharging}
              />
            )}

            {activeTab === "mobile" && (
              <ChargeMobileTab
                currentVoltage={telemetry.voltage}
                currentCurrent={telemetry.current}
                onStartMobileCharge={handleStartMobileCharge}
                onStopMobileCharge={handleStopMobileCharge}
                isMobileCharging={isMobileCharging}
              />
            )}

            <Card className="value-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Live Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 280 }}>
                  <LiveChart telemetry={telemetry} timeRange={timeRange} onTimeRangeChange={setTimeRange} isActive={true} mode={activeOutputMode ?? undefined} />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <TelemetryFooter
        inputVoltage={displayedMetrics.inputPower ?? null}
        outputVoltage={displayedMetrics.outputVoltage}
        outputCurrent={displayedMetrics.outputCurrent}
        connected={connected}
      />
    </div>
  );
};

export default Index;