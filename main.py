import threading
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import serial
import serial.tools.list_ports

class SerialState(BaseModel):
    connected: bool = False
    port: Optional[str] = None
    baudrate: int = 115200
    output_on: bool = False

class LatestValues(BaseModel):
    vout: float = 0.0
    iout: float = 0.0
    vin: float = 0.0

class ConnectRequest(BaseModel):
    port: str

class VoltageRequest(BaseModel):
    voltage: float

class CurrentRequest(BaseModel):
    current: int

# Serial manager with background read thread
class SerialManager:
    def __init__(self):
        self.ser: Optional[serial.Serial] = None
        self.state = SerialState()
        self.latest = LatestValues()
        self.last_raw: str = ""  # store last raw received line for diagnostics
        self.port_hwid: Optional[str] = None  # store hwid of connected port
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._reader_loop, daemon=True)
        self._thread.start()

    def list_ports(self) -> List[dict]:
        """Return detailed port info so frontend can distinguish real devices vs virtual/sim."""
        ports = serial.tools.list_ports.comports()
        return [{"device": p.device, "description": p.description, "hwid": p.hwid} for p in ports]

    def connect(self, port: str, baudrate: int = 115200):
        # Validate that the requested port is present in the system ports list.
        available = [p["device"] for p in self.list_ports()]
        if port not in available:
            raise RuntimeError(
                "Port not found in system ports — this may be a simulation/virtual URL. "
                "Call /ports and use one of the listed device names (e.g., COM3)."
            )
        if self.ser and self.ser.is_open:
            raise RuntimeError("Already connected")
        try:
            self.ser = serial.Serial(port, baudrate, timeout=1)
            self.state.connected = True
            self.state.port = port
            self.state.baudrate = baudrate
            # store hwid for later simulation detection
            for p in serial.tools.list_ports.comports():
                if p.device == port:
                    self.port_hwid = p.hwid
                    break
            return True
        except Exception as e:
            raise RuntimeError(f"Connection failed: {e}")

    def disconnect(self):
        if self.ser:
            try:
                self.ser.close()
            finally:
                self.ser = None
                self.state = SerialState()
        return True

    def send_raw(self, message: str):
        if not (self.ser and self.ser.is_open):
            raise RuntimeError("Serial port not connected")
        try:
            self.ser.write(message.encode())
        except Exception as e:
            raise RuntimeError(f"Write failed: {e}")

    def set_voltage(self, v: float):
        v = max(0.0, min(30.0, v))
        self.send_raw(f"V:{v:.2f}\n")

    def set_current(self, i: int):
        i = max(0, min(5000, int(i)))
        self.send_raw(f"I:{i}\n")

    def toggle_output(self):
        # toggle local state and send command
        new_state = not self.state.output_on
        self.send_raw(f"O:{1 if new_state else 0}\n")
        self.state.output_on = new_state
        return self.state.output_on

    def send_feedback(self):
        self.send_raw("F:1\n")

    def _reader_loop(self):
        while not self._stop_event.is_set():
            if self.ser and self.ser.is_open:
                try:
                    if self.ser.in_waiting > 0:
                        line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                        if line:
                            # save raw line for diagnostics
                            with self._lock:
                                self.last_raw = line
                            self._process_line(line)
                except Exception:
                    # swallow read errors to keep loop alive
                    pass
            time.sleep(0.05)

    def _process_line(self, data: str):
        # Expected formats:
        # "VOUT:0.01,IOUT:1.17,VIN:0.00" or single-value lines "VOUT:0.01"
        try:
            parts = [p.strip() for p in data.split(",")] if "," in data else [data.strip()]
            with self._lock:
                for part in parts:
                    if part.startswith("VOUT:"):
                        val = float(part.split(":")[1])
                        self.latest.vout = val
                    elif part.startswith("IOUT:"):
                        val = float(part.split(":")[1])
                        self.latest.iout = val
                    elif part.startswith("VIN:"):
                        val = float(part.split(":")[1])
                        self.latest.vin = val
            # optional: could log or print for debugging
        except Exception:
            pass

    def get_latest(self) -> LatestValues:
        with self._lock:
            return LatestValues(vout=self.latest.vout, iout=self.latest.iout, vin=self.latest.vin)

    def get_status(self) -> dict:
        """Return latest values plus diagnostics and connection state, with simulation flag."""
        with self._lock:
            port = self.state.port or ""
            last_raw = (self.last_raw or "").lower()
            # heuristics to detect a simulation/virtual port:
            looks_like_url = "://" in port.lower() or any(k in port.lower() for k in ("loop", "socket", "tcp"))
            hwid_bad = (self.port_hwid is None) or (str(self.port_hwid).strip().lower() in ("", "n/a"))
            raw_indicates_sim = any(k in last_raw for k in ("sim", "simulation"))
            is_simulation = (not self.state.connected) or looks_like_url or hwid_bad or raw_indicates_sim

            return {
                "vout": self.latest.vout,
                "iout": self.latest.iout,
                "vin": self.latest.vin,
                "last_raw": self.last_raw,
                "connected": self.state.connected,
                "port": self.state.port,
                "output_on": self.state.output_on,
                "is_simulation": is_simulation,
            }

    def shutdown(self):
        self._stop_event.set()
        try:
            if self.ser:
                self.ser.close()
        except Exception:
            pass

# FastAPI app
app = FastAPI(title="STM32 CDC Backend")

# Enable CORS for all origins (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

serial_mgr = SerialManager()

@app.on_event("shutdown")
def shutdown_event():
    serial_mgr.shutdown()

@app.get("/ports")
def list_ports():
    # return richer port info
    return {"ports": serial_mgr.list_ports()}

@app.post("/connect")
def connect(req: ConnectRequest):
    try:
        serial_mgr.connect(req.port)
        return {"connected": True, "port": req.port}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/disconnect")
def disconnect():
    try:
        serial_mgr.disconnect()
        return {"disconnected": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voltage")
def set_voltage(req: VoltageRequest):
    try:
        serial_mgr.set_voltage(req.voltage)
        return {"status": "ok", "voltage": round(req.voltage, 2)}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/current")
def set_current(req: CurrentRequest):
    try:
        serial_mgr.set_current(req.current)
        return {"status": "ok", "current": int(req.current)}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/toggle")
def toggle_output():
    try:
        new_state = serial_mgr.toggle_output()
        return {"output_on": new_state}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/feedback")
def request_feedback():
    try:
        serial_mgr.send_feedback()
        return {"status": "sent"}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/latest")
def latest_values():
    # include last raw line and port info for better diagnostics on frontend
    status = serial_mgr.get_status()
    return status