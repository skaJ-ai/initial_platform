/**
 * HR AX Platform — LLM Client (STUB)
 *
 * 다음 LLM이 이 파일을 채워야 합니다. 현재는 껍데기.
 *
 * 지원 백엔드 (예상):
 *  - OpenAI 호환 API (Ollama, LM Studio, vLLM, OpenAI 자체)
 *  - 사내 LLM (GAUSS) — 별도 어댑터 필요
 *  - 사외 LLM (Chat GPT, Gemini) — 별도 어댑터
 *
 * TODO:
 *  - [ ] LLM endpoint config 저장/로드 (localStorage)
 *  - [ ] OpenAI 호환 fetch 호출 (chat/completions)
 *  - [ ] 스트리밍 응답 처리
 *  - [ ] 에러 핸들링
 *  - [ ] 비식별화 게이트 호출 (민감 등급일 때)
 *  - [ ] 분류 Agent 호출 (System Agent, 사내 LLM 전담)
 *  - [ ] Function Calling 패턴 구현 (Tool 호출 의도 → 사내 실행)
 *  - [ ] Audit Log 발행 (모든 호출 기록)
 */

class LLMClient {
  constructor() {
    this.config = this._loadConfig();
  }

  _loadConfig() {
    const saved = localStorage.getItem('hrax_llm_config');
    if (saved) return JSON.parse(saved);
    return {
      endpoint: '',           // 예: http://localhost:1234/v1/chat/completions
      apiKey: '',
      model: '',              // 예: gpt-4, llama3, gemma 등
      provider: 'openai-compatible'
    };
  }

  saveConfig(config) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('hrax_llm_config', JSON.stringify(this.config));
  }

  isConfigured() {
    return !!this.config.endpoint && !!this.config.model;
  }

  /**
   * 메인 호출 함수
   * TODO: 다음 LLM이 구현
   *
   * @param {Object} params
   * @param {string} params.cardId           - 카드 ID
   * @param {string} params.userMessage      - 사용자 입력
   * @param {string} params.grade            - confidential | sensitive | general
   * @param {Object} params.assembly         - Agent / Skill / Tool / Context
   * @param {Function} params.onToken        - 스트리밍 토큰 콜백
   * @returns {Promise<string>} 응답 본문
   */
  async chat(params) {
    if (!this.isConfigured()) {
      console.info('[LLMClient] endpoint not configured — returning sample response');
    }

    // TODO: 실제 호출 구현
    // 1. params.assembly에서 system prompt 구성 (Agent + Skill + Context)
    // 2. params.grade가 'sensitive'면 비식별화 게이트 호출 (마스킹)
    // 3. fetch(this.config.endpoint, ...)
    // 4. 응답 스트리밍 처리
    // 5. 'sensitive'였으면 사내 재매핑
    // 6. Audit Log 기록

    console.info('[LLMClient] chat() not implemented — stub mode');
    console.log('Params:', params);

    // STUB: 시나리오 데이터의 sampleAgentReply 반환
    const scenario = window.HRAX_DATA.SCENARIOS.find(s => s.id === params.cardId);
    if (scenario && scenario.sampleAgentReply) {
      // 가짜 지연 (실제 호출 느낌)
      await new Promise(r => setTimeout(r, 800));
      return scenario.sampleAgentReply + '\n\n[SAMPLE 응답입니다. 실제 LLM 호출은 llm-client.js 구현 후 동작합니다.]';
    }

    return '[STUB] LLM client 미구현. BUILD_SPEC.md 참조.';
  }

  /**
   * 분류 Agent 호출 — System Agent, 사내 LLM 전담
   * TODO: 다음 LLM이 구현
   */
  async classify(text, permissionUnit) {
    // TODO:
    // 1. 권한 단위 룩업 (분류표 v0)
    // 2. 개인식별정보 패턴 대조 (정규식)
    // 3. 사내 LLM 호출 (한국어 맥락 보강)
    // 4. 출력: { grade, redactedItems, confidence }

    console.info('[LLMClient] classify() not implemented — stub mode');
    return {
      grade: 'general',
      redactedItems: [],
      confidence: 0.5,
      _stub: true
    };
  }

  /**
   * 비식별화 게이트
   * TODO: 다음 LLM이 구현
   */
  async anonymize(text, redactedItems) {
    // TODO:
    // 1. 식별자 마스킹 (사번 → ID_X, 이름 → 임직원_X)
    // 2. 매핑 테이블 사내 보관 (this 객체 내 임시)
    // 3. 차폐된 텍스트 반환

    console.info('[LLMClient] anonymize() not implemented — stub mode');
    return { masked: text, mapping: new Map() };
  }

  /**
   * 사내 재매핑 (응답 수신 시)
   * TODO: 다음 LLM이 구현
   */
  async rehydrate(text, mapping) {
    console.info('[LLMClient] rehydrate() not implemented — stub mode');
    return text;
  }

  /**
   * 카드 종료 시 검수 후보 추출
   * TODO: 다음 LLM이 구현
   */
  async extractTacitCandidate(cardId, conversationHistory, decisionLine) {
    // TODO:
    // 1. conversation에서 결정 지점 자동 감지
    // 2. 자유 텍스트 본문 + 메타 (cardId, 작성자, 도메인, 시간)
    // 3. Review Queue에 push (서버측 DB)

    console.info('[LLMClient] extractTacitCandidate() not implemented — stub mode');
    return {
      cardId,
      decisionLine,
      timestamp: new Date().toISOString(),
      _stub: true
    };
  }
}

window.HRAX_LLM = new LLMClient();
