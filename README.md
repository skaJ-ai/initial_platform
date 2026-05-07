# HR AX Platform — Concept & MVP Sharing

사내망에서 누구나 1분 안에 띄울 수 있는 HR AX 컨셉 작업대입니다.
동작하는 MVP를 직접 만져보게 하고, 아직 합의되지 않은 정의·개념·시나리오를 같이 빚습니다.
합의가 끝난 항목은 컨플루언스로, 결정된 작업은 지라로 빠져나갑니다.

## 실행

```powershell
docker compose up --build -d
```

접속:

- Concept: `http://localhost:26000/wiki/`
- PPT: `http://localhost:26000/docs/ppt`
- One Pager: `http://localhost:26000/docs/one-pager`
- MVP Demo: `http://localhost:26000/mvp/`
- Health: `http://localhost:26000/api/health`

## Concept 저장소

Concept 편집 내용은 Git 파일에 직접 저장하지 않고 SQLite DB에 overlay로 저장합니다.

기본 Docker Compose 설정:

```text
wiki data bind mount=./wiki-data
WIKI_DB_PATH=/app/data/wiki.sqlite
```

`docker-compose.yml`은 Windows/Ubuntu 경로 차이를 피하기 위해 OS 절대경로가 아니라 repo 기준 상대경로 bind mount를 사용합니다. `wiki-data/`는 `.gitignore` 대상이므로 Git pull/commit과 충돌하지 않습니다.

Ubuntu 서버의 repo 경로가 `~/initial_platform`이면 실제 DB 경로는 `~/initial_platform/wiki-data/wiki.sqlite`입니다. 즉, 사내망에서 Concept를 수정해도 Git tracked 파일은 더러워지지 않습니다. 사외망에서 새 코드를 push한 뒤 사내망에서 `git pull` 또는 강제 동기화를 해도, 사내 Concept 수정본은 repo 하위 `wiki-data/wiki.sqlite`에 남습니다.

저장 정책:

- Git: 앱 코드, 디자인 시스템, 기본 Concept seed 파일
- SQLite: 사내망에서 수정한 Concept 본문, 신규 페이지/카테고리, 사용자 목록, 페이지별 메모, revision/읽음 이력
- MVP Demo: 편집 대상 아님

사내망 운영자 액션 가이드:

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

## 사내 LLM 기본값

`docker-compose.yml`은 `HR-Process-Coaching-AI`와 같은 사내망 기본값을 사용합니다.

```text
LLM_BASE_URL=http://10.240.248.157:8533/v1
LLM_MODEL=Qwen3-Next
USE_MOCK=auto
HTTP_PROXY=http://168.219.61.252:8080
HTTPS_PROXY=http://168.219.61.252:8080
NO_PROXY=localhost,127.0.0.1,host.docker.internal,10.240.248.157
```

MVP Demo는 별도 endpoint를 설정하지 않으면 같은 서버의 `/api/llm/chat/completions` 프록시를 사용합니다. LLM 연결 실패 시 demo는 sample 응답으로 fallback합니다.

## Editable Concept

Docker 실행 상태에서 Concept를 수정할 수 있습니다.

- 좌측 사이드바 하단 `Concept Manage`: 작성자를 선택하고, `+ Category`, `+ Page`로 카테고리와 페이지를 추가합니다.
- 카테고리/페이지 hover 관리: 순서 이동, 사용자 생성 항목 이름 변경/삭제를 지원합니다.
- 본문 상단 편집 툴바: 현재 페이지 본문을 `Edit`, `Save`, `Cancel`로 수정합니다.
- 우측 Page Chat 패널: 기본으로 열리며, 접힌 상태에서는 말주머니 아이콘으로 다시 엽니다.
- 사이드바 `NEW` 배지: 사용자별 읽음 상태를 기준으로 새 페이지/변경 페이지를 표시합니다.

편집 가능:

- `/wiki/*.html`
- `/wiki/pages/*.html`
- `/docs/ppt`
- `/docs/one-pager`

편집 제외:

- `/mvp/`

편집 도구는 자유 서식 대신 시맨틱 구성을 제공합니다.

- 글 스타일: 본문, 제목, 소제목, 내용 제목, 보조 설명
- 삽입: 표, 2단 카드, 3단 카드, 콜아웃, FAQ
- 강조: Bold, 목록, 번호 목록
- 색상: 정보, 강조, 주의, 성공, 위험
