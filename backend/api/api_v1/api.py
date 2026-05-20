from fastapi import APIRouter
from api.api_v1.endpoints import users, conversations, parents, ws, auth, sessions, connections

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(parents.router, prefix="/parents", tags=["parents"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(connections.router, prefix="/connections", tags=["connections"])
api_router.include_router(ws.router, tags=["websockets"])
