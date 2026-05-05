# HR AX Platform — MVP Demo (Shell)

> 부문장 협의체 시연용 정적 MVP. 현재는 **껍데기**.
> 실제 LLM 호출, 자산화, 검수 흐름은 다음 LLM이 [BUILD_SPEC.md](./BUILD_SPEC.md) 기준으로 구현 예정.

---

## 현재 상태

✅ **완료 (껍데기)**
- UI 레이아웃 (Top bar / 사이드바 / Main / 우측 채팅 패널)
- 디자인 시스템 (`../../Design System`의 HR AX Design System 기반)
- 카드 그리드 + 카드 상세 뷰
- Open Chat / Guided Work 진입 모드
- L3-L6 후보 자동 제안 시각화
- 자동 조립 시각화 (Agent / Skill / Tool / Context)
- 라우팅 배너 (등급별 색상)
- 채팅 UI + Sample 응답 (시나리오 데이터 기반)
- 설정 모달 (LLM endpoint 입력)
- 카드 종료 + 결정 한 줄 입력 UI

⏳ **미구현 (다음 LLM 작업)**
- 실제 LLM API 호출 (`llm-client.js` chat 메서드 채우기)
- 데이터 민감도 분류 Agent 호출 (사내 LLM)
- 비식별화 게이트 (마스킹 + 사내 재매핑)
- Function Calling Broker (Tool 실행)
- 검수 후보 자동 추출
- 검수 큐 화면 (Domain Experts 검수)
- 감사 로그 화면
- 지식 데이터 retrieval (RAG)

---

## 실행 방법

### 1. 로컬에서 직접 열기 (가장 빠름)

```bash
# 그냥 index.html을 브라우저로 열면 됨
open index.html        # macOS
start index.html       # Windows
```

### 2. 간이 HTTP 서버 (CORS 이슈 회피)

```bash
# Python
cd final/mvp-demo
python -m http.server 8000
# → http://localhost:8000
```

### 3. LLM 엔드포인트 연결

화면 우측 상단 **ST 설정** 클릭 후:

| LLM | Endpoint URL | Model |
|---|---|---|
| **Ollama** (로컬) | `http://localhost:11434/v1/chat/completions` | `llama3`, `gemma`, `qwen` 등 |
| **LM Studio** (로컬) | `http://localhost:1234/v1/chat/completions` | LM Studio에 로드된 모델 |
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | `gpt-4`, `gpt-4o-mini` 등 |
| **vLLM** (사내) | `http://<vllm-host>/v1/chat/completions` | 배포 모델 |

⚠️ 현재 껍데기 상태에서는 **endpoint 입력해도 sample 응답만 반환**합니다. 실제 호출은 `llm-client.js` 구현 후 작동.

---

## 폴더 구조

```
final/mvp-demo/
├─ index.html              # SPA shell
├─ README.md               # 이 파일
├─ BUILD_SPEC.md           # 다음 LLM 빌드 스펙 (gitignore 권장)
└─ assets/
    ├─ style.css           # HR AX Design System 기반 light theme
    ├─ scenarios.js        # 시나리오 데이터 4종 + L3-L6 후보 카탈로그
    ├─ llm-client.js       # LLM 클라이언트 STUB (TODO 표기)
    └─ app.js              # UI 로직 (라우팅, 카드 선택, 채팅)
```

---

## 시연 흐름

1. 브라우저에서 `index.html` 오픈
2. Work-space 진입 → Open Chat / Guided Work 모드 선택
3. Guided Work 카드 클릭 → L3-L6 후보와 Agent / Skill / Tool / Context 자동 조립 시각화
4. Open Chat 입력 → 업무 의도 분석과 L3-L6 후보 제안 시연
5. 우측 채팅 패널 → 라우팅 배너(기밀/민감/일반)에 따라 처리 모델 표시
6. 메시지 입력 → Sample 응답 표시 (실제 LLM 미연결)
7. 결정 한 줄 입력 → 카드 종료 → 검수 후보 큐잉 (stub)

### 시나리오 4종

| ID | 카드 | 등급 | Domain Agent | 비고 |
|---|---|---|---|---|
| card-001 | 서류 합격자 명단 확정 지원 | 기밀 | ⭕ 있음 | 채용 / 선발전형 / 서류심사 |
| card-002 | 업적평가 결과 분석 보고서 초안 | 민감 | ❌ 미구축 | 제도 / 업적평가 / 결과 분석 |
| card-003 | 채용시장 트렌드와 후보 채널 영향 정리 | 일반 | ❌ 미구축 | Open Chat → L3-L6 후보 추정 |
| card-004 | 임원 석세션 후보군 명단 확정 | 기밀 | ⭕ 있음 | 임원조직 / 인력운영 / 임원 석세션 플랜 |

---

## 디자인 결정 사항

- **Design System 기준**: `../../Design System`의 `README.md`, `colors_and_type.css`, `ui_kits/axiom/index.html`을 기준으로 정렬.
- **Light theme**: HR AX Design System의 light token (`#fcfcfc`, `#0f4c81`, `#00bfa5`) 사용.
- **Typography**: Pretendard Variable 로컬 폰트를 `assets/fonts/`에 복사해 정적 서버에서도 로드.
- **단일 페이지 SPA**: 라우팅 단순화. JS로 view 스위칭.
- **Sample 응답**: 실제 LLM 미연결 상태에서도 시연 가능하도록 시나리오 데이터에 `sampleAgentReply` 내장.
- **Vanilla JS**: 프레임워크 의존성 제거. 다음 LLM이 React/Vue 등으로 마이그레이션해도 무리 없음.

---

## 참고 문서

- [PPT.md](../PPT.md) — 부문장 협의체 발표 자료
- [ONE_PAGER.md](../ONE_PAGER.md) — 1대1·메일용 1장 요약
- [wiki/index.html](../wiki/index.html) — 플랫폼 종합 위키
- [BUILD_SPEC.md](./BUILD_SPEC.md) — 다음 LLM 작업지시서
