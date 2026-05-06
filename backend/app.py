from __future__ import annotations

import html
import hashlib
import os
import re
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel


ROOT = Path(__file__).resolve().parents[1]
FINAL_ROOT = ROOT / "final"
WIKI_ROOT = FINAL_ROOT / "wiki"
MVP_ROOT = FINAL_ROOT / "mvp-demo"
DOC_PAGE_SOURCES = {
    "docs/ppt": FINAL_ROOT / "PPT.md",
    "docs/one-pager": FINAL_ROOT / "ONE_PAGER.md",
}

PORT = os.getenv("PORT", "26000")
WIKI_DB_PATH = Path(os.getenv("WIKI_DB_PATH", str(ROOT / ".local" / "wiki.sqlite")))
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://10.240.248.157:8533/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "Qwen3-Next")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_KEY_HEADER = os.getenv("LLM_API_KEY_HEADER", "Authorization")
USE_MOCK = os.getenv("USE_MOCK", "auto").lower()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:26000,http://127.0.0.1:26000").split(",")
    if origin.strip()
]

app = FastAPI(title="HR AX Platform Wiki", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WikiUpdate(BaseModel):
    path: str
    content: str


class WikiCreate(BaseModel):
    title: str
    slug: str
    content: str | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@contextmanager
def _db() -> Iterator[sqlite3.Connection]:
    WIKI_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(WIKI_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_pages (
            path TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content_html TEXT NOT NULL,
            base_hash TEXT NOT NULL,
            source_type TEXT NOT NULL DEFAULT 'seed',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL DEFAULT 'local'
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_revisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            content_html TEXT NOT NULL,
            base_hash TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_by TEXT NOT NULL DEFAULT 'local'
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_wiki_revisions_path ON wiki_revisions(path, id)")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _sanitize_content(content: str) -> str:
    cleaned = re.sub(r"<\s*(script|iframe|object|embed)\b[^>]*>.*?<\s*/\s*\1\s*>", "", content, flags=re.I | re.S)
    cleaned = re.sub(r"<\s*(script|iframe|object|embed)\b[^>]*?/?>", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+on[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+style\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", cleaned, flags=re.I)
    cleaned = re.sub(r"(href|src)\s*=\s*([\"'])\s*javascript:[^\"']*\2", r"\1=\"#\"", cleaned, flags=re.I)
    return cleaned.strip()


def _safe_file(root: Path, request_path: str, default: str = "index.html") -> Path:
    clean = request_path.strip("/")
    if not clean:
        clean = default
    if any(part.startswith(".") for part in Path(clean).parts):
        raise HTTPException(status_code=403, detail="Hidden files are not served")
    candidate = (root / clean).resolve()
    root_resolved = root.resolve()
    if candidate != root_resolved and root_resolved not in candidate.parents:
        raise HTTPException(status_code=403, detail="Path is outside served root")
    if candidate.is_dir():
        candidate = candidate / default
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return candidate


def _normalize_edit_path(page_path: str) -> str:
    clean = (page_path or "").replace("\\", "/").strip()
    if clean.startswith("/wiki/"):
        clean = clean[len("/wiki/") :]
    elif clean in {"/wiki", "wiki"}:
        clean = ""
    clean = clean.strip("/")
    if clean in {"", "index.html"}:
        return "overview.html"
    return clean


def _wiki_html_path(page_path: str) -> Path:
    page_path = _normalize_edit_path(page_path)
    if not page_path.endswith(".html"):
        page_path = f"{page_path}.html"
    return _safe_file(WIKI_ROOT, page_path)


def _doc_page_key(page_path: str) -> str | None:
    clean = _normalize_edit_path(page_path)
    return clean if clean in DOC_PAGE_SOURCES else None


def _read_main_content(page: Path) -> str:
    text = page.read_text(encoding="utf-8")
    match = re.search(r'(<main class="content">)(.*?)(</main>)', text, flags=re.S)
    if not match:
        raise HTTPException(status_code=422, detail="Editable main.content block not found")
    return match.group(2).strip()


def _seed_title_for_path(path: str) -> str:
    if path == "docs/ppt":
        return "PPT"
    if path == "docs/one-pager":
        return "One Pager"
    if path.startswith("pages/"):
        return Path(path).stem.replace("-", " ").title()

    page = _wiki_html_path(path)
    text = page.read_text(encoding="utf-8")
    title_match = re.search(r"<title>(.*?)</title>", text, flags=re.S)
    if title_match:
        return html.unescape(title_match.group(1).split("—")[0].split("-")[0].strip())
    return page.stem.replace("-", " ").title()


def _seed_content_for_path(page_path: str) -> tuple[str, str, str]:
    path = _normalize_edit_path(page_path)
    doc_key = _doc_page_key(page_path)
    if doc_key:
        source = DOC_PAGE_SOURCES[doc_key]
        if not source.exists():
            raise HTTPException(status_code=404, detail="Markdown document not found")
        content = _markdown_to_html(source.read_text(encoding="utf-8"))
        return doc_key, _seed_title_for_path(doc_key), content

    page = _wiki_html_path(page_path)
    rel = str(page.relative_to(WIKI_ROOT)).replace("\\", "/")
    return rel, _seed_title_for_path(rel), _read_main_content(page)


def _read_page_record(path: str) -> sqlite3.Row | None:
    with _db() as conn:
        return conn.execute("SELECT * FROM wiki_pages WHERE path = ?", (path,)).fetchone()


def _read_editable_content(page_path: str) -> dict[str, Any]:
    path = _normalize_edit_path(page_path)
    row = _read_page_record(path)
    if row:
        try:
            _, _, seed_content = _seed_content_for_path(path)
            current_base_hash = _hash_text(seed_content)
        except HTTPException:
            current_base_hash = row["base_hash"]
        return {
            "path": row["path"],
            "title": row["title"],
            "content": row["content_html"],
            "base_hash": row["base_hash"],
            "current_base_hash": current_base_hash,
            "has_overlay": True,
            "upstream_changed": row["base_hash"] != current_base_hash,
            "updated_at": row["updated_at"],
        }

    rel, title, seed_content = _seed_content_for_path(path)
    base_hash = _hash_text(seed_content)
    return {
        "path": rel,
        "title": title,
        "content": seed_content,
        "base_hash": base_hash,
        "current_base_hash": base_hash,
        "has_overlay": False,
        "upstream_changed": False,
        "updated_at": None,
    }


def _write_editable_content(page_path: str, content: str) -> str:
    seed = _read_editable_content(page_path)
    path = seed["path"]
    title = seed["title"]
    base_hash = seed["current_base_hash"]
    clean_content = _sanitize_content(content)
    now = _utc_now()

    with _db() as conn:
        existing = conn.execute("SELECT * FROM wiki_pages WHERE path = ?", (path,)).fetchone()
        if existing:
            conn.execute(
                """
                INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                VALUES (?, ?, ?, 'update', ?, 'local')
                """,
                (path, existing["content_html"], existing["base_hash"], now),
            )
            conn.execute(
                """
                UPDATE wiki_pages
                SET title = ?, content_html = ?, base_hash = ?, updated_at = ?, updated_by = 'local'
                WHERE path = ?
                """,
                (title, clean_content, base_hash, now, path),
            )
        else:
            conn.execute(
                """
                INSERT INTO wiki_pages (path, title, content_html, base_hash, source_type, created_at, updated_at, updated_by)
                VALUES (?, ?, ?, ?, 'seed', ?, ?, 'local')
                """,
                (path, title, clean_content, base_hash, now, now),
            )
            conn.execute(
                """
                INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                VALUES (?, ?, ?, 'create-overlay', ?, 'local')
                """,
                (path, seed["content"], seed["base_hash"], now),
            )
    return path


def _slugify(slug: str) -> str:
    slug = slug.strip().lower()
    slug = re.sub(r"[^a-z0-9_-]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail="Slug is required")
    return slug


def _wiki_sidebar(active: str = "") -> str:
    def active_attr(path: str) -> str:
        return ' class="active"' if path == active else ""

    def overview_attr() -> str:
        classes = "category category-link"
        if active in {"/wiki/", "/wiki/overview.html"}:
            classes += " active"
        return f' class="{classes}"'

    return f"""
<aside class="sidebar">
  <a href="/wiki/overview.html" class="logo">HR AX Platform</a>

  <a href="/wiki/overview.html"{overview_attr()}>Overview</a>

  <div class="category">Platform</div>
  <nav>
    <a href="/wiki/data-governance.html"{active_attr('/wiki/data-governance.html')}>Data Governance</a>
    <a href="/wiki/harness-engineering.html"{active_attr('/wiki/harness-engineering.html')}>Harness Engineering</a>
  </nav>

  <div class="category">Concepts</div>
  <nav>
    <a href="/wiki/terminology.html"{active_attr('/wiki/terminology.html')}>용어 사전</a>
    <a href="/wiki/scenarios.html"{active_attr('/wiki/scenarios.html')}>사용 시나리오</a>
    <a href="/mvp/">MVP Demo</a>
  </nav>

  <div class="category">Reference</div>
  <nav>
    <a href="/wiki/faq.html"{active_attr('/wiki/faq.html')}>FAQ</a>
    <a href="/wiki/next-actions.html"{active_attr('/wiki/next-actions.html')}>다음 액션</a>
  </nav>

  <div class="category">Documents</div>
  <nav>
    <a href="/docs/ppt"{active_attr('/docs/ppt')}>PPT</a>
    <a href="/docs/one-pager"{active_attr('/docs/one-pager')}>One Pager</a>
  </nav>
</aside>
""".strip()


def _page_template(title: str, main_content: str, active: str = "") -> str:
    safe_title = html.escape(title)
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{safe_title} - HR AX Platform Wiki</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="/wiki/assets/style.css?v=2">
</head>
<body>

{_wiki_sidebar(active)}

<main class="content">
{main_content.strip()}
</main>

<script src="/wiki/assets/wiki-editor.js?v=5"></script>
</body>
</html>
"""


def _flush_paragraph(parts: list[str], paragraph: list[str]) -> None:
    if paragraph:
        parts.append(f"<p>{'<br>'.join(paragraph)}</p>")
        paragraph.clear()


def _flush_list(parts: list[str], list_items: list[str], ordered: bool = False) -> None:
    if list_items:
        tag = "ol" if ordered else "ul"
        parts.append(f"<{tag}>" + "".join(f"<li>{item}</li>" for item in list_items) + f"</{tag}>")
        list_items.clear()


def _render_inline_markdown(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    return escaped


def _markdown_to_html(raw: str) -> str:
    parts: list[str] = []
    paragraph: list[str] = []
    list_items: list[str] = []
    ordered_items: list[str] = []
    lines = raw.splitlines()
    i = 0
    in_code = False
    code_lines: list[str] = []

    while i < len(lines):
        line = lines[i].rstrip()

        if line.startswith("```"):
            if in_code:
                parts.append(f"<pre><code>{html.escape(chr(10).join(code_lines))}</code></pre>")
                code_lines.clear()
                in_code = False
            else:
                _flush_paragraph(parts, paragraph)
                _flush_list(parts, list_items)
                _flush_list(parts, ordered_items, ordered=True)
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if not line.strip():
            _flush_paragraph(parts, paragraph)
            _flush_list(parts, list_items)
            _flush_list(parts, ordered_items, ordered=True)
            i += 1
            continue

        if "|" in line and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$", lines[i + 1]):
            _flush_paragraph(parts, paragraph)
            _flush_list(parts, list_items)
            _flush_list(parts, ordered_items, ordered=True)
            headers = [cell.strip() for cell in line.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                rows.append([cell.strip() for cell in lines[i].strip("|").split("|")])
                i += 1
            head_html = "<thead><tr>" + "".join(f"<th>{_render_inline_markdown(h)}</th>" for h in headers) + "</tr></thead>"
            body_html = "<tbody>" + "".join(
                "<tr>" + "".join(f"<td>{_render_inline_markdown(cell)}</td>" for cell in row) + "</tr>"
                for row in rows
            ) + "</tbody>"
            parts.append(f"<table>{head_html}{body_html}</table>")
            continue

        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            _flush_paragraph(parts, paragraph)
            _flush_list(parts, list_items)
            _flush_list(parts, ordered_items, ordered=True)
            level = min(len(heading.group(1)), 4)
            parts.append(f"<h{level}>{_render_inline_markdown(heading.group(2))}</h{level}>")
            i += 1
            continue

        bullet = re.match(r"^\s*[-*]\s+(.+)$", line)
        if bullet:
            _flush_paragraph(parts, paragraph)
            _flush_list(parts, ordered_items, ordered=True)
            list_items.append(_render_inline_markdown(bullet.group(1)))
            i += 1
            continue

        ordered = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if ordered:
            _flush_paragraph(parts, paragraph)
            _flush_list(parts, list_items)
            ordered_items.append(_render_inline_markdown(ordered.group(1)))
            i += 1
            continue

        paragraph.append(_render_inline_markdown(line))
        i += 1

    if in_code:
        parts.append(f"<pre><code>{html.escape(chr(10).join(code_lines))}</code></pre>")
    _flush_paragraph(parts, paragraph)
    _flush_list(parts, list_items)
    _flush_list(parts, ordered_items, ordered=True)
    return "\n".join(parts)


def _render_markdown_doc(md_path: Path, title: str, active: str) -> HTMLResponse:
    if not md_path.exists():
        raise HTTPException(status_code=404, detail="Markdown document not found")
    doc_key = active.strip("/")
    row = _read_page_record(doc_key)
    if row:
        body = row["content_html"]
    else:
        raw = md_path.read_text(encoding="utf-8")
        body = _markdown_to_html(raw)
    page = _page_template(title=title, main_content=body, active=active)
    return HTMLResponse(page)


def _render_wiki_page(file_path: str) -> HTMLResponse:
    path = _normalize_edit_path(file_path)
    row = _read_page_record(path)

    if path.startswith("pages/"):
        if not row:
            raise HTTPException(status_code=404, detail="Wiki page not found")
        return HTMLResponse(_page_template(row["title"], row["content_html"], active=f"/wiki/{path}"))

    page = _wiki_html_path(path)
    html_text = page.read_text(encoding="utf-8")
    if row:
        updated, count = re.subn(
            r'(<main class="content">)(.*?)(</main>)',
            lambda m: f"{m.group(1)}\n{row['content_html'].strip()}\n{m.group(3)}",
            html_text,
            count=1,
            flags=re.S,
        )
        if count == 1:
            html_text = updated
    return HTMLResponse(html_text)


def _auth_headers() -> dict[str, str]:
    if not LLM_API_KEY:
        return {}
    if LLM_API_KEY_HEADER.lower() == "authorization":
        return {"Authorization": f"Bearer {LLM_API_KEY}"}
    return {LLM_API_KEY_HEADER: LLM_API_KEY}


def _mock_completion(payload: dict[str, Any]) -> dict[str, Any]:
    messages = payload.get("messages") or []
    user_message = ""
    for message in reversed(messages):
        if message.get("role") == "user":
            user_message = str(message.get("content", ""))
            break
    content = (
        "[MOCK] 사내 LLM 연결이 확인되지 않아 mock 응답을 반환했습니다.\n\n"
        f"입력 요약: {user_message[:300] if user_message else '사용자 메시지 없음'}"
    )
    return {
        "id": "mock-hrax-completion",
        "object": "chat.completion",
        "model": payload.get("model") or LLM_MODEL,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
    }


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "hr-ax-platform-wiki",
        "port": PORT,
        "llm_base_url": LLM_BASE_URL,
        "llm_model": LLM_MODEL,
        "use_mock": USE_MOCK,
        "wiki_db_path": str(WIKI_DB_PATH),
    }


@app.get("/api/llm/status")
async def llm_status() -> dict[str, Any]:
    status: dict[str, Any] = {
        "base_url": LLM_BASE_URL,
        "model": LLM_MODEL,
        "use_mock": USE_MOCK,
        "available": False,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0, trust_env=True) as client:
            res = await client.get(f"{LLM_BASE_URL}/models", headers=_auth_headers() or None)
        status["available"] = res.status_code == 200
        status["status_code"] = res.status_code
    except Exception as exc:
        status["error"] = str(exc)
    return status


@app.post("/api/llm/chat/completions")
async def llm_chat_completions(request: Request) -> JSONResponse:
    payload = await request.json()
    payload.setdefault("model", LLM_MODEL)
    payload["model"] = payload.get("model") or LLM_MODEL

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0), trust_env=True) as client:
            res = await client.post(
                f"{LLM_BASE_URL}/chat/completions",
                json=payload,
                headers=_auth_headers() or None,
            )
        if res.status_code < 400:
            return JSONResponse(res.json())
        if USE_MOCK == "false":
            raise HTTPException(status_code=res.status_code, detail=res.text[:1000])
    except HTTPException:
        raise
    except Exception as exc:
        if USE_MOCK == "false":
            raise HTTPException(status_code=502, detail=f"LLM proxy failed: {exc}") from exc

    return JSONResponse(_mock_completion(payload))


@app.get("/api/wiki/pages")
async def list_wiki_pages() -> dict[str, Any]:
    with _db() as conn:
        rows = conn.execute(
            """
            SELECT title, path, updated_at
            FROM wiki_pages
            WHERE path LIKE 'pages/%.html'
            ORDER BY title COLLATE NOCASE
            """
        ).fetchall()
    pages = [{"title": row["title"], "path": row["path"], "url": f"/wiki/{row['path']}", "updated_at": row["updated_at"]} for row in rows]
    return {"pages": pages}


@app.get("/api/wiki/page")
async def get_wiki_page(path: str) -> dict[str, Any]:
    return _read_editable_content(path)


@app.put("/api/wiki/page")
async def update_wiki_page(update: WikiUpdate) -> dict[str, Any]:
    rel = _write_editable_content(update.path, update.content)
    return {"ok": True, "path": rel}


@app.post("/api/wiki/page")
async def create_wiki_page(page: WikiCreate) -> dict[str, Any]:
    slug = _slugify(page.slug)
    path = f"pages/{slug}.html"

    title = page.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    content = _sanitize_content(page.content or f"<h1>{html.escape(title)}</h1>\n<p class=\"lead\">새 위키 페이지입니다. 편집 버튼으로 내용을 추가하세요.</p>")
    now = _utc_now()
    with _db() as conn:
        if conn.execute("SELECT 1 FROM wiki_pages WHERE path = ?", (path,)).fetchone():
            raise HTTPException(status_code=409, detail="Page already exists")
        conn.execute(
            """
            INSERT INTO wiki_pages (path, title, content_html, base_hash, source_type, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, 'user', ?, ?, 'local')
            """,
            (path, title, content, _hash_text(""), now, now),
        )
        conn.execute(
            """
            INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
            VALUES (?, ?, ?, 'create', ?, 'local')
            """,
            (path, content, _hash_text(""), now),
        )
    return {"ok": True, "path": path, "url": f"/wiki/{path}"}


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse("/wiki/overview.html")


@app.get("/wiki")
async def wiki_redirect() -> RedirectResponse:
    return RedirectResponse("/wiki/overview.html")


@app.get("/wiki/{file_path:path}")
async def serve_wiki(file_path: str = ""):
    clean = file_path.strip("/")
    if clean in {"", "index.html"}:
        return RedirectResponse("/wiki/overview.html")
    if not clean.endswith(".html"):
        return FileResponse(_safe_file(WIKI_ROOT, clean))
    return _render_wiki_page(file_path)


@app.get("/mvp")
async def mvp_redirect() -> RedirectResponse:
    return RedirectResponse("/mvp/")


@app.get("/mvp/{file_path:path}")
async def serve_mvp(file_path: str = "") -> FileResponse:
    return FileResponse(_safe_file(MVP_ROOT, file_path))


@app.get("/docs/ppt")
async def ppt_doc() -> HTMLResponse:
    return _render_markdown_doc(FINAL_ROOT / "PPT.md", "PPT", "/docs/ppt")


@app.get("/docs/one-pager")
async def one_pager_doc() -> HTMLResponse:
    return _render_markdown_doc(FINAL_ROOT / "ONE_PAGER.md", "One Pager", "/docs/one-pager")
