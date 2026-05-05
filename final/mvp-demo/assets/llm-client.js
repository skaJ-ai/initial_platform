/**
 * HR AX Platform — LLM Client (STUB)
 *
 * Docker 실행 시 backend의 /api/llm/chat/completions 프록시를 기본 사용합니다.
 *
 * 지원 백엔드 (예상):
 *  - OpenAI 호환 API (Ollama, LM Studio, vLLM, OpenAI 자체)
 *  - 사내 LLM (GAUSS) — 별도 어댑터 필요
 *  - 사외 LLM (Chat GPT, Gemini) — 별도 어댑터
 *
 * TODO:
 *  - [ ] 스트리밍 응답 처리
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
    return (!!this.config.endpoint && !!this.config.model) || this.usesServerProxy();
  }

  usesServerProxy() {
    return !this.config.endpoint && (location.protocol === 'http:' || location.protocol === 'https:');
  }

  statusLabel() {
    if (this.config.endpoint && this.config.model) return this.config.model;
    if (this.usesServerProxy()) return 'Server LLM Proxy';
    return 'LLM 미설정';
  }

  getEffectiveEndpoint() {
    return this.config.endpoint || '/api/llm/chat/completions';
  }

  getEffectiveModel() {
    return this.config.model || '';
  }

  _buildSystemPrompt(assembly) {
    const agent = assembly.agent
      ? `Agent: ${assembly.agent.name} (${assembly.agent.type})\n${assembly.agent.sub || ''}`
      : 'Agent: 미부착. Skill, Tool, Context를 기준으로 기본 HR AX Copilot처럼 처리.';
    const skill = assembly.skill
      ? `Skill: ${assembly.skill.name}\n${assembly.skill.sub || ''}`
      : 'Skill: 미부착';
    const tool = assembly.tool && assembly.tool.length > 0
      ? `Tool: ${assembly.tool.join(', ')}`
      : 'Tool: 미부착';
    const context = assembly.context && assembly.context.length > 0
      ? `Context: ${assembly.context.join(', ')}`
      : 'Context: 미부착';

    return [
      '당신은 HR AX Platform의 HR 업무 Copilot입니다.',
      '한국어로 간결하고 실무적인 답변을 작성합니다.',
      '확정할 수 없는 내용은 추정으로 표시하고, 필요한 확인사항을 분리합니다.',
      agent,
      skill,
      tool,
      context
    ].join('\n\n');
  }

  /**
   * 메인 호출 함수
   * @param {Object} params
   * @param {string} params.cardId           - 카드 ID
   * @param {string} params.userMessage      - 사용자 입력
   * @param {string} params.grade            - confidential | sensitive | general
   * @param {Object} params.assembly         - Agent / Skill / Tool / Context
   * @param {Function} params.onToken        - 스트리밍 토큰 콜백
   * @returns {Promise<string>} 응답 본문
   */
  async chat(params) {
    const scenario = window.HRAX_DATA.SCENARIOS.find(s => s.id === params.cardId);
    const endpoint = this.getEffectiveEndpoint();
    const model = this.getEffectiveModel();
    const messages = [
      { role: 'system', content: this._buildSystemPrompt(params.assembly) },
      { role: 'user', content: params.userMessage }
    ];
    const headers = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;

    try {
      const body = {
        messages,
        temperature: 0.3,
        max_tokens: 1200
      };
      if (model) body.model = model;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`LLM proxy error ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (reply) return reply;
      throw new Error('LLM response format invalid');
    } catch (err) {
      console.info('[LLMClient] live call failed — falling back to sample', err);
    }

    // Fallback: 시나리오 데이터의 sampleAgentReply 반환
    if (scenario && scenario.sampleAgentReply) {
      await new Promise(r => setTimeout(r, 800));
      return scenario.sampleAgentReply + '\n\n[SAMPLE 응답입니다. Docker 백엔드 또는 LLM API 연결 실패 시 fallback으로 표시됩니다.]';
    }

    return '[SAMPLE] LLM 응답을 가져오지 못했습니다.';
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
