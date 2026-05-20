from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
from typing import Dict, List

router = APIRouter()


class ConnectionManager:
    """
    Production-grade WebSocket manager with per-user mapping.
    Supports both AI practice sessions (legacy) and real-time
    guardian access notifications for students.
    """

    def __init__(self):
        # General pool (for backward compat with AI practice WS)
        self.active_connections: List[WebSocket] = []
        # Per-user notification sockets: user_id -> list of open sockets
        self.user_sockets: Dict[int, List[WebSocket]] = {}

    # ── General (AI Practice) ────────────────────────────────────────────────

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    # ── Per-User Notification Sockets ────────────────────────────────────────

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = []
        self.user_sockets[user_id].append(websocket)

    def disconnect_user(self, user_id: int, websocket: WebSocket):
        if user_id in self.user_sockets:
            try:
                self.user_sockets[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]

    async def broadcast_to_user(self, user_id: int, payload: dict):
        """Send a JSON notification to all open sockets for a given user."""
        if user_id in self.user_sockets:
            message = json.dumps(payload)
            dead = []
            for ws in list(self.user_sockets[user_id]):
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect_user(user_id, ws)


# Singleton instance shared across all endpoints
manager = ConnectionManager()


# ── AI Practice WebSocket (legacy, unchanged) ────────────────────────────────

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                user_msg = json.loads(data)
                text = user_msg.get("text", "")
            except Exception:
                text = data

            await asyncio.sleep(1.5)

            response_data = {
                "sender": "ai",
                "text": f"I hear you! You said: '{text}'. How does that make you feel?",
                "confidence_score": 85.0,
            }
            await manager.send_personal_message(json.dumps(response_data), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Per-User Notification WebSocket ─────────────────────────────────────────

@router.websocket("/ws/notify/{user_id}")
async def notification_websocket(websocket: WebSocket, user_id: int):
    """
    Students (and guardians) connect here to receive real-time push notifications.
    Client just needs to keep the connection open — server will push JSON events.
    """
    await manager.connect_user(user_id, websocket)
    try:
        while True:
            # Keep-alive: accept and discard any pings from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(user_id, websocket)
