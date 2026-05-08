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
SEED_NAV_TIMESTAMP = "2026-01-01T00:00:00Z"
DEFAULT_WIKI_USERS_FIXED = ["차완철", "김병주", "남상혁"]
DEFAULT_WIKI_USERS_SORTED = [
    "공현진",
    "문필준",
    "민대홍",
    "장석하",
    "김종원",
    "김하나",
    "박정광",
    "안병웅",
    "윤서완",
    "이소정",
]
SITE_TITLE = "HR AX Platform — Concept & MVP Sharing"
USER_PAGE_DEFAULT_CATEGORY = "working-notes"
OLD_SEED_CATEGORY_IDS = ("platform", "con" "cepts", "reference")
DEFAULT_WIKI_NAV = [
    {
        "id": "pillars",
        "title": "Pillars",
        "sort_order": 10,
        "items": [
            {"path": "data-governance.html", "title": "Data Governance", "url": "/wiki/data-governance.html", "sort_order": 10},
            {"path": "harness-engineering.html", "title": "Harness Engineering", "url": "/wiki/harness-engineering.html", "sort_order": 20},
        ],
    },
    {
        "id": "shared-language",
        "title": "Shared Language",
        "sort_order": 20,
        "items": [
            {"path": "terminology.html", "title": "용어 사전", "url": "/wiki/terminology.html", "sort_order": 10},
            {"path": "faq.html", "title": "FAQ", "url": "/wiki/faq.html", "sort_order": 20},
        ],
    },
    {
        "id": USER_PAGE_DEFAULT_CATEGORY,
        "title": "Working Notes",
        "sort_order": 30,
        "items": [
            {"path": "scenarios.html", "title": "사용 시나리오", "url": "/wiki/scenarios.html", "sort_order": 10},
            {"path": "open-questions.html", "title": "Open Questions", "url": "/wiki/open-questions.html", "sort_order": 20},
            {"path": "next-actions.html", "title": "다음 액션", "url": "/wiki/next-actions.html", "sort_order": 30},
        ],
    },
    {
        "id": "documents",
        "title": "Documents",
        "sort_order": 40,
        "items": [
            {"path": "docs/ppt", "title": "PPT", "url": "/docs/ppt", "sort_order": 10},
            {"path": "docs/one-pager", "title": "One Pager", "url": "/docs/one-pager", "sort_order": 20},
        ],
    },
]

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

app = FastAPI(title=SITE_TITLE, version="1.0.0")

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
    author: str | None = None


class WikiCreate(BaseModel):
    title: str
    slug: str
    category_id: str | None = None
    content: str | None = None
    author: str | None = None


class WikiUserCreate(BaseModel):
    name: str


class WikiCategoryCreate(BaseModel):
    title: str
    author: str | None = None


class WikiCommentCreate(BaseModel):
    path: str
    body: str
    parent_id: int | None = None
    author: str | None = None


class WikiCommentUpdate(BaseModel):
    body: str
    author: str | None = None


class WikiSeenUpdate(BaseModel):
    path: str
    user: str | None = None


class WikiNavMove(BaseModel):
    target_type: str
    id: str
    direction: str
    author: str | None = None


class WikiTitleUpdate(BaseModel):
    title: str
    author: str | None = None


class WikiPageTitleUpdate(BaseModel):
    path: str
    title: str
    author: str | None = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _clean_label(value: str | None, *, max_length: int = 80) -> str:
    cleaned = re.sub(r"[\x00-\x1f\x7f]+", " ", value or "").strip()
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned[:max_length].strip()


def _clean_body(value: str | None, *, max_length: int = 2000) -> str:
    cleaned = (value or "").replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+", "", cleaned)
    return cleaned[:max_length].strip()


def _normalize_author(author: str | None) -> str:
    return _clean_label(author, max_length=40) or "local"


def _table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    if column not in _table_columns(conn, table):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def _category_id_from_title(title: str) -> str:
    ascii_slug = re.sub(r"[^a-z0-9_-]+", "-", title.lower()).strip("-")
    if ascii_slug:
        return f"user-{ascii_slug[:48]}"
    return f"user-{hashlib.sha1(title.encode('utf-8')).hexdigest()[:12]}"


def _nav_url_for_path(path: str) -> str:
    if path == "mvp":
        return "/mvp/"
    if path.startswith("docs/"):
        return f"/{path}"
    if path.startswith("/"):
        return path
    return f"/wiki/{path}"


def _normalize_nav_path(page_path: str) -> str:
    clean = (page_path or "").replace("\\", "/").strip()
    if clean in {"/mvp", "/mvp/"}:
        return "mvp"
    if clean.startswith("/docs/"):
        return clean.strip("/")
    return _normalize_edit_path(clean)


def _ensure_user(conn: sqlite3.Connection, author: str | None) -> str:
    name = _normalize_author(author)
    if name != "local":
        conn.execute(
            """
            INSERT OR IGNORE INTO wiki_users (name, is_seed, created_at)
            VALUES (?, 0, ?)
            """,
            (name, _utc_now()),
        )
    return name


def _ensure_wiki_reference_data(conn: sqlite3.Connection) -> None:
    now = _utc_now()
    conn.execute(
        """
        INSERT OR IGNORE INTO wiki_nav_categories
            (id, title, sort_order, is_seed, created_at, updated_at, updated_by)
        VALUES (?, 'Working Notes', 30, 1, ?, ?, 'seed')
        """,
        (USER_PAGE_DEFAULT_CATEGORY, SEED_NAV_TIMESTAMP, SEED_NAV_TIMESTAMP),
    )
    conn.execute(
        f"""
        UPDATE wiki_nav_items
        SET category_id = ?
        WHERE category_id IN ({",".join("?" * len(OLD_SEED_CATEGORY_IDS))})
            AND is_seed = 0
        """,
        (USER_PAGE_DEFAULT_CATEGORY, *OLD_SEED_CATEGORY_IDS),
    )
    current_ids = tuple(category["id"] for category in DEFAULT_WIKI_NAV)
    conn.execute(
        f"""
        DELETE FROM wiki_nav_categories
        WHERE is_seed = 1 AND id NOT IN ({",".join("?" * len(current_ids))})
        """,
        current_ids,
    )
    current_paths = tuple(item["path"] for category in DEFAULT_WIKI_NAV for item in category["items"])
    conn.execute(
        f"""
        DELETE FROM wiki_nav_items
        WHERE is_seed = 1 AND path NOT IN ({",".join("?" * len(current_paths))})
        """,
        current_paths,
    )

    for name in DEFAULT_WIKI_USERS_FIXED + DEFAULT_WIKI_USERS_SORTED:
        conn.execute(
            """
            INSERT OR IGNORE INTO wiki_users (name, is_seed, created_at)
            VALUES (?, 1, ?)
            """,
            (name, SEED_NAV_TIMESTAMP),
        )

    for category in DEFAULT_WIKI_NAV:
        conn.execute(
            """
            INSERT OR IGNORE INTO wiki_nav_categories
                (id, title, sort_order, is_seed, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, 1, ?, ?, 'seed')
            """,
            (category["id"], category["title"], category["sort_order"], SEED_NAV_TIMESTAMP, SEED_NAV_TIMESTAMP),
        )
        conn.execute(
            """
            UPDATE wiki_nav_categories
            SET title = ?, is_seed = 1
            WHERE id = ? AND is_seed = 1
            """,
            (category["title"], category["id"]),
        )
        for item in category["items"]:
            conn.execute(
                """
                INSERT OR IGNORE INTO wiki_nav_items
                    (path, category_id, title, url, sort_order, is_seed, created_at, updated_at, updated_by)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'seed')
                """,
                (
                    item["path"],
                    category["id"],
                    item["title"],
                    item["url"],
                    item["sort_order"],
                    SEED_NAV_TIMESTAMP,
                    SEED_NAV_TIMESTAMP,
                ),
            )
            conn.execute(
                """
                UPDATE wiki_nav_items
                SET category_id = ?, title = ?, url = ?, is_seed = 1
                WHERE path = ? AND is_seed = 1
                """,
                (category["id"], item["title"], item["url"], item["path"]),
            )

    rows = conn.execute(
        """
        SELECT path, title, created_at, updated_at, updated_by
        FROM wiki_pages
        WHERE path LIKE 'pages/%.html'
        """
    ).fetchall()
    max_sort = conn.execute(
        "SELECT COALESCE(MAX(sort_order), 999) AS max_sort FROM wiki_nav_items WHERE category_id = ?",
        (USER_PAGE_DEFAULT_CATEGORY,),
    ).fetchone()["max_sort"]
    for row in rows:
        if conn.execute("SELECT 1 FROM wiki_nav_items WHERE path = ?", (row["path"],)).fetchone():
            continue
        max_sort += 10
        conn.execute(
            """
            INSERT INTO wiki_nav_items
                (path, category_id, title, url, sort_order, is_seed, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (
                row["path"],
                USER_PAGE_DEFAULT_CATEGORY,
                row["title"],
                _nav_url_for_path(row["path"]),
                max_sort,
                row["created_at"] or now,
                row["updated_at"] or now,
                row["updated_by"] or "local",
            ),
        )


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
    _ensure_column(conn, "wiki_pages", "updated_by", "updated_by TEXT NOT NULL DEFAULT 'local'")
    _ensure_column(conn, "wiki_revisions", "updated_by", "updated_by TEXT NOT NULL DEFAULT 'local'")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_users (
            name TEXT PRIMARY KEY,
            is_seed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_nav_categories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 100,
            is_seed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL DEFAULT 'local'
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_nav_items (
            path TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 100,
            is_seed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL DEFAULT 'local',
            FOREIGN KEY(category_id) REFERENCES wiki_nav_categories(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_path TEXT NOT NULL,
            parent_id INTEGER,
            body TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT 'local',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        )
        """
    )
    _ensure_column(conn, "wiki_comments", "parent_id", "parent_id INTEGER")
    _ensure_column(conn, "wiki_comments", "deleted_at", "deleted_at TEXT")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS wiki_page_seen (
            page_path TEXT NOT NULL,
            user_name TEXT NOT NULL,
            seen_at TEXT NOT NULL,
            PRIMARY KEY(page_path, user_name)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_wiki_nav_items_category ON wiki_nav_items(category_id, sort_order)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_wiki_comments_page ON wiki_comments(page_path, id)")
    _ensure_wiki_reference_data(conn)
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
            "updated_by": row["updated_by"],
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
        "updated_by": None,
    }


def _write_editable_content(page_path: str, content: str, author: str | None = None) -> str:
    seed = _read_editable_content(page_path)
    path = seed["path"]
    title = seed["title"]
    base_hash = seed["current_base_hash"]
    clean_content = _sanitize_content(content)
    now = _utc_now()

    with _db() as conn:
        updated_by = _ensure_user(conn, author)
        existing = conn.execute("SELECT * FROM wiki_pages WHERE path = ?", (path,)).fetchone()
        if existing:
            if existing["source_type"] != "user" and not clean_content:
                conn.execute(
                    """
                    INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                    VALUES (?, ?, ?, 'reset-overlay', ?, ?)
                    """,
                    (path, existing["content_html"], existing["base_hash"], now, updated_by),
                )
                conn.execute("DELETE FROM wiki_pages WHERE path = ?", (path,))
                return path
            conn.execute(
                """
                INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                VALUES (?, ?, ?, 'update', ?, ?)
                """,
                (path, existing["content_html"], existing["base_hash"], now, updated_by),
            )
            conn.execute(
                """
                UPDATE wiki_pages
                SET title = ?, content_html = ?, base_hash = ?, updated_at = ?, updated_by = ?
                WHERE path = ?
                """,
                (title, clean_content, base_hash, now, updated_by, path),
            )
        else:
            if not clean_content:
                return path
            conn.execute(
                """
                INSERT INTO wiki_pages (path, title, content_html, base_hash, source_type, created_at, updated_at, updated_by)
                VALUES (?, ?, ?, ?, 'seed', ?, ?, ?)
                """,
                (path, title, clean_content, base_hash, now, now, updated_by),
            )
            conn.execute(
                """
                INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                VALUES (?, ?, ?, 'create-overlay', ?, ?)
                """,
                (path, seed["content"], seed["base_hash"], now, updated_by),
            )
    return path


def _slugify(slug: str) -> str:
    slug = slug.strip().lower()
    slug = re.sub(r"[^a-z0-9_-]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail="Slug is required")
    return slug


def _ordered_users(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT name, is_seed, created_at FROM wiki_users").fetchall()
    by_name = {row["name"]: row for row in rows}
    ordered_names = [name for name in DEFAULT_WIKI_USERS_FIXED if name in by_name]
    remaining = sorted(name for name in by_name if name not in DEFAULT_WIKI_USERS_FIXED)
    ordered_names.extend(remaining)
    return [
        {
            "name": name,
            "is_seed": bool(by_name[name]["is_seed"]),
            "created_at": by_name[name]["created_at"],
        }
        for name in ordered_names
    ]


def _page_update_info(conn: sqlite3.Connection, path: str) -> tuple[str | None, str | None]:
    row = conn.execute("SELECT updated_at, updated_by FROM wiki_pages WHERE path = ?", (path,)).fetchone()
    if row:
        return row["updated_at"], row["updated_by"]
    return None, None


def _is_new_for_user(
    *,
    path: str,
    is_seed: bool,
    updated_at: str | None,
    page_updated_at: str | None,
    seen_at: str | None,
) -> bool:
    if path == "mvp":
        return False
    effective_updated_at = updated_at or page_updated_at
    if not effective_updated_at:
        return False
    if seen_at:
        return effective_updated_at > seen_at
    if not is_seed:
        return True
    return bool(page_updated_at and page_updated_at > SEED_NAV_TIMESTAMP)


def _list_nav(user: str | None = None) -> dict[str, Any]:
    user_name = _normalize_author(user) if user else ""
    with _db() as conn:
        seen = {}
        if user_name and user_name != "local":
            seen = {
                row["page_path"]: row["seen_at"]
                for row in conn.execute("SELECT page_path, seen_at FROM wiki_page_seen WHERE user_name = ?", (user_name,)).fetchall()
            }

        overview_updated_at, overview_updated_by = _page_update_info(conn, "overview.html")
        overview_seen_at = seen.get("overview.html")
        overview = {
            "path": "overview.html",
            "title": "Overview",
            "url": "/wiki/overview.html",
            "is_seed": True,
            "updated_at": overview_updated_at,
            "updated_by": overview_updated_by,
            "is_new": _is_new_for_user(
                path="overview.html",
                is_seed=True,
                updated_at=overview_updated_at,
                page_updated_at=overview_updated_at,
                seen_at=overview_seen_at,
            ),
        }

        categories = []
        category_rows = conn.execute(
            """
            SELECT id, title, sort_order, is_seed, created_at, updated_at, updated_by
            FROM wiki_nav_categories
            ORDER BY sort_order, title COLLATE NOCASE
            """
        ).fetchall()
        for category in category_rows:
            item_rows = conn.execute(
                """
                SELECT
                    i.path,
                    i.title,
                    i.url,
                    i.sort_order,
                    i.is_seed,
                    i.created_at,
                    i.updated_at,
                    i.updated_by,
                    p.updated_at AS page_updated_at,
                    p.updated_by AS page_updated_by
                FROM wiki_nav_items i
                LEFT JOIN wiki_pages p ON p.path = i.path
                WHERE i.category_id = ?
                ORDER BY i.sort_order, i.title COLLATE NOCASE
                """,
                (category["id"],),
            ).fetchall()
            items = []
            for item in item_rows:
                if item["path"] == "mvp":
                    continue
                updated_at = item["page_updated_at"] or item["updated_at"]
                updated_by = item["page_updated_by"] or item["updated_by"]
                items.append(
                    {
                        "path": item["path"],
                        "title": item["title"],
                        "url": item["url"],
                        "is_seed": bool(item["is_seed"]),
                        "updated_at": updated_at,
                        "updated_by": updated_by,
                        "is_new": _is_new_for_user(
                            path=item["path"],
                            is_seed=bool(item["is_seed"]),
                            updated_at=updated_at,
                            page_updated_at=item["page_updated_at"],
                            seen_at=seen.get(item["path"]),
                        ),
                    }
                )
            categories.append(
                {
                    "id": category["id"],
                    "title": category["title"],
                    "is_seed": bool(category["is_seed"]),
                    "items": items,
                }
            )
    mvp = {
        "path": "mvp",
        "title": "MVP Demo",
        "url": "/mvp/",
        "is_seed": True,
        "updated_at": SEED_NAV_TIMESTAMP,
        "updated_by": "seed",
        "is_new": False,
    }
    return {"overview": overview, "categories": categories, "mvp": mvp}


def _mark_page_seen(page_path: str, user: str | None) -> dict[str, Any]:
    user_name = _normalize_author(user)
    if user_name == "local":
        return {"ok": True, "path": _normalize_nav_path(page_path), "user": user_name, "seen_at": None}
    path = _normalize_nav_path(page_path)
    now = _utc_now()
    with _db() as conn:
        _ensure_user(conn, user_name)
        conn.execute(
            """
            INSERT INTO wiki_page_seen (page_path, user_name, seen_at)
            VALUES (?, ?, ?)
            ON CONFLICT(page_path, user_name) DO UPDATE SET seen_at = excluded.seen_at
            """,
            (path, user_name, now),
        )
    return {"ok": True, "path": path, "user": user_name, "seen_at": now}


def _move_sorted_row(
    conn: sqlite3.Connection,
    *,
    table: str,
    key_column: str,
    key: str,
    direction: str,
    author: str | None = None,
    where_sql: str = "",
    where_params: tuple[Any, ...] = (),
) -> bool:
    if direction not in {"up", "down"}:
        raise HTTPException(status_code=400, detail="Direction must be up or down")
    rows = conn.execute(
        f"SELECT {key_column} AS row_key, sort_order FROM {table} {where_sql} ORDER BY sort_order, row_key COLLATE NOCASE",
        where_params,
    ).fetchall()
    index = next((idx for idx, row in enumerate(rows) if row["row_key"] == key), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Navigation item not found")
    target_index = index - 1 if direction == "up" else index + 1
    if target_index < 0 or target_index >= len(rows):
        return False

    now = _utc_now()
    updated_by = _ensure_user(conn, author)
    current = rows[index]
    target = rows[target_index]
    conn.execute(
        f"UPDATE {table} SET sort_order = ?, updated_at = ?, updated_by = ? WHERE {key_column} = ?",
        (target["sort_order"], now, updated_by, current["row_key"]),
    )
    conn.execute(
        f"UPDATE {table} SET sort_order = ?, updated_at = ?, updated_by = ? WHERE {key_column} = ?",
        (current["sort_order"], now, updated_by, target["row_key"]),
    )
    return True


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
  <a href="/wiki/overview.html" class="logo">
    HR AX Platform
    <span class="logo-sub">Concept &amp; MVP Sharing</span>
  </a>

  <a href="/wiki/overview.html"{overview_attr()}>Overview</a>

  <div class="category">Pillars</div>
  <nav>
    <a href="/wiki/data-governance.html"{active_attr('/wiki/data-governance.html')}>Data Governance</a>
    <a href="/wiki/harness-engineering.html"{active_attr('/wiki/harness-engineering.html')}>Harness Engineering</a>
  </nav>

  <div class="category">Shared Language</div>
  <nav>
    <a href="/wiki/terminology.html"{active_attr('/wiki/terminology.html')}>용어 사전</a>
    <a href="/wiki/faq.html"{active_attr('/wiki/faq.html')}>FAQ</a>
  </nav>

  <div class="category">Working Notes</div>
  <nav>
    <a href="/wiki/scenarios.html"{active_attr('/wiki/scenarios.html')}>사용 시나리오</a>
    <a href="/wiki/open-questions.html"{active_attr('/wiki/open-questions.html')}>Open Questions</a>
    <a href="/wiki/next-actions.html"{active_attr('/wiki/next-actions.html')}>다음 액션</a>
  </nav>

  <div class="category">Documents</div>
  <nav>
    <a href="/docs/ppt"{active_attr('/docs/ppt')}>PPT</a>
    <a href="/docs/one-pager"{active_attr('/docs/one-pager')}>One Pager</a>
  </nav>

  <a href="/mvp/" class="category category-link mvp-entry">MVP Demo <span class="mvp-tag">(preview)</span></a>
</aside>
""".strip()


def _page_template(title: str, main_content: str, active: str = "") -> str:
    safe_title = html.escape(title)
    safe_site_title = html.escape(SITE_TITLE)
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{safe_title} — {safe_site_title}</title>
<link rel="icon" href="/wiki/assets/wiki-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/wiki/assets/style.css?v=12">
</head>
<body>

{_wiki_sidebar(active)}

<main class="content">
{main_content.strip()}
</main>

<script src="/wiki/assets/wiki-editor.js?v=15"></script>
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


@app.get("/api/wiki/users")
async def list_wiki_users() -> dict[str, Any]:
    with _db() as conn:
        users = _ordered_users(conn)
    return {"users": users}


@app.post("/api/wiki/users")
async def create_wiki_user(user: WikiUserCreate) -> dict[str, Any]:
    name = _clean_label(user.name, max_length=40)
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    with _db() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO wiki_users (name, is_seed, created_at)
            VALUES (?, 0, ?)
            """,
            (name, _utc_now()),
        )
        users = _ordered_users(conn)
    return {"ok": True, "name": name, "users": users}


@app.get("/api/wiki/nav")
async def get_wiki_nav(user: str | None = None) -> dict[str, Any]:
    return _list_nav(user)


@app.post("/api/wiki/category")
async def create_wiki_category(category: WikiCategoryCreate) -> dict[str, Any]:
    title = _clean_label(category.title, max_length=60)
    if not title:
        raise HTTPException(status_code=400, detail="Category title is required")
    category_id = _category_id_from_title(title)
    now = _utc_now()
    with _db() as conn:
        author = _ensure_user(conn, category.author)
        if conn.execute("SELECT 1 FROM wiki_nav_categories WHERE lower(title) = lower(?)", (title,)).fetchone():
            raise HTTPException(status_code=409, detail="Category already exists")
        max_sort = conn.execute("SELECT COALESCE(MAX(sort_order), 40) AS max_sort FROM wiki_nav_categories").fetchone()["max_sort"]
        conn.execute(
            """
            INSERT INTO wiki_nav_categories
                (id, title, sort_order, is_seed, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, 0, ?, ?, ?)
            """,
            (category_id, title, max_sort + 10, now, now, author),
        )
    return {"ok": True, "category": {"id": category_id, "title": title, "is_seed": False, "items": []}}


@app.put("/api/wiki/category/{category_id}")
async def update_wiki_category(category_id: str, update: WikiTitleUpdate) -> dict[str, Any]:
    title = _clean_label(update.title, max_length=60)
    if not title:
        raise HTTPException(status_code=400, detail="Category title is required")
    now = _utc_now()
    with _db() as conn:
        author = _ensure_user(conn, update.author)
        row = conn.execute("SELECT id, is_seed FROM wiki_nav_categories WHERE id = ?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        if row["is_seed"]:
            raise HTTPException(status_code=400, detail="Seed categories cannot be renamed")
        if conn.execute(
            "SELECT 1 FROM wiki_nav_categories WHERE lower(title) = lower(?) AND id <> ?",
            (title, category_id),
        ).fetchone():
            raise HTTPException(status_code=409, detail="Category already exists")
        conn.execute(
            """
            UPDATE wiki_nav_categories
            SET title = ?, updated_at = ?, updated_by = ?
            WHERE id = ?
            """,
            (title, now, author, category_id),
        )
    return {"ok": True, "id": category_id, "title": title}


@app.delete("/api/wiki/category/{category_id}")
async def delete_wiki_category(category_id: str) -> dict[str, Any]:
    with _db() as conn:
        row = conn.execute("SELECT id, is_seed FROM wiki_nav_categories WHERE id = ?", (category_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        if row["is_seed"]:
            raise HTTPException(status_code=400, detail="Seed categories cannot be deleted")
        if conn.execute("SELECT 1 FROM wiki_nav_items WHERE category_id = ? LIMIT 1", (category_id,)).fetchone():
            raise HTTPException(status_code=400, detail="Move or delete pages before deleting this category")
        conn.execute("DELETE FROM wiki_nav_categories WHERE id = ?", (category_id,))
    return {"ok": True, "id": category_id}


@app.post("/api/wiki/nav/move")
async def move_wiki_nav_item(move: WikiNavMove) -> dict[str, Any]:
    with _db() as conn:
        author = _ensure_user(conn, move.author)
        if move.target_type == "category":
            moved = _move_sorted_row(
                conn,
                table="wiki_nav_categories",
                key_column="id",
                key=move.id,
                direction=move.direction,
                author=author,
            )
            return {"ok": True, "moved": moved}
        if move.target_type == "page":
            path = _normalize_nav_path(move.id)
            row = conn.execute("SELECT category_id FROM wiki_nav_items WHERE path = ?", (path,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Navigation page not found")
            moved = _move_sorted_row(
                conn,
                table="wiki_nav_items",
                key_column="path",
                key=path,
                direction=move.direction,
                author=author,
                where_sql="WHERE category_id = ?",
                where_params=(row["category_id"],),
            )
            return {"ok": True, "moved": moved}
    raise HTTPException(status_code=400, detail="target_type must be category or page")


@app.get("/api/wiki/page")
async def get_wiki_page(path: str) -> dict[str, Any]:
    return _read_editable_content(path)


@app.get("/api/wiki/revisions")
async def list_wiki_revisions(path: str) -> dict[str, Any]:
    page = _read_editable_content(path)
    with _db() as conn:
        rows = conn.execute(
            """
            SELECT id, path, action, created_at, updated_by, base_hash
            FROM wiki_revisions
            WHERE path = ?
            ORDER BY id DESC
            LIMIT 80
            """,
            (page["path"],),
        ).fetchall()
    return {
        "current": {
            "path": page["path"],
            "title": page["title"],
            "updated_at": page["updated_at"],
            "updated_by": page["updated_by"],
            "has_overlay": page["has_overlay"],
        },
        "revisions": [
            {
                "id": row["id"],
                "path": row["path"],
                "action": row["action"],
                "created_at": row["created_at"],
                "updated_by": row["updated_by"],
                "base_hash": row["base_hash"],
            }
            for row in rows
        ],
    }


@app.get("/api/wiki/revisions/{revision_id}")
async def get_wiki_revision(revision_id: int) -> dict[str, Any]:
    with _db() as conn:
        row = conn.execute(
            """
            SELECT id, path, content_html, base_hash, action, created_at, updated_by
            FROM wiki_revisions
            WHERE id = ?
            """,
            (revision_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Revision not found")
    return {
        "id": row["id"],
        "path": row["path"],
        "content": row["content_html"],
        "base_hash": row["base_hash"],
        "action": row["action"],
        "created_at": row["created_at"],
        "updated_by": row["updated_by"],
    }


@app.put("/api/wiki/page")
async def update_wiki_page(update: WikiUpdate) -> dict[str, Any]:
    rel = _write_editable_content(update.path, update.content, update.author)
    page = _read_editable_content(rel)
    return {"ok": True, "path": rel, "updated_at": page["updated_at"], "updated_by": page["updated_by"]}


@app.post("/api/wiki/page")
async def create_wiki_page(page: WikiCreate) -> dict[str, Any]:
    slug = _slugify(page.slug)
    path = f"pages/{slug}.html"

    title = _clean_label(page.title, max_length=120)
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    content = _sanitize_content(page.content or f"<h1>{html.escape(title)}</h1>\n<p class=\"lead\">새 위키 페이지입니다. 편집 버튼으로 내용을 추가하세요.</p>")
    now = _utc_now()
    with _db() as conn:
        author = _ensure_user(conn, page.author)
        category_id = page.category_id or USER_PAGE_DEFAULT_CATEGORY
        if not conn.execute("SELECT 1 FROM wiki_nav_categories WHERE id = ?", (category_id,)).fetchone():
            raise HTTPException(status_code=400, detail="Unknown category")
        if conn.execute("SELECT 1 FROM wiki_pages WHERE path = ?", (path,)).fetchone():
            raise HTTPException(status_code=409, detail="Page already exists")
        conn.execute(
            """
            INSERT INTO wiki_pages (path, title, content_html, base_hash, source_type, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, 'user', ?, ?, ?)
            """,
            (path, title, content, _hash_text(""), now, now, author),
        )
        conn.execute(
            """
            INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
            VALUES (?, ?, ?, 'create', ?, ?)
            """,
            (path, content, _hash_text(""), now, author),
        )
        max_sort = conn.execute(
            "SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM wiki_nav_items WHERE category_id = ?",
            (category_id,),
        ).fetchone()["max_sort"]
        conn.execute(
            """
            INSERT INTO wiki_nav_items
                (path, category_id, title, url, sort_order, is_seed, created_at, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (path, category_id, title, _nav_url_for_path(path), max_sort + 10, now, now, author),
        )
    return {"ok": True, "path": path, "url": f"/wiki/{path}"}


@app.put("/api/wiki/page-title")
async def update_wiki_page_title(update: WikiPageTitleUpdate) -> dict[str, Any]:
    path = _normalize_edit_path(update.path)
    title = _clean_label(update.title, max_length=120)
    if not title:
        raise HTTPException(status_code=400, detail="Page title is required")
    now = _utc_now()
    with _db() as conn:
        author = _ensure_user(conn, update.author)
        row = conn.execute("SELECT path, source_type FROM wiki_pages WHERE path = ?", (path,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Custom page not found")
        if row["source_type"] != "user":
            raise HTTPException(status_code=400, detail="Seed pages cannot be renamed here")
        conn.execute(
            """
            UPDATE wiki_pages
            SET title = ?, updated_at = ?, updated_by = ?
            WHERE path = ?
            """,
            (title, now, author, path),
        )
        conn.execute(
            """
            UPDATE wiki_nav_items
            SET title = ?, updated_at = ?, updated_by = ?
            WHERE path = ?
            """,
            (title, now, author, path),
        )
        content_row = conn.execute("SELECT content_html, base_hash FROM wiki_pages WHERE path = ?", (path,)).fetchone()
        if content_row:
            conn.execute(
                """
                INSERT INTO wiki_revisions (path, content_html, base_hash, action, created_at, updated_by)
                VALUES (?, ?, ?, 'rename-title', ?, ?)
                """,
                (path, content_row["content_html"], content_row["base_hash"], now, author),
            )
    return {"ok": True, "path": path, "title": title}


@app.delete("/api/wiki/page")
async def delete_wiki_page(path: str) -> dict[str, Any]:
    page_path = _normalize_edit_path(path)
    with _db() as conn:
        row = conn.execute("SELECT path, source_type FROM wiki_pages WHERE path = ?", (page_path,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Custom page not found")
        if row["source_type"] != "user":
            raise HTTPException(status_code=400, detail="Seed pages cannot be deleted")
        conn.execute("DELETE FROM wiki_comments WHERE page_path = ?", (page_path,))
        conn.execute("DELETE FROM wiki_page_seen WHERE page_path = ?", (page_path,))
        conn.execute("DELETE FROM wiki_nav_items WHERE path = ?", (page_path,))
        conn.execute("DELETE FROM wiki_revisions WHERE path = ?", (page_path,))
        conn.execute("DELETE FROM wiki_pages WHERE path = ?", (page_path,))
    return {"ok": True, "path": page_path}


@app.get("/api/wiki/comments")
async def list_wiki_comments(path: str) -> dict[str, Any]:
    page_path = _normalize_edit_path(path)
    if page_path == "mvp":
        raise HTTPException(status_code=400, detail="Comments are not available for MVP")
    with _db() as conn:
        rows = conn.execute(
            """
            SELECT id, page_path, parent_id, body, author, created_at, updated_at, deleted_at
            FROM wiki_comments
            WHERE page_path = ?
            ORDER BY id ASC
            """,
            (page_path,),
        ).fetchall()
    comments = [
        {
            "id": row["id"],
            "path": row["page_path"],
            "parent_id": row["parent_id"],
            "body": row["body"],
            "author": row["author"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "deleted_at": row["deleted_at"],
        }
        for row in rows
    ]
    return {"comments": comments}


@app.post("/api/wiki/comments")
async def create_wiki_comment(comment: WikiCommentCreate) -> dict[str, Any]:
    page_path = _normalize_edit_path(comment.path)
    body = _clean_body(comment.body, max_length=2000)
    if not body:
        raise HTTPException(status_code=400, detail="Comment body is required")
    now = _utc_now()
    with _db() as conn:
        author = _ensure_user(conn, comment.author)
        parent_id = comment.parent_id
        if parent_id is not None:
            parent = conn.execute(
                """
                SELECT id
                FROM wiki_comments
                WHERE id = ? AND page_path = ? AND deleted_at IS NULL
                """,
                (parent_id, page_path),
            ).fetchone()
            if not parent:
                raise HTTPException(status_code=400, detail="Parent comment not found")
        conn.execute(
            """
            INSERT INTO wiki_comments (page_path, parent_id, body, author, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (page_path, parent_id, body, author, now, now),
        )
        comment_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    return {
        "ok": True,
        "comment": {
            "id": comment_id,
            "path": page_path,
            "parent_id": parent_id,
            "body": body,
            "author": author,
            "created_at": now,
            "updated_at": now,
            "deleted_at": None,
        },
    }


@app.put("/api/wiki/comments/{comment_id}")
async def update_wiki_comment(comment_id: int, update: WikiCommentUpdate) -> dict[str, Any]:
    body = _clean_body(update.body, max_length=2000)
    if not body:
        raise HTTPException(status_code=400, detail="Comment body is required")
    author = _normalize_author(update.author)
    now = _utc_now()
    with _db() as conn:
        row = conn.execute(
            """
            SELECT id, page_path, parent_id, author, created_at, deleted_at
            FROM wiki_comments
            WHERE id = ?
            """,
            (comment_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Comment not found")
        if row["deleted_at"]:
            raise HTTPException(status_code=400, detail="Deleted comments cannot be edited")
        if row["author"] != author:
            raise HTTPException(status_code=403, detail="Only the original author can edit this comment")
        conn.execute(
            """
            UPDATE wiki_comments
            SET body = ?, updated_at = ?
            WHERE id = ?
            """,
            (body, now, comment_id),
        )
    return {
        "ok": True,
        "comment": {
            "id": comment_id,
            "path": row["page_path"],
            "parent_id": row["parent_id"],
            "body": body,
            "author": row["author"],
            "created_at": row["created_at"],
            "updated_at": now,
            "deleted_at": None,
        },
    }


@app.delete("/api/wiki/comments/{comment_id}")
async def delete_wiki_comment(comment_id: int, author: str | None = None) -> dict[str, Any]:
    user = _normalize_author(author)
    now = _utc_now()
    with _db() as conn:
        row = conn.execute(
            """
            SELECT id, author, deleted_at
            FROM wiki_comments
            WHERE id = ?
            """,
            (comment_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Comment not found")
        if row["deleted_at"]:
            return {"ok": True, "id": comment_id, "deleted_at": row["deleted_at"]}
        if row["author"] != user:
            raise HTTPException(status_code=403, detail="Only the original author can delete this comment")
        conn.execute(
            """
            UPDATE wiki_comments
            SET deleted_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (now, now, comment_id),
        )
    return {"ok": True, "id": comment_id, "deleted_at": now}


@app.post("/api/wiki/seen")
async def mark_wiki_seen(seen: WikiSeenUpdate) -> dict[str, Any]:
    return _mark_page_seen(seen.path, seen.user)


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
