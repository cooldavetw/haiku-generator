"""Test-only: the mock service as Segma serves it, under a stripped URL prefix.

Traefik strips the prefix and segma_fastapi's ForwardedPrefixMiddleware turns
it back into the ASGI root_path. This does the same for one fixed prefix.
"""

from mock_service import app as service

PREFIX = "/fastapi-prod/7/api"


async def app(scope, receive, send):
    if scope["type"] in ("http", "websocket"):
        path = scope["path"]
        if path != PREFIX and not path.startswith(PREFIX + "/"):
            await send({"type": "http.response.start", "status": 404, "headers": []})
            await send({"type": "http.response.body", "body": b""})
            return
        path = path if path != PREFIX else PREFIX + "/"
        scope = {**scope, "root_path": PREFIX, "path": path, "raw_path": path.encode()}
    await service(scope, receive, send)
