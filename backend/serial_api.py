from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import serial
import serial.tools.list_ports
import threading
import time
import logging
from typing import Optional, Dict, Any

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
)

ser: Optional[serial.Serial] = None
reader_thread: Optional[threading.Thread] = None
reader_stop_event = threading.Event()
telemetry_lock = threading.Lock()
feedback_thread: Optional[threading.Thread] = None
feedback_stop_event = threading.Event()

# Track last parsed telemetry and simple state
last_telemetry: Dict[str, Any] = {
    "timestamp": 0,
    "voltage": 0.0,      # VOUT in volts
    "current": 0.0,      # IOUT in amps
    "power": 0.0,        # computed W
    "temperature": 25.0, # default if not provided
    "inputVoltage": 0.0, # VIN in volts when provided
    "mode": "standby",
    "warnings": [],
}
output_on = False


def setup_logging() -> None:
    # Configure logging once
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(threadName)s] %(message)s",
    )


def parse_and_update_telemetry(line: str) -> None:
    global last_telemetry
    line = line.strip()
    if not line:
        return

    # Example formats:
    #   VOUT:0.01,IOUT:1.17,VIN:0.00
    #   VOUT:4.98
    #   IOUT:523.1  (mA)
    #   VIN:12.10
    try:
        parsed: Dict[str, float] = {}
        if "," in line:
            parts = [p.strip() for p in line.split(",") if p.strip()]
        else:
            parts = [line]

        for part in parts:
            if part.upper().startswith("VOUT:"):
                v_str = part.split(":", 1)[1].strip()
                parsed["VOUT"] = float(v_str)
            elif part.upper().startswith("IOUT:"):
                i_str = part.split(":", 1)[1].strip()
                # Treat IOUT from device as mA by convention from desktop app
                parsed["IOUT_mA"] = float(i_str)
            elif part.upper().startswith("VIN:"):
                vin_str = part.split(":", 1)[1].strip()
                parsed["VIN"] = float(vin_str)
            elif part.upper().startswith("TEMP:"):
                t_str = part.split(":", 1)[1].strip()
                parsed["TEMP"] = float(t_str)

        with telemetry_lock:
            # Start with current values, then update fields from parsed
            voltage_v = parsed.get("VOUT", float(last_telemetry.get("voltage", 0.0)))
            current_a = last_telemetry.get("current", 0.0)
            if "IOUT_mA" in parsed:
                current_a = float(parsed["IOUT_mA"]) / 1000.0
            input_voltage_v = float(parsed.get("VIN", float(last_telemetry.get("inputVoltage", 0.0))))

            # Temperature handling: if TEMP not provided, estimate from power with smoothing
            if "TEMP" in parsed:
                temperature_c = float(parsed["TEMP"])  # direct from device
            else:
                prev_temp = float(last_telemetry.get("temperature", 25.0))
                power_w = float(voltage_v) * float(current_a)
                # Simple thermal model: ambient 25C + gain * power, low-pass filtered
                target_temp = 25.0 + 2.0 * power_w  # 2 C per Watt as heuristic
                # Smooth approach to avoid jumps
                alpha = 0.2  # smoothing factor
                temperature_c = max(0.0, min(90.0, prev_temp + alpha * (target_temp - prev_temp)))

            last_telemetry.update(
                {
                    "timestamp": int(time.time() * 1000),
                    "voltage": float(voltage_v),
                    "current": float(current_a),
                    "power": float(voltage_v) * float(current_a),
                    "temperature": float(temperature_c),
                    "inputVoltage": float(input_voltage_v),
                    "mode": "load" if output_on else "standby",
                    # We keep warnings empty by default
                    "warnings": last_telemetry.get("warnings", []),
                }
            )

        logging.info(f"Parsed telemetry: {last_telemetry}")
    except Exception as exc:
        logging.exception(f"Failed to parse line '{line}': {exc}")


def reader_loop() -> None:
    logging.info("Serial reader thread started")
    while not reader_stop_event.is_set():
        try:
            if ser and ser.is_open and getattr(ser, "in_waiting", 0) > 0:
                raw = ser.readline()
                try:
                    line = raw.decode("utf-8", errors="ignore").strip()
                except Exception:
                    line = str(raw)
                if line:
                    logging.info(f"[SERIAL] {line}")
                    parse_and_update_telemetry(line)
            else:
                time.sleep(0.05)
        except Exception as exc:
            logging.exception(f"Reader loop error: {exc}")
            time.sleep(0.2)
    logging.info("Serial reader thread stopped")


def feedback_loop(period_ms: int = 500) -> None:
    logging.info("Feedback pinger thread started")
    next_ts = time.time() * 1000.0
    while not feedback_stop_event.is_set():
        try:
            if ser and ser.is_open:
                cmd = "F:1\n"
                ser.write(cmd.encode())
                logging.debug("[PING] F:1")
            # sleep until next period
            now_ms = time.time() * 1000.0
            next_ts += period_ms
            sleep_ms = max(0.0, next_ts - now_ms)
            time.sleep(sleep_ms / 1000.0)
        except Exception as exc:
            logging.exception(f"Feedback loop error: {exc}")
            time.sleep(0.5)
    logging.info("Feedback pinger thread stopped")

@app.get("/ports")
def list_ports():
    ports = serial.tools.list_ports.comports()
    return [port.device for port in ports]

@app.post("/connect")
async def connect_port(request: Request):
    data = await request.json()
    port = data.get("port")
    global ser, reader_thread, feedback_thread, output_on
    try:
        setup_logging()
        # Close any existing port
        if ser and ser.is_open:
            try:
                ser.close()
            except Exception:
                pass
        # Reset state
        with telemetry_lock:
            last_telemetry.update({
                "timestamp": int(time.time() * 1000),
                "voltage": 0.0,
                "current": 0.0,
                "power": 0.0,
                "temperature": 25.0,
                "mode": "standby",
                "warnings": [],
            })
        output_on = False

        ser = serial.Serial(port, 115200, timeout=1)

        # Start reader thread
        if reader_thread is None or not reader_thread.is_alive():
            reader_stop_event.clear()
            reader_t = threading.Thread(target=reader_loop, name="serial-reader", daemon=True)
            reader_t.start()
            reader_thread = reader_t

        # Start feedback pinger thread
        if feedback_thread is None or not feedback_thread.is_alive():
            feedback_stop_event.clear()
            fb_t = threading.Thread(target=feedback_loop, name="feedback-pinger", daemon=True)
            fb_t.start()
            feedback_thread = fb_t

        logging.info(f"Connected to {port}")
        return {"status": "connected", "port": port}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/disconnect")
async def disconnect_port():
    global ser
    try:
        reader_stop_event.set()
        feedback_stop_event.set()
        if ser and ser.is_open:
            ser.close()
        logging.info("Serial disconnected")
        return {"status": "disconnected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/set")
async def set_values(request: Request):
    data = await request.json()
    voltage = data.get("voltage")
    current = data.get("current")
    current_mA = data.get("current_mA")
    if current_mA is None and current is not None:
        # Assume provided current is in Amps; convert to mA for device
        try:
            current_mA = int(float(current) * 1000)
        except Exception:
            current_mA = None

    if ser and ser.is_open:
        if voltage is not None:
            cmd_v = f"V:{float(voltage):.2f}\n"
            ser.write(cmd_v.encode())
            logging.info(f"[SEND] {cmd_v.strip()}")
        if current_mA is not None:
            cmd_i = f"I:{int(current_mA)}\n"
            ser.write(cmd_i.encode())
            logging.info(f"[SEND] {cmd_i.strip()}")
        return {"status": "sent"}
    return {"status": "error", "message": "Serial not connected"}

@app.post("/toggle")
async def toggle_output(request: Request):
    data = await request.json()
    on = data.get("on")
    global output_on
    if ser and ser.is_open:
        output_on = bool(on)
        cmd = f"O:{1 if output_on else 0}\n"
        ser.write(cmd.encode())
        logging.info(f"[SEND] {cmd.strip()}")
        return {"status": "sent", "on": output_on}
    return {"status": "error", "message": "Serial not connected"}

@app.post("/feedback")
async def send_feedback():
    if ser and ser.is_open:
        cmd = "F:1\n"
        ser.write(cmd.encode())
        logging.info(f"[SEND] {cmd.strip()}")
        return {"status": "sent"}
    return {"status": "error", "message": "Serial not connected"}

@app.get("/read")
def read_serial():
    """Return the most recent parsed telemetry as JSON that the frontend expects."""
    with telemetry_lock:
        if last_telemetry.get("timestamp", 0) == 0:
            # No data yet; return zeros to keep frontend happy
            return {
                "timestamp": int(time.time() * 1000),
                "voltage": 0.0,
                "current": 0.0,
                "power": 0.0,
                "temperature": 25.0,
                "mode": "standby",
                "warnings": [],
            }
        return last_telemetry