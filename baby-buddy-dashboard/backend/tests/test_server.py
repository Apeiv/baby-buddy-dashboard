import json

import httpx
import pytest

import backend.server as server_mod


@pytest.fixture
def app_client(monkeypatch):
    """An in-process ASGI client for the FastAPI app with server.http_client swapped for a
    MockTransport-backed client, so proxy routes never touch a real Baby Buddy instance."""
    calls = []

    def bb_handler(request: httpx.Request) -> httpx.Response:
        calls.append({"method": request.method, "path": request.url.path, "params": dict(request.url.params)})
        if request.url.path == "/api/children/":
            return httpx.Response(200, json={"results": [{"id": 1, "first_name": "Emma"}]})
        if request.url.path == "/api/notes/5/":
            return httpx.Response(200, json={"id": 5, "note": "hello"})
        return httpx.Response(200, json={"results": []})

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(bb_handler), base_url="http://fake-baby-buddy")
    monkeypatch.setattr(server_mod, "http_client", mock_client)

    transport = httpx.ASGITransport(app=server_mod.app)
    client = httpx.AsyncClient(transport=transport, base_url="http://testserver")
    client.calls = calls
    return client


async def test_get_config_returns_settings_without_secrets():
    transport = httpx.ASGITransport(app=server_mod.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/config")
    assert res.status_code == 200
    body = res.json()
    assert "refresh_interval" in body
    assert "demo_mode" in body
    assert "unit_system" in body
    assert "baby_buddy_api_key" not in json.dumps(body)


async def test_proxy_baby_buddy_forwards_get_request(app_client):
    async with app_client as client:
        res = await client.get("/api/baby-buddy/children/")
    assert res.status_code == 200
    assert res.json()["results"][0]["first_name"] == "Emma"
    assert client.calls[0] == {"method": "GET", "path": "/api/children/", "params": {}}


async def test_proxy_baby_buddy_forwards_query_params(app_client):
    async with app_client as client:
        res = await client.get("/api/baby-buddy/medication/", params={"child": "1", "limit": "30"})
    assert res.status_code == 200
    assert client.calls[0]["params"] == {"child": "1", "limit": "30"}


async def test_proxy_baby_buddy_forwards_delete(app_client):
    async with app_client as client:
        res = await client.delete("/api/baby-buddy/notes/5/")
    assert res.status_code == 200
    assert client.calls[0]["method"] == "DELETE"
    assert client.calls[0]["path"] == "/api/notes/5/"


async def test_proxy_baby_buddy_connect_error_returns_502(monkeypatch):
    def failing_handler(request: httpx.Request):
        raise httpx.ConnectError("boom", request=request)

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(failing_handler), base_url="http://fake-baby-buddy/api")
    monkeypatch.setattr(server_mod, "http_client", mock_client)

    transport = httpx.ASGITransport(app=server_mod.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/baby-buddy/children/")
    assert res.status_code == 502


async def test_proxy_baby_buddy_timeout_returns_504(monkeypatch):
    def timeout_handler(request: httpx.Request):
        raise httpx.TimeoutException("boom", request=request)

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(timeout_handler), base_url="http://fake-baby-buddy/api")
    monkeypatch.setattr(server_mod, "http_client", mock_client)

    transport = httpx.ASGITransport(app=server_mod.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/baby-buddy/children/")
    assert res.status_code == 504


async def test_proxy_media_returns_404_when_baby_buddy_404s(monkeypatch):
    def not_found_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(not_found_handler), base_url="http://fake-baby-buddy/api")
    monkeypatch.setattr(server_mod, "http_client", mock_client)

    transport = httpx.ASGITransport(app=server_mod.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/media/uploads/photo.jpg")
    assert res.status_code == 404
