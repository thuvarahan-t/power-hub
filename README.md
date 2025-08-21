# Power Hub

Web UI + FastAPI bridge to control and monitor an STM32 power supply/load over USB CDC.

## Stack
- Frontend: React, Vite, TypeScript, Tailwind (shadcn/ui)
- Backend: FastAPI + PySerial

## Features
- Connect to STM32, stream telemetry
- Live charts: Vin, Vout, Iout, Pout, Temperature (estimated if missing)
- Controls: set V/I, Soft Start, enable/disable output
- Export CSV/JSON/TXT

## Requirements
- Node.js 18+
- Python 3.9+
- An STM32 presenting a USB CDC serial device

## Setup
### Backend
```bash
python3 -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -U pip
pip install fastapi uvicorn pyserial
uvicorn backend.serial_api:app --host 0.0.0.0 --port 8000 --reload
```
Endpoints:
- GET /ports
- POST /connect {"port":"/dev/cu.usbmodemXXXX"}
- POST /disconnect
- POST /set {"voltage":5.0, "current":1.0} or {"voltage":5.0, "current_mA":1000}
- POST /toggle {"on":true}
- POST /feedback
- GET /read → latest telemetry JSON

Telemetry example:
```json
{
  "timestamp": 1737050000000,
  "voltage": 5.02,
  "current": 0.61,
  "power": 3.06,
  "temperature": 32.1,
  "inputVoltage": 12.05,
  "mode": "load",
  "warnings": []
}
```
Notes:
- inputVoltage from VIN (if sent). Temperature is estimated (25 + 2°C/W) if sensor missing (smoothed, 0–90°C cap).
- Backend periodically sends F:1 to request feedback frames.

### Frontend
```bash
npm install
npm run dev   # http://localhost:8080
```
Open the app, select your serial port in the header, and Connect.

## STM32 Protocol
- Setpoints: `V:5.00\n`, `I:1000\n` (mA)
- Output: `O:1\n` / `O:0\n`
- Feedback: `F:1\n`
- Telemetry lines (any): `VOUT:<V>,IOUT:<mA>,VIN:<V>[,TEMP:<C>]` or single-field variants

## Troubleshooting
- Port busy/address in use: stop previous server or change port.
- No data: check cables/permissions; verify device emits telemetry; see backend logs ([SERIAL], Parsed telemetry, [PING]).
- Scaling: ensure IOUT is mA on device; adjust your ADC scaling on STM32 as needed.

## Safety
High voltages/currents can be hazardous. Use appropriate safety practices.
