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

MVP Demo는 별도 endpoint를 설정하지 않으면 같은 서버의 `/api/llm/chat/completions` 프록시를 사용합니다. LLM 연결 실패 시 demo용 sample 응답으로 fallback합니다.

## Editable Wiki

Docker 실행 상태에서 Wiki 페이지 오른쪽 아래의 `Edit`, `Save`, `New Page` 버튼으로 누구나 내용을 수정하거나 새 페이지를 추가할 수 있습니다.

수정 내용은 컨테이너 내부가 아니라 호스트의 `final/wiki`에 저장됩니다. 운영망에 공개할 때는 인증이 없다는 점을 전제로 접근 범위를 제한하세요.
