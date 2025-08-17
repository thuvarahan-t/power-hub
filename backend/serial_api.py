from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import serial
import serial.tools.list_ports

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
)

ser = None

@app.get("/ports")
def list_ports():
    ports = serial.tools.list_ports.comports()
    return [port.device for port in ports]

@app.post("/connect")
async def connect_port(request: Request):
    data = await request.json()
    port = data.get("port")
    global ser
    try:
        ser = serial.Serial(port, 115200, timeout=1)
        return {"status": "connected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/set")
async def set_values(request: Request):
    data = await request.json()
    voltage = data.get("voltage")
    current = data.get("current")
    if ser and ser.is_open:
        ser.write(f"V:{voltage:.2f}\n".encode())
        ser.write(f"I:{int(current)}\n".encode())
        return {"status": "sent"}
    return {"status": "error", "message": "Serial not connected"}

@app.post("/toggle")
async def toggle_output(request: Request):
    data = await request.json()
    on = data.get("on")
    if ser and ser.is_open:
        ser.write(f"O:{1 if on else 0}\n".encode())
        return {"status": "sent"}
    return {"status": "error", "message": "Serial not connected"}

@app.post("/feedback")
async def send_feedback():
    if ser and ser.is_open:
        ser.write("F:1\n".encode())
        return {"status": "sent"}
    return {"status": "error", "message": "Serial not connected"}

@app.get("/read")
def read_serial():
    import logging
    logging.basicConfig(level=logging.DEBUG)
    if ser:
        logging.debug(f"Serial object: {ser}, is_open: {ser.is_open}, in_waiting: {getattr(ser, 'in_waiting', None)}")
    if ser and ser.is_open:
        if ser.in_waiting > 0:
            data = ser.readline().decode('utf-8').strip()
            logging.debug(f"Read data: {data}")
            return {"data": data}
        else:
            logging.debug("No data waiting in serial buffer.")
    else:
        logging.debug("Serial port not open.")
    return {"data": None}