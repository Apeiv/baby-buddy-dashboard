import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx

from backend.medication_alerts import run_medication_alert_loop

logger = logging.getLogger(__name__)


def sanitize_child_sex(value):
    """CHILD_SEX must only ever be 'male', 'female', or '' (unset) - never an arbitrary/garbled value."""
    return value if value in ("male", "female") else ""


# camelCase API field -> snake_case suffix used in both env var names (THEME_{MODE}_{SUFFIX})
# and add-on option keys (theme_{mode}_{suffix}).
THEME_FIELDS = [
    ("bg", "bg"),
    ("cardBg", "card_bg"),
    ("border", "border"),
    ("text", "text"),
    ("textMuted", "text_muted"),
    ("textDim", "text_dim"),
    ("accent", "accent"),
]


def sanitize_theme_value(value):
    """bashio::config returns the literal string 'null' (not '') for an unset optional
    field in some Supervisor versions - treat that the same as genuinely empty, otherwise
    it leaks through as an invalid CSS custom property value (e.g. `--card-bg: null;`),
    which browsers resolve to transparent instead of falling back to the default theme."""
    return value if value and value != "null" else ""


def read_theme_mode_from_env(mode):
    return {
        camel: sanitize_theme_value(os.environ.get(f"THEME_{mode.upper()}_{suffix.upper()}", ""))
        for camel, suffix in THEME_FIELDS
    }


def fill_theme_mode_from_options(mode, current, opts):
    for camel, suffix in THEME_FIELDS:
        if not current.get(camel):
            current[camel] = sanitize_theme_value(opts.get(f"theme_{mode}_{suffix}") or "")
    return current


# --- Configuration ---

BABY_BUDDY_URL = os.environ.get("BABY_BUDDY_URL", "").rstrip("/")
BABY_BUDDY_API_KEY = os.environ.get("BABY_BUDDY_API_KEY", "")
REFRESH_INTERVAL = int(os.environ.get("REFRESH_INTERVAL", "30"))
DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
UNIT_SYSTEM = os.environ.get("UNIT_SYSTEM", "metric").lower()
ENABLE_MEDICATION_ALERTS = os.environ.get("ENABLE_MEDICATION_ALERTS", "").lower() in ("true", "1", "yes")
CHILD_SEX = sanitize_child_sex(os.environ.get("CHILD_SEX", ""))
THEME = {"light": read_theme_mode_from_env("light"), "dark": read_theme_mode_from_env("dark")}

# Fallback: read from HA add-on options.json
if not BABY_BUDDY_URL:
    options_path = Path("/data/options.json")
    if options_path.exists():
        opts = json.loads(options_path.read_text())
        BABY_BUDDY_URL = opts.get("baby_buddy_url", "").rstrip("/")
        BABY_BUDDY_API_KEY = opts.get("baby_buddy_api_key", "")
        REFRESH_INTERVAL = opts.get("refresh_interval", 30)
        DEMO_MODE = DEMO_MODE or opts.get("demo_mode", False)
        UNIT_SYSTEM = opts.get("unit_system", UNIT_SYSTEM)
        ENABLE_MEDICATION_ALERTS = ENABLE_MEDICATION_ALERTS or opts.get("enable_medication_alerts", False)
        CHILD_SEX = CHILD_SEX or sanitize_child_sex(opts.get("child_sex", ""))
        THEME["light"] = fill_theme_mode_from_options("light", THEME["light"], opts)
        THEME["dark"] = fill_theme_mode_from_options("dark", THEME["dark"], opts)

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")

STATIC_DIR = Path(__file__).parent.parent / "static"

# --- App lifecycle ---

http_client: httpx.AsyncClient | None = None
medication_alert_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client, medication_alert_task
    http_client = httpx.AsyncClient(
        base_url=BABY_BUDDY_URL,
        headers={
            "Authorization": f"Token {BABY_BUDDY_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )

    if ENABLE_MEDICATION_ALERTS and not DEMO_MODE and SUPERVISOR_TOKEN and BABY_BUDDY_URL:
        medication_alert_task = asyncio.create_task(
            run_medication_alert_loop(http_client, SUPERVISOR_TOKEN)
        )
    elif ENABLE_MEDICATION_ALERTS:
        logger.warning(
            "enable_medication_alerts is on but SUPERVISOR_TOKEN/BABY_BUDDY_URL is missing "
            "or demo mode is active; skipping Home Assistant entity updates"
        )

    yield

    if medication_alert_task:
        medication_alert_task.cancel()
        try:
            await medication_alert_task
        except asyncio.CancelledError:
            pass
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)


# --- API routes ---


@app.get("/api/config")
async def get_config():
    return {
        "refresh_interval": REFRESH_INTERVAL,
        "demo_mode": DEMO_MODE,
        "unit_system": UNIT_SYSTEM,
        "child_sex": CHILD_SEX,
        "theme": THEME,
    }


@app.api_route(
    "/api/baby-buddy/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
)
async def proxy_baby_buddy(path: str, request: Request):
    """Proxy requests to the remote Baby Buddy API."""
    target_url = f"/api/{path}"
    params = dict(request.query_params)

    body = None
    content_type = request.headers.get("content-type", "")
    if request.method in ("POST", "PATCH", "PUT"):
        body = await request.body()

    try:
        headers = {}
        if body and "application/json" in content_type:
            headers["Content-Type"] = "application/json"

        response = await http_client.request(
            method=request.method,
            url=target_url,
            params=params,
            content=body,
            headers=headers,
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    excluded_headers = {"transfer-encoding", "content-encoding", "content-length", "connection", "server"}
    response_headers = {
        k: v
        for k, v in response.headers.items()
        if k.lower() not in excluded_headers
    }

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=response_headers,
    )


@app.get("/api/media/{path:path}")
async def proxy_media(path: str):
    """Proxy media files (e.g. child photos) from Baby Buddy."""
    try:
        response = await http_client.get(
            f"/{path}",
            headers={"Accept": "*/*"},
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    if response.status_code != 200:
        raise HTTPException(response.status_code, "Media not found")

    return Response(
        content=response.content,
        headers={"Content-Type": response.headers.get("content-type", "application/octet-stream")},
    )


# --- Static files (React SPA) ---

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(assets_dir)), name="assets"
        )

    static_root = STATIC_DIR.resolve()

    @app.get("/{path:path}")
    async def serve_spa(path: str, request: Request):
        file_path = (STATIC_DIR / path).resolve()
        if file_path.is_relative_to(static_root) and file_path.is_file():
            return FileResponse(file_path)

        # Inject <base> tag with ingress path so relative URLs resolve correctly
        ingress_path = request.headers.get("X-Ingress-Path", "")
        index_html = (STATIC_DIR / "index.html").read_text()
        if ingress_path:
            base_href = ingress_path.rstrip("/") + "/"
            index_html = index_html.replace("<head>", f'<head><base href="{base_href}">', 1)

        return Response(
            content=index_html,
            media_type="text/html",
            headers={"Cache-Control": "no-cache"},
        )
