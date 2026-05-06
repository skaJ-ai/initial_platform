# HR AX Platform — Concept & MVP Sharing 재정의 Handoff

> 다음 Claude Code 에이전트(로컬 CLI)에게 작업을 인계하기 위한 단일 진실 소스.
> 합의된 결정 + 변경 범위 + 파일 단위 작업 지시 + Acceptance Criteria.
> 이 문서를 읽기만 하면 사용자와의 이전 대화 없이 바로 착수 가능해야 한다.

---

## 0. 한 화면 요약

- **무엇을 바꾸는가**: 사이트 정체성과 IA, 그리고 MVP Demo의 UX 골격.
- **왜**: 현재는 "HR AX Platform Wiki"로 라벨링되어 있는데, 사내에 컨플루언스/지라가 있어 "굳이?"라는 질문을 못 막고 있음. 자기 강점(핸드오프 가능한 동작 데모 + 합의 전 단계 작업대)을 흐리는 라벨링 문제.
- **어떻게**: 두 Phase로 분할.
  - **P1 (저위험)**: Wiki 리브랜딩 + 사이드바 IA 3-bucket 재구성 + 카피 변경 + Open Questions 페이지 신설.
  - **P2 (고위험)**: MVP Demo 전면 재설계 — AXIOM 워크스페이스 골격을 버리고 Chat-first로 전환.
- **순서**: P1 먼저, 머지 후 P2. 한 PR에 합치지 말 것.

---

## 1. 합의된 제품 정의

> **HR AX Platform — Concept & MVP Sharing**
>
> 사내망에서 누구나 1분 안에 띄울 수 있는 HR AX 컨셉 작업대.
> ① 동작하는 MVP를 직접 만져보게 하고,
> ② 아직 합의되지 않은 정의·개념·시나리오를 같이 빚는다.
>
> 합의가 끝난 항목은 컨플루언스로, 결정된 작업은 지라로 빠져나간다.

| 도구 | 다루는 것 | 상태 |
|---|---|---|
| **Concept & MVP Sharing (이 사이트)** | 아직 컨플루언스에 못 올릴 것 — 정의 미합의·시나리오 가설·MVP 체험 | 빚는 중 |
| **컨플루언스** | 합의된 정의·정책·운영 매뉴얼 | 보관·검색 |
| **지라** | 합의된 작업의 추적·일정·결정 | 진행·종결 |

이 표가 README와 index.html 본문에 들어가야 "굳이?"가 사라진다.

---

## 2. Phase 1 — Wiki 리브랜딩 + IA 재구성

### 2.1 사이트 타이틀 변경

- **변경 전**: `HR AX Platform` / `HR AX Platform Wiki`
- **변경 후**: `HR AX Platform — Concept & MVP Sharing`

영향 파일:
- `final/wiki/*.html` — 모든 페이지의 `<title>`, `<aside class="sidebar">` 안의 `class="logo"` 텍스트.
  - `index.html`, `overview.html`, `data-governance.html`, `harness-engineering.html`, `terminology.html`, `scenarios.html`, `faq.html`, `next-actions.html` (총 8개)
  - **+ 신설** `open-questions.html` (2.3 참조)
- `backend/app.py`
  - `_wiki_sidebar()` (line ~818): 서버 렌더링 사이드바 동기화.
  - `_page_template()` (line ~863): 타이틀 포맷.
  - `_ensure_wiki_reference_data()` (line ~236): 카테고리 시드 데이터.
- `README.md`: H1 + 첫 단락.

### 2.2 사이드바 IA 재구성 (3-bucket)

새 사이드바 구조 — **9개 페이지 모두 동일하게 적용** (사이드바 코드 중복은 현재 구조의 한계, P1 범위에서는 그대로 둔다):

```html
<aside class="sidebar">
  <a href="/wiki/overview.html" class="logo">
    HR AX Platform
    <span class="logo-sub">Concept & MVP Sharing</span>
  </a>

  <a href="/wiki/overview.html" class="category category-link">Overview</a>

  <div class="category">Pillars</div>
  <nav>
    <a href="/wiki/data-governance.html">Data Governance</a>
    <a href="/wiki/harness-engineering.html">Harness Engineering</a>
  </nav>

  <div class="category">Shared Language</div>
  <nav>
    <a href="/wiki/terminology.html">용어 사전</a>
    <a href="/wiki/faq.html">FAQ</a>
  </nav>

  <div class="category">Working Notes</div>
  <nav>
    <a href="/wiki/scenarios.html">사용 시나리오</a>
    <a href="/wiki/open-questions.html">Open Questions</a>
    <a href="/wiki/next-actions.html">다음 액션</a>
  </nav>

  <div class="category">Documents</div>
  <nav>
    <a href="/docs/ppt">PPT</a>
    <a href="/docs/one-pager">One Pager</a>
  </nav>

  <a href="/mvp/" class="category category-link mvp-entry">
    MVP Demo <span class="mvp-tag">(preview)</span>
  </a>
</aside>
```

규칙:
- 활성 페이지 링크에 `class="active"` 추가 — 페이지마다 한 곳만.
- **옛 카테고리 라벨 (`Core Pillars`, `Concepts`, `Reference`) 어디에도 남겨두지 말 것.**
- `MVP Demo`는 사이드바 **맨 밑**, `(preview)` 부기로 미흡함 사전 고지.
- `.logo-sub`, `.mvp-tag` 스타일은 `final/wiki/assets/style.css`에 추가:
  - `.logo-sub`: 로고 줄 아래 작은 글씨 (예: 11px, 0.65 opacity).
  - `.mvp-tag`: `(preview)` 회색 작은 부기.

### 2.3 Open Questions 페이지 신설

새 파일: `final/wiki/open-questions.html`

골격은 다른 위키 페이지와 동일 (`<head>` + `<aside class="sidebar">` + `<main class="content">`). 본문은 다음을 정확히 시드:

```html
<main class="content">
  <h1>Open Questions</h1>
  <p class="lead">
    현재 합의되지 않은 항목 목록. 이 도구의 핵심 표면 — 합의가 끝난 항목은 컨플루언스로,
    착수가 결정된 항목은 지라로 빠져나간다. 누구든 행을 추가할 수 있다.
  </p>

  <table>
    <thead>
      <tr>
        <th>질문</th>
        <th>현재 잠정 답</th>
        <th>카운터파트</th>
        <th>합의 시 이동처</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Domain Experts 지명 권한은 누가 가지는가</td>
        <td>부문 People팀장 지명 (잠정)</td>
        <td>People팀장</td>
        <td>컨플루언스 정책 페이지</td>
      </tr>
      <tr>
        <td>분류 Agent 지연이 1-3초 안에 들어오는가 (실측)</td>
        <td>FAQ H1 추정 — 미실측</td>
        <td>AX&amp;CI Lab</td>
        <td>지라 — 성능 검증 작업</td>
      </tr>
      <tr>
        <td>Domain Experts 검수 인센티브 (평가 반영) 가능한가</td>
        <td>People팀 평가에 반영 — 잠정</td>
        <td>부문 People팀장</td>
        <td>컨플루언스 운영 정책</td>
      </tr>
      <tr>
        <td>비정형 카드에서 Agent 매칭 실패 시 사용자 경험</td>
        <td>Skill+Tool만으로 처리 가능 (잠정)</td>
        <td>AX&amp;CI Lab</td>
        <td>지라 — UX 검증</td>
      </tr>
      <tr>
        <td>강제 사용 정책의 발효 범위·시점</td>
        <td>부문 People팀장 선언에 의존 (잠정)</td>
        <td>부문장 협의체</td>
        <td>컨플루언스 정책 페이지</td>
      </tr>
    </tbody>
  </table>

  <p class="dim">
    시드 행은 FAQ H1 / Next Actions에서 가져온 것이며, 사용자가 자유롭게 늘려간다.
    합의가 끝나 컨플루언스로 옮긴 항목은 행을 삭제하지 말고 "이동처" 셀에 링크만 남기는 것을 권장한다.
  </p>
</main>
```

이 페이지는 위키 편집 기능(`wiki-editor.js`)이 적용되는 일반 페이지로 만든다 — 사용자가 행을 추가·수정할 수 있어야 한다.

### 2.4 index.html / overview.html 카피 변경

`final/wiki/index.html`의 H1 직후 lead를 다음으로 교체:

```html
<p class="lead">
  사내망에서 누구나 1분 안에 띄울 수 있는 HR AX 컨셉 작업대.
  ① 동작하는 MVP를 직접 만져보게 하고,
  ② 아직 합의되지 않은 정의·개념·시나리오를 같이 빚는다.
  합의가 끝난 항목은 컨플루언스로, 결정된 작업은 지라로 빠져나간다.
</p>
```

기존 "이 위키 사용법" 표는 새 IA 기준으로 갱신:

| 카테고리 | 내용 | 주 청중 |
|---|---|---|
| Overview | 한 줄 정의, 2대 구성 축, 사용자 시나리오 | 처음 진입한 사람 |
| Pillars | Data Governance / Harness Engineering 상세 | 다부서, Lab 동료, 정보보호센터 |
| Shared Language | 용어 사전 / FAQ — 합의가 가장 막히는 영역 | 모든 청중 |
| Working Notes | 시나리오, Open Questions, 다음 액션 | 토론 참여자 |
| Documents | PPT, One Pager | 협의체, 보고·공유 대상 |
| MVP Demo (preview) | 동작하는 시연 (미흡) | 만져보고 피드백 줄 사람 |

`overview.html`도 동일한 표로 동기화. 표 제목은 "이 위키 사용법" → **"이 사이트 사용법"** 으로 변경.

### 2.5 README.md 업데이트

- H1: `# HR AX Platform — Concept & MVP Sharing`
- 첫 단락: 위 lead 카피 사용.
- "Wiki 저장소" 헤더는 "Concept 저장소"로 변경. 본문에서 "Wiki" 단어를 "Concept"으로 교체하되, **DB 컬럼명/경로명(`wiki-data`, `wiki.sqlite`, `WIKI_DB_PATH`)은 그대로** — 코드 호환성 유지.

### 2.6 Backend 동기화 + DB 마이그레이션 (사내망 운영 전제)

⚠️ **운영 전제**: 본 리포는 사외망에서 코드 작업 → push → 사내망에서 `git pull` → 컨테이너 재기동만으로 반영되어야 한다. 사내망에서는 **절대 push가 불가능**하다. 그리고 사내망에는 이미 운영자가 위키 에디터로 수정·추가한 SQLite overlay 데이터가 존재한다. 아래 마이그레이션 로직은 그 전제 하에서 작성한다.

#### 저장 모델 재확인 (다음 에이전트 숙지 필수)

- **사이드바는 DB-driven**: HTML 파일에 박힌 사이드바는 정적 fallback일 뿐, 실제로는 `_wiki_sidebar()`가 SQLite의 `wiki_nav_categories` / `wiki_nav_items`에서 읽어 렌더링한다.
- **`DEFAULT_WIKI_NAV`** (`backend/app.py:43`)는 시드 정의. 시작 시 `_ensure_wiki_reference_data()`가 `INSERT OR IGNORE` + `UPDATE WHERE is_seed=1` 패턴으로 DB에 반영한다.
- **사용자가 만든 카테고리/페이지는 `is_seed=0`** — 시드 갱신 로직이 절대 건드리면 안 된다.
- `wiki-data/` 는 `.gitignore` + 상대경로 bind mount → git 작업과 충돌 없음.

#### 핵심 함정 — 시드 카테고리 ID 변경 시 좀비 발생

현재 `DEFAULT_WIKI_NAV` ID: `platform / concepts / reference / documents`.
새 IA의 ID: `pillars / shared-language / working-notes / documents`.

`INSERT OR IGNORE`는 **새 ID 4개를 추가**할 뿐 **옛 ID 3개(`platform`, `concepts`, `reference`)를 삭제하지 않는다.** 그대로 두면 사이드바에 옛 카테고리 + 새 카테고리가 둘 다 노출되는 좀비 상태가 된다.

#### 작업 항목

`backend/app.py`:

1. **`DEFAULT_WIKI_NAV` 교체** (line ~43): 새 IA(`pillars` / `shared-language` / `working-notes` / `documents`) 4개 카테고리. 아이템 분배는 §2.2의 사이드바 HTML과 정확히 일치:
   - `pillars`: data-governance, harness-engineering
   - `shared-language`: terminology, faq
   - `working-notes`: scenarios, open-questions, next-actions
   - `documents`: docs/ppt, docs/one-pager

2. **`_ensure_wiki_reference_data()` 맨 앞에 시드 정리 블록 추가** (line ~236, INSERT 루프 시작 직전):

   ```python
   # 시드 정리: 현 DEFAULT_WIKI_NAV에 없는 옛 시드 카테고리 제거.
   # 사용자가 만든 카테고리(is_seed=0)는 절대 건드리지 않음.
   current_ids = tuple(c["id"] for c in DEFAULT_WIKI_NAV)
   placeholders = ",".join("?" * len(current_ids))
   conn.execute(
       f"DELETE FROM wiki_nav_categories "
       f"WHERE is_seed = 1 AND id NOT IN ({placeholders})",
       current_ids,
   )
   # 시드 아이템 중 사라진 것(예: 구조 개편으로 빠진 path)도 정리.
   current_paths = tuple(
       item["path"] for c in DEFAULT_WIKI_NAV for item in c["items"]
   )
   ph_paths = ",".join("?" * len(current_paths))
   conn.execute(
       f"DELETE FROM wiki_nav_items "
       f"WHERE is_seed = 1 AND path NOT IN ({ph_paths})",
       current_paths,
   )
   ```

   - 옛 시드 아이템(`path`)은 새 정의에 그대로 있으면 기존 `UPDATE...SET category_id=?` (line ~283)에서 새 카테고리로 자동 재배치됨 — 별도 처리 불필요.
   - **사용자가 추가한 카테고리/아이템(`is_seed=0`)은 WHERE 절에서 제외되므로 보존됨.**

3. **`_wiki_sidebar()`** (line ~818): §2.2 HTML 시드와 정확히 동일한 카테고리/링크/순서 출력. `(preview)` 부기 포함.

4. **`_page_template()`** (line ~863): 타이틀에서 "Wiki" → "Concept & MVP Sharing" 정합.

5. **`open-questions.html` 시드 인식**: `_seed_content_for_path` 등 시드 인식 경로에 등록되도록 확인. `DEFAULT_WIKI_NAV`의 working-notes에 `path: "open-questions.html"`로 들어가 있으면 일반적으로 자동 인식되지만, `_seed_content_for_path`가 화이트리스트 형태라면 명시 추가 필요.

6. **공통 머리말의 FastAPI title** (`app = FastAPI(title="HR AX Platform Wiki", ...)`, line ~95): "HR AX Platform — Concept & MVP Sharing"으로 변경.

#### 사내망 운영자 액션 가이드 (README에도 추가 권장)

```text
1. git pull
2. docker compose up --build -d   ← 백엔드 코드 변경 반영하려면 재빌드 필수
3. 새 사이드바 IA 자동 적용. 옛 카테고리 좀비 없음(시드 정리 블록 동작).
4. 사용자가 추가한 페이지/카테고리는 그대로 유지됨.
5. 사용자가 본문을 직접 편집한 페이지(예: index.html, overview.html)는
   SQLite overlay가 우선이라 새 lead 카피가 안 보일 수 있음.
   새 카피를 보려면 위키 에디터에서 본문을 비우고 저장 → 파일 fallback 작동.
6. wiki-data/ 디렉토리 절대 삭제 금지. `git clean -fdx` 같은 광범위
   청소 명령 금지.
```

이 안내는 README의 "Wiki 저장소" → "Concept 저장소" 섹션 끝에 코드 블록으로 박는다.

### 2.7 Phase 1 Acceptance Criteria

기능:
- [ ] `docker compose up --build` 직후 모든 페이지가 새 IA의 사이드바를 보여준다.
- [ ] 모든 페이지의 사이드바가 **바이트 단위로 동일** (`active` 표시 외에는 차이 없음).
- [ ] `MVP Demo (preview)` 라벨이 사이드바 맨 밑에 보이고 클릭하면 `/mvp/`로 이동한다.
- [ ] `/wiki/open-questions.html`이 5행 표를 시드로 보여준다.
- [ ] 옛 카테고리 라벨 (`Core Pillars`, `Concepts`, `Reference`) grep으로 0건.
- [ ] `<title>`이 모두 `... — HR AX Platform — Concept & MVP Sharing` 또는 `HR AX Platform — Concept & MVP Sharing` 패턴.

마이그레이션 (사내망 시뮬레이션):
- [ ] **시나리오 A**: 빈 `wiki-data/` 첫 부팅 → 새 IA만 정상 시드.
- [ ] **시나리오 B**: 옛 IA의 시드 데이터가 들어있는 SQLite로 부팅 → 옛 카테고리(`platform`/`concepts`/`reference`) 시드 레코드 0건, 새 카테고리(`pillars`/`shared-language`/`working-notes`) 시드 레코드 정확히 존재. 사이드바도 새 IA만 노출.
- [ ] **시나리오 C**: 옛 시드 + 사용자가 추가한 카테고리·페이지(`is_seed=0`) 가 섞인 SQLite로 부팅 → 사용자 데이터 100% 보존, 옛 시드만 사라짐.
- [ ] **시나리오 D**: 사용자가 `index.html` 본문을 overlay에 저장한 상태로 부팅 → overlay 본문이 그대로 보임 (새 lead 카피는 안 보이는 것이 정상). 위키 에디터에서 본문을 비우고 저장하면 새 카피로 fallback.

---

## 3. Phase 2 — MVP Demo 전면 재설계 (Chat-first)

### 3.1 진단 — 왜 현재 MVP가 허접해 보이는가

현재 코드(`final/mvp-demo/`)는 AXIOM 워크스페이스 골격을 가져왔는데, 이 골격은 "작업 캔버스가 본체 + AI 어시스트가 사이드"인 IDE/Notion 풍이다. **HR AX 컨셉(Chat-first, 분류·라우팅 시연 중심)과 정반대.** 그대로 두면 무조건 어색해진다.

구체 미스매치 (이 부분은 다음 에이전트 자가 검증용):

1. `assets/style.css:299` — `grid-template-columns: 256px minmax(0,1fr) 400px`. Chat이 우측 400px 고정 패널이고, 카드 클릭 후에만 등장(`app.js:360 panel.classList.remove('hidden')`).
2. 브랜드 서브타이틀 `AI Native Work-space`인데 첫 화면이 **정적 카드 그리드** (`renderWorkspace`).
3. Open Chat이 textarea → "분석" 버튼 → 후보 카드 정적 갱신 → 클릭 → 카드 상세 → 채팅. **3-hop 만에 채팅 시작** = Open Chat이 아니라 Open Form.
4. Guided Work라면서 카드 진입 후 시스템이 능동적으로 묻거나 끌어주는 동작이 0개.
5. 카드 본문에 L3-L6 메타와 Agent/Skill/Tool/Context 4-grid가 펼쳐져 있어 "직접 안 골라도 됨"이라는 카피와 충돌.
6. 분류·라우팅이 **정적 텍스트**(`scenarios.js`의 `grade`, `routing.model`)로만 박혀있고 동작이 시연되지 않음 — 컨셉의 핵심 약속이 한 번도 시연 안 됨.
7. `app.js:134, 477`의 `alert("[껍데기 모드] ...")` 4개 — 신뢰 파괴.
8. `nav-code` 약어(`GW/OC/RV/AU/BK/ST/RT`)와 4-사각형 brand-mark — 차가운 enterprise IDE 톤. People팀의 따뜻한 도구 메시지와 안 맞음.

### 3.2 채택된 골격: Chat-first (Option A)

(검토된 옵션: A=Chat-first, B=Conversation+Canvas. **A 채택**, B는 향후 한 카드에서만 부분 적용 가능성으로 보류.)

```
┌─────────────────────────────────────────────────────────┐
│ TopBar: 김삼성 프로 · MX People · 채용/제도/임원조직   │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  채팅창 (메인)                                │
│ (220px)  │                                              │
│ ▶ 새 대화 │  사용자 입력                                  │
│          │                                              │
│ Quick    │  ┌─ Route Trace (펼침/접힘) ─────────────┐   │
│ Starts   │  │ 🟢 권한 확인 · MX People ✓            │   │
│ · 서류심사│  │ 🟡 민감도 분류 중...                  │   │
│ · 평가보고│  │ 🟢 민감 → 비식별화 게이트 통과        │   │
│ · 채용시장│  │ 🟢 사외 LLM 호출                      │   │
│ · 석세션 │  └────────────────────────────────────────┘   │
│          │  ↓ 답변 스트리밍 (또는 sample fallback)        │
│ 최근 대화│                                              │
│          │  [입력창 ────────────────────────  전송]      │
│ Activity │                                              │
│ · 검수 큐│                                              │
│ · 감사 로그│                                            │
└──────────┴──────────────────────────────────────────────┘
```

### 3.3 골격에서 죽일 것 (현재 코드 기준)

`final/mvp-demo/index.html` / `assets/app.js` / `assets/style.css`:

- ❌ `grid-template-columns: 256px minmax(0,1fr) 400px` → `220px minmax(0,1fr)` (2-column).
- ❌ `<aside class="panel-right">` 자체 삭제. 채팅이 main 그 자체.
- ❌ Sidebar의 "Entry Mode" 섹션 (Guided Work / Open Chat 라디오 분리). Quick Starts로 통합.
- ❌ `renderWorkspace`의 카드 그리드 (`renderCardThumb`). 첫 화면 = 빈 채팅창.
- ❌ `renderOpenChatSurface` / `bindOpenChatSurface` (3-hop Open Form). 첫 화면 입력창이 곧 채팅 입력창.
- ❌ 카드 상세의 자동 조립 4-grid 본문 노출. **답변 옆 작은 ⓘ 토글**로 강등 (3.5 참조).
- ❌ `app.js:134, 477`의 `alert("[껍데기 모드] ...")` 4개 모두. 미구현 영역은 **회색 비활성 + 빈 상태 패널**.
- ❌ `nav-code` 약어 (`GW`, `OC`, `ALL`, `RV`, `AU`, `BK`, `ST`, `RT`) 클래스·텍스트 전부 제거.
- ❌ Brand 4-사각형 SVG mark 제거 또는 단순 텍스트 로고로 교체.
- ❌ 서브타이틀 `AI Native Work-space` → `HR 데이터 안전 게이트`.

### 3.4 새 골격에서 살 것

#### 첫 화면 (`/mvp/` 진입 시)
- 메인 = **빈 채팅창** + 입력 placeholder = `예: 업적평가 결과를 보고서로 정리하고…`.
- 사이드바 상단 = **Quick Starts** 4개 (현재 4개 카드 그대로 시드 프롬프트로 변환).
- Quick Start 클릭 = `samplePrompt` 텍스트가 입력창에 채워짐 + 사용자가 직접 보내기 누름. **입력창에 채워지는 순간이 "Guided"의 본질** — 별도 모드 분리 X.

#### 답변 직전 시연 (Route Trace — 핵심 가치 시각화)

사용자 메시지 전송 → 답변 도착 사이에 progressive disclosure 위젯:

```
[Step 1] 권한 확인     ─ 200ms ─ ✓ MX People · 채용/제도/임원조직
[Step 2] 민감도 분류    ─ 600ms ─ ✓ 민감 (PII 패턴 + 사내 LLM)
[Step 3] 라우팅 결정    ─ 100ms ─ ✓ 비식별화 게이트 → 사외 LLM
[Step 4] 비식별화        ─ 300ms ─ ✓ 임직원 식별자 12개 차폐
[Step 5] 모델 호출       ─ 진행 중 ─ Chat GPT 4 (사외)
```

- 각 단계는 카드별 `routeSteps` 배열의 `delay`만큼 가짜 지연으로 시각화.
- 답변 스트리밍이 끝나면 Trace는 자동으로 접혀서 한 줄 요약만 남김 (예: `🟢 민감 · 비식별화 후 사외 LLM · 감사 로그 #4521`). 클릭하면 다시 펼침.
- Quick Start 카드별 라우팅이 `scenarios.js` `routing` 필드에 이미 있음 — 단계별 텍스트로 풀어내면 됨.
- **이 시연이 컨셉의 모든 약속(권한·민감도·게이트·라우팅·감사)을 동시에 보여주는 자리**. 가장 중요한 신규 컴포넌트.

#### Activity 사이드바
- Sidebar 하단에 "Activity": 검수 큐 카운터 + 감사 로그 버튼.
- 클릭 시 alert 대신 **메인을 일시 가리는 드로어 또는 모달**로 빈 상태 화면 표시. 미구현이라는 사실을 사용자에게 거짓말하지 말 것 — "이 데모에서는 아직 비어 있습니다" 정도의 정직한 카피.

#### 자동 조립 메타 ("왜 이렇게 처리됐나")
- Agent 답변 메시지 옆 작은 ⓘ 아이콘. 클릭 시 인라인 패널:

```
이 답변은 다음 조립으로 처리됐습니다.
- Agent  : 채용 서류심사 Agent (Domain Agent)
- Skill  : 서류심사 합격자 확정 기준
- Tool   : 지원자 명단 추출기, 평가 결과 취합기, 채용Hub 조회기
- Context: 채용 L3-L6 표준 데이터, 서류심사 기준, 유사 합격/보류 케이스
- L3-L6  : 채용 / 선발전형 / 서류심사 / 서류 합격자 명단 확정
```

본문 메인에서는 노출 X. **요청 시에만** 보이는 메타.

### 3.5 파일별 작업 지시

| 파일 | 변경 |
|---|---|
| `final/mvp-demo/index.html` | 2-column 레이아웃 / `panel-right` 제거 / brand 4-사각형 정리 / 서브타이틀 교체 / `nav-code` 텍스트 제거 |
| `final/mvp-demo/assets/style.css` | `.app` 그리드 `220px minmax(0,1fr)`로 변경 / `.panel-right` 관련 룰 삭제 / `.chat-*` 메인 톤으로 확대 / `.route-trace`, `.route-trace-step`, `.route-trace-summary`, `.assembly-toggle`, `.assembly-popover` 신설 / `.nav-code` 룰 제거 |
| `final/mvp-demo/assets/app.js` | `renderWorkspace` → `renderChatHome`로 교체. `renderCardThumb`, `renderOpenChatSurface`, `bindOpenChatSurface` 삭제. Quick Start 시드 프롬프트 클릭 핸들러 추가. 메시지 전송 흐름에 Route Trace 렌더러 삽입. `alert(...)` 4건 모두 비-블로킹 빈 상태 UI로 대체. ⓘ 메타 패널 토글 |
| `final/mvp-demo/assets/scenarios.js` | 데이터 거의 유지. 4개 카드의 의미를 "Quick Start"로 재해석(필드 추가 X, 사용 의미만 변경). **`routeSteps` 필드 추가** — 시나리오별 Route Trace 단계 시퀀스 |
| `final/mvp-demo/assets/llm-client.js` | `chat()` 호출 전에 `routeSteps`를 progressive 콜백으로 토해내는 helper 추가. 실제 LLM 호출은 그 뒤. fallback sample 응답 패턴은 유지 |

### 3.6 `routeSteps` 데이터 형식 (scenarios.js 각 시나리오에 추가)

```js
routeSteps: [
  { label: "권한 확인",       delay: 200, status: "ok",   detail: "MX People · 채용/제도/임원조직" },
  { label: "민감도 분류",     delay: 600, status: "ok",   detail: "기밀 (PII + 평가 의도)" },
  { label: "라우팅 결정",     delay: 100, status: "ok",   detail: "사내 LLM (GAUSS)" },
  { label: "비식별화 게이트", delay: 0,   status: "skip", detail: "기밀 등급 — 사외 송출 차단, 게이트 미적용" },
  { label: "모델 호출",       delay: 800, status: "live", detail: "GAUSS 응답 스트리밍" }
]
```

`status` 값: `ok` | `skip` | `live` | `block` | `warn`.
- 카드 4종 모두 각자의 `routeSteps`를 가짐 (기밀 / 민감 / 일반 / 기밀 — `card-001` ~ `card-004`).
- `delay` 합계가 1-3초 안에 들어오도록 (FAQ H1 표 수치 정합).

### 3.7 Quick Start 시드 프롬프트 (기존 `samplePrompt` 그대로 활용)

| 카드 ID | 라벨 (사이드바) | 시드 프롬프트 |
|---|---|---|
| card-001 | 서류 합격자 명단 확정 | 서류심사 결과와 현업 의견을 기준으로 합격자 명단 확정안을 정리해 주세요. |
| card-002 | 업적평가 보고서 초안 | 업적평가 결과 분포와 주요 예외사항을 기반으로 분석 보고서 초안을 작성해 주세요. |
| card-003 | 채용시장 트렌드 정리 | 올해 IT 업계 채용시장 트렌드 정리해줘. 우리 직무군 중심으로. |
| card-004 | 임원 석세션 후보군 | 임원 석세션 후보군 명단과 후보별 근거를 정리하고, 확정 전 확인해야 할 리스크를 뽑아 주세요. |

### 3.8 Phase 2 Acceptance Criteria

- [ ] `/mvp/` 첫 화면 = 빈 채팅창 + 사이드바 Quick Starts 4개.
- [ ] Quick Start 클릭 → 입력창에 시드 프롬프트가 채워짐 (자동 전송 X, 사용자가 직접 보냄).
- [ ] 메시지 전송 → Route Trace 5단계가 progressive disclosure로 그려짐 (총 1-3초).
- [ ] Trace 완료 후 답변 스트리밍 (LLM 미설정 시 sample fallback).
- [ ] 답변 메시지 옆 ⓘ 클릭 → Agent / Skill / Tool / Context / L3-L6 메타 인라인 패널.
- [ ] `alert("[껍데기 모드] ...")` grep 0건.
- [ ] `nav-code` 클래스 grep 0건.
- [ ] 사이드바에 "Entry Mode" / "Guided Work" / "Open Chat" 라벨 0건.
- [ ] 검수 큐 / 감사 로그 클릭 → alert 대신 빈 상태 드로어/모달.
- [ ] AXIOM 4-사각형 brand-mark 제거 또는 단순 텍스트 로고로 교체.
- [ ] 첫 화면 로딩 후 콘솔 에러 0건.

---

## 4. 하지 말 것 (공통)

- ❌ **컨플루언스/지라 기능 흉내 내지 말 것** (검색·태그·권한·@mention·레이블 등). 이 도구의 강점은 "그게 없는 단계"를 다루는 것.
- ❌ **MVP 백엔드 LLM 연결을 새로 짜지 말 것** — 현재 `llm-client.js`의 fallback sample 패턴 유지. 실제 LLM은 docker-compose의 사내 endpoint가 붙어있을 때만 사용.
- ❌ **SQLite overlay 데이터를 마이그레이션·삭제 시도하지 말 것**. `_ensure_wiki_reference_data`는 항상 INSERT OR IGNORE.
- ❌ **`Design System/` 디렉토리는 건드리지 말 것** — 별도 자산.
- ❌ **하나의 PR에 P1+P2 합치지 말 것** — 두 PR로 분리 (P1 먼저, 머지 후 P2).
- ❌ **카피 톤 — 위트나 농담 추가 금지**. 부문장·정보보호센터에게 보여줄 자료. 직설적·중립적.
- ❌ **DB 컬럼명/경로명/환경변수 (`wiki-data`, `wiki.sqlite`, `WIKI_DB_PATH`) 변경 금지** — 사이트 라벨만 "Concept"로 갈 뿐, 코드 호환성은 유지.

---

## 5. 다음 에이전트가 사용자에게 먼저 물어야 할 것

착수 전 사용자 확정 받을 항목:

1. **P1만 먼저 진행할지, P1+P2 한 번에 진행할지.** (권장: P1 먼저)
2. **Brand 4-사각형 mark를 단순 텍스트 로고로 바꿀지, 새 SVG가 필요한지.** (후자면 디자이너 트랙 별도)
3. **Quick Start 4개 외에 추가할 시나리오가 있는지.**
4. **Open Questions 시드 5행 그대로 갈지, 사용자가 직접 채울지.**
5. **Activity(검수 큐 / 감사 로그) 빈 상태 카피 톤 — 정직한 "비어있음" vs 미래형 "곧 채워집니다" 중 어느 쪽인지.**

---

## 6. 결정의 근거 (요약 — 사용자와 논의 시 맥락 잃지 않도록)

- **왜 "Wiki" 라벨을 떼는가**: 컨플루언스 평가축에서 무조건 패배. 자기 강점("핸드오프 가능한 동작 데모 + 합의 전 작업대")을 흐리고 있었음.
- **왜 3-bucket인가**: 5-bucket 안(Open Items 분리)보다 단순함 우선. Working Notes에 시나리오 / Open Questions / 다음 액션을 함께 둠.
- **왜 Documents는 그대로**: "Pitch Materials"는 사용자가 안 와닿는다고 함. Documents가 충분히 평이.
- **왜 MVP는 (preview) + 맨 밑**: 미흡함을 사전 고지하는 게 신뢰에 유리. 위 메뉴부터 보여주면 컨셉이 먼저 전달됨.
- **왜 Chat-first (Option A)**: AXIOM 워크스페이스 골격이 Chat-first 컨셉과 정면충돌. 또한 분류·라우팅 시연 = 답변 직전 1-3초의 progressive disclosure가 가장 자연스러운 자리.
- **왜 Canvas (Option B)는 보류**: 첫 화면 복잡도 증가. 향후 한 카드(보고서 초안 등)에서만 부분 적용 검토.

---

## 7. 작업 브랜치

이 리포의 작업 브랜치는 `claude/evaluate-wiki-structure-1ckJG` 이다. 모든 변경은 이 브랜치 위에 commit + push.
