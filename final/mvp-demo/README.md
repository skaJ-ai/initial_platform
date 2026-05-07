# HR AX Platform — MVP Demo

> Chat-first 골격 + Route Trace 시연 + LLM endpoint 프록시 fallback. 검수 큐와 감사 로그는 비어 있는 Activity 상태로 명확히 노출합니다.

## 현재 상태

완료:
- 220px 사이드바 + 메인 채팅 2-column 레이아웃
- 빠른 시작 4개: 클릭 시 입력창에 예시 프롬프트 채움
- Route Trace 5단계: 권한 확인, 민감도 분류, 라우팅 결정, 비식별화 게이트, 모델 호출
- 답변 아래 처리 메타 펼침/접힘
- LLM endpoint 설정 모달
- 미연결 또는 호출 실패 시 sample 응답 fallback

보류:
- 실제 분류 Agent 호출
- 비식별화 게이트의 실제 마스킹/재매핑
- Function Calling Broker
- 검수 후보 자동 추출
- 감사 로그 저장
- 지식 데이터 retrieval

## 실행 방법

### 1. 로컬에서 직접 열기

```bash
start index.html
```

### 2. 간이 HTTP 서버

```bash
cd final/mvp-demo
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

### 3. LLM 엔드포인트 연결

화면 우측 상단 `설정`에서 입력합니다.

| LLM | Endpoint URL | Model |
|---|---|---|
| Ollama | `http://localhost:11434/v1/chat/completions` | `llama3`, `gemma`, `qwen` 등 |
| LM Studio | `http://localhost:1234/v1/chat/completions` | 로드된 모델 |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4`, `gpt-4o-mini` 등 |
| vLLM | `http://<vllm-host>/v1/chat/completions` | 배포 모델 |

엔드포인트가 없거나 호출이 실패하면 시나리오별 sample 응답을 표시합니다.

## 폴더 구조

```text
final/mvp-demo/
├─ index.html
├─ README.md
└─ assets/
   ├─ style.css
   ├─ scenarios.js
   ├─ llm-client.js
   └─ app.js
```

## 시연 흐름

1. `/mvp/` 또는 `index.html` 진입
2. 빠른 시작 선택 또는 직접 입력
3. 입력창에 프롬프트 확인 후 전송
4. Route Trace가 1-3초 동안 진행
5. 답변 표시
6. 답변 아래 `ⓘ 처리 메타 보기`로 Agent / Skill / Tool / Context / L3-L6 확인
7. Activity의 검수 큐 또는 감사 로그 클릭 시 빈 상태 확인

## 시나리오 4종

| ID | 시나리오 | 등급 | Domain Agent | 비고 |
|---|---|---|---|---|
| card-001 | 서류 합격자 명단 확정 지원 | 기밀 | 있음 | 채용 / 선발전형 / 서류심사 |
| card-002 | 업적평가 결과 분석 보고서 초안 | 민감 | 미구축 | 제도 / 업적평가 / 결과 분석 |
| card-003 | 채용시장 트렌드와 후보 채널 영향 정리 | 일반 | 미구축 | 공개 시장 정보 기반 |
| card-004 | 임원 석세션 후보군 명단 확정 | 기밀 | 있음 | 임원조직 / 인력운영 |

## 디자인 결정

- 데스크톱 전용 시연 환경으로 유지합니다.
- 사이드바는 빠른 시작과 Activity만 남깁니다.
- 카드 그리드와 우측 대화 패널은 제거했습니다.
- 라우팅 근거는 본문보다 먼저, 자동 조립 메타는 답변 아래 보조 정보로 표시합니다.
- Vanilla JS 유지. 백엔드와 wiki 영역은 변경하지 않습니다.
