# HR AX Platform Wiki

사내망 Docker 실행용 HR AX Platform 산출물 웹앱입니다.

## 실행

```powershell
docker compose up --build -d
```

접속:

- Wiki: `http://localhost:26000/wiki/`
- PPT: `http://localhost:26000/docs/ppt`
- One Pager: `http://localhost:26000/docs/one-pager`
- MVP Demo: `http://localhost:26000/mvp/`
- Health: `http://localhost:26000/api/health`

## Wiki 저장소

Wiki 편집 내용은 Git 파일에 직접 저장하지 않고 SQLite DB에 overlay로 저장합니다.

기본 Docker Compose 설정:

```text
WIKI_DATA_DIR=C:/dev/HR-AX-WIKI-DATA
WIKI_DB_PATH=/app/data/wiki.sqlite
```

즉, 사내망에서 Wiki를 수정해도 `C:\dev\initial_platform` Git worktree가 더러워지지 않습니다. 사외망에서 새 코드를 push한 뒤 사내망에서 `git pull` 또는 강제 동기화를 해도, 사내 Wiki 수정본은 `C:\dev\HR-AX-WIKI-DATA\wiki.sqlite`에 남습니다.

저장 정책:

- Git: 앱 코드, 디자인 시스템, 기본 Wiki seed 파일
- SQLite: 사내망에서 수정한 Wiki 본문, 신규 페이지/카테고리, 사용자 목록, 페이지별 메모, revision/읽음 이력
- MVP Demo: 편집 대상 아님

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

## Editable Wiki

Docker 실행 상태에서 Wiki를 수정할 수 있습니다.

- 우상단 작성자 드롭다운: 수정자/메모 작성자를 선택합니다. 목록에 없으면 `+`로 추가합니다.
- 좌측 사이드바 하단: `+ Page`, `+ Category`로 페이지와 카테고리를 추가합니다.
- 본문 상단 편집 툴바: 현재 페이지 본문을 `Edit`, `Save`, `Cancel`로 수정합니다.
- 우측 접힘 메모 패널: 페이지별 메모를 작성자 라벨과 함께 남깁니다.
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
