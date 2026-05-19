import asyncio
import websockets
import json

async def listen():
    url = "ws://localhost:8765"
    print(f"Connecting to {url}...")
    try:
        async with websockets.connect(url) as websocket:
            print("Connected successfully! Waiting for messages...")
            
            # Send initialize_engine message to wake it up
            await websocket.send(json.dumps({"type": "initialize_engine", "data": {}}))
            print("Sent initialize_engine event.")
            
            count = 0
            while count < 10:
                message = await websocket.recv()
                data = json.loads(message)
                msg_type = data.get("type")
                msg_data = data.get("data", {})
                
                print(f"\n[Message {count+1}] Type: {msg_type}")
                if msg_type == "hand_landmarks":
                    print(f"  Tracking Status: {msg_data.get('trackingStatus')}")
                    print(f"  Gesture: {msg_data.get('gesture')}")
                    print(f"  Landmarks: {len(msg_data.get('landmarks', []))} joints")
                    print(f"  Cursor: ({msg_data.get('cursorX')}, {msg_data.get('cursorY')})")
                    print(f"  Action State: {msg_data.get('actionState')}")
                else:
                    print(f"  Payload: {data}")
                count += 1
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(listen())
