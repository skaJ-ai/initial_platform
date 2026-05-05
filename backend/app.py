from __future__ import annotations

import html
import json
import os
import re
import time
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
PAGES_ROOT = WIKI_ROOT / "pages"
HISTORY_PATH = WIKI_ROOT / "pages" / ".history.jsonl"

PORT = os.getenv("PORT", "26000")
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


def _wiki_html_path(page_path: str) -> Path:
    if not page_path:
        page_path = "index.html"
    if page_path.startswith("/wiki/"):
        page_path = page_path[len("/wiki/") :]
    page_path = page_path.strip("/") or "index.html"
    if not page_path.endswith(".html"):
        page_path = f"{page_path}.html"
    return _safe_file(WIKI_ROOT, page_path)


def _read_main_content(page: Path) -> str:
    text = page.read_text(encoding="utf-8")
    match = re.search(r'(<main class="content">)(.*?)(</main>)', text, flags=re.S)
    if not match:
        raise HTTPException(status_code=422, detail="Editable main.content block not found")
    return match.group(2).strip()


def _write_main_content(page: Path, content: str) -> None:
    text = page.read_text(encoding="utf-8")
    updated, count = re.subn(
        r'(<main class="content">)(.*?)(</main>)',
        lambda m: f"{m.group(1)}\n{content.strip()}\n{m.group(3)}",
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise HTTPException(status_code=422, detail="Editable main.content block not found")
    page.write_text(updated, encoding="utf-8")


def _append_history(page_path: str, action: str) -> None:
    PAGES_ROOT.mkdir(parents=True, exist_ok=True)
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "path": page_path,
        "action": action,
    }
    with HISTORY_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


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
<link rel="stylesheet" href="/wiki/assets/style.css">
</head>
<body>

{_wiki_sidebar(active)}

<main class="content">
{main_content.strip()}
</main>

<script src="/wiki/assets/wiki-editor.js"></script>
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
    raw = md_path.read_text(encoding="utf-8")
    body = _markdown_to_html(raw)
    page = _page_template(title=title, main_content=body, active=active)
    return HTMLResponse(page)


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
    PAGES_ROOT.mkdir(parents=True, exist_ok=True)
    pages = []
    for page in sorted(PAGES_ROOT.glob("*.html")):
        text = page.read_text(encoding="utf-8")
        title_match = re.search(r"<title>(.*?)</title>", text, flags=re.S)
        title = html.unescape(title_match.group(1).split(" - ")[0].strip()) if title_match else page.stem
        pages.append({"title": title, "path": f"pages/{page.name}", "url": f"/wiki/pages/{page.name}"})
    return {"pages": pages}


@app.get("/api/wiki/page")
async def get_wiki_page(path: str) -> dict[str, Any]:
    page = _wiki_html_path(path)
    return {"path": str(page.relative_to(WIKI_ROOT)).replace("\\", "/"), "content": _read_main_content(page)}


@app.put("/api/wiki/page")
async def update_wiki_page(update: WikiUpdate) -> dict[str, Any]:
    page = _wiki_html_path(update.path)
    rel = str(page.relative_to(WIKI_ROOT)).replace("\\", "/")
    _write_main_content(page, update.content)
    _append_history(rel, "update")
    return {"ok": True, "path": rel}


@app.post("/api/wiki/page")
async def create_wiki_page(page: WikiCreate) -> dict[str, Any]:
    slug = _slugify(page.slug)
    PAGES_ROOT.mkdir(parents=True, exist_ok=True)
    target = (PAGES_ROOT / f"{slug}.html").resolve()
    if target.exists():
        raise HTTPException(status_code=409, detail="Page already exists")
    if PAGES_ROOT.resolve() not in target.parents:
        raise HTTPException(status_code=403, detail="Invalid page path")

    title = page.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    content = page.content or f"<h1>{html.escape(title)}</h1>\n<p class=\"lead\">새 위키 페이지입니다. 편집 버튼으로 내용을 추가하세요.</p>"
    target.write_text(_page_template(title, content, active=f"/wiki/pages/{slug}.html"), encoding="utf-8")
    _append_history(f"pages/{slug}.html", "create")
    return {"ok": True, "path": f"pages/{slug}.html", "url": f"/wiki/pages/{slug}.html"}


@app.get("/")
async def root() -> RedirectResponse:
    return RedirectResponse("/wiki/overview.html")


@app.get("/wiki")
async def wiki_redirect() -> RedirectResponse:
    return RedirectResponse("/wiki/overview.html")


@app.get("/wiki/{file_path:path}")
async def serve_wiki(file_path: str = ""):
    if file_path.strip("/") in {"", "index.html"}:
        return RedirectResponse("/wiki/overview.html")
    return FileResponse(_safe_file(WIKI_ROOT, file_path))


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
