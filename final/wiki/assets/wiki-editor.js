(function () {
  const apiBase = '/api/wiki';
  const editableDocPaths = new Set(['/docs/ppt', '/docs/one-pager']);
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  const state = {
    users: [],
    nav: null,
    currentUser: '',
    comments: [],
    pageMeta: null,
    manageEl: null,
    pageBar: null,
    commentEditor: null,
    edit: {
      area: null,
      titleEl: null,
      active: false,
      original: '',
    },
  };

  function normalizedPathname() {
    const path = location.pathname.replace(/\/+$/, '');
    return path || '/';
  }

  function isEditablePage() {
    const path = normalizedPathname();
    return (
      path === '/wiki'
      || (path.startsWith('/wiki/') && path.endsWith('.html'))
      || editableDocPaths.has(path)
    );
  }

  function currentWikiPath() {
    const path = normalizedPathname();
    if (path === '/wiki') return 'overview.html';
    if (path.startsWith('/wiki/')) return path.replace(/^\/wiki\/?/, '') || 'overview.html';
    if (editableDocPaths.has(path)) return path.replace(/^\/+/, '');
    return 'overview.html';
  }

  function isActiveUrl(url) {
    const current = normalizedPathname();
    const target = new URL(url, location.origin).pathname.replace(/\/+$/, '') || '/';
    if (current === '/wiki' && target === '/wiki/overview.html') return true;
    return current === target;
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${apiBase}${path}`, options);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    if (!res.ok) {
      const detail = data && data.detail ? data.detail : data;
      throw new Error(detail || `HTTP ${res.status}`);
    }
    return data;
  }

  function currentUser() {
    return state.currentUser || '';
  }

  function currentUserLabel() {
    return currentUser() || '선택하기';
  }

  function requireCurrentUser(actionLabel) {
    const user = currentUser();
    if (user) return user;
    window.alert(`${actionLabel} 전에 작성자를 선택하세요.`);
    const select = document.querySelector('[data-user-select]');
    if (select) select.focus();
    return '';
  }

  function slugFromTitle(title) {
    const slug = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug || 'new-page';
  }

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  function formatFullDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  function sameMinute(left, right) {
    if (!left || !right) return true;
    const a = new Date(left);
    const b = new Date(right);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return left === right;
    return Math.abs(a.getTime() - b.getTime()) < 60000;
  }

  function createButton(label, className, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className || 'btn-wiki';
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  async function loadUsers() {
    if (!isHttp) return;
    const data = await apiFetch('/users');
    state.users = Array.isArray(data.users) ? data.users : [];
    state.currentUser = '';
  }

  async function addUser() {
    const name = window.prompt('추가할 사용자 이름');
    if (!name || !name.trim()) return;
    const data = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    state.users = data.users || state.users;
    state.currentUser = data.name;
    updateManageUserSelects();
    updateCommentAuthorLabel();
    renderComments();
    await markSeen();
  }

  function populateUserSelect(select) {
    if (!select) return;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '선택하기';
    placeholder.selected = !state.currentUser;
    select.appendChild(placeholder);
    state.users.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.name;
      option.textContent = user.name;
      option.selected = user.name === state.currentUser;
      select.appendChild(option);
    });
  }

  function updateManageUserSelects() {
    document.querySelectorAll('[data-user-select]').forEach((select) => populateUserSelect(select));
  }

  function updateNewPageCategories(categories) {
    const select = state.manageEl && state.manageEl.querySelector('[data-new-page-category]');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '';
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.title;
      select.appendChild(option);
    });
    if (current && select.querySelector(`option[value="${CSS.escape(current)}"]`)) {
      select.value = current;
    } else if (select.querySelector('option[value="concepts"]')) {
      select.value = 'concepts';
    }
  }

  function setPageStatus(message, tone) {
    const status = state.pageBar && state.pageBar.querySelector('[data-page-status]');
    if (!status) return;
    status.textContent = message || '';
    status.dataset.tone = tone || '';
  }

  function setManageStatus(message, tone) {
    setPageStatus(message, tone);
  }

  function updatePageMeta() {
    const meta = state.pageBar && state.pageBar.querySelector('[data-page-meta]');
    if (!meta) return;
    const page = state.pageMeta;
    if (!page || !page.has_overlay) {
      meta.textContent = 'No local edits yet';
      meta.dataset.tone = '';
      return;
    }
    const by = page.updated_by || 'local';
    const at = formatFullDateTime(page.updated_at);
    meta.textContent = at ? `Last edited by ${by} · ${at}` : `Last edited by ${by}`;
    meta.dataset.tone = page.upstream_changed ? 'warning' : 'success';
  }

  function updateManagePageMeta() {
    updatePageMeta();
  }

  function syncEditControls() {
    const bar = state.pageBar;
    if (!bar) return;
    bar.querySelector('[data-page-action="edit"]').hidden = state.edit.active;
    bar.querySelector('[data-page-action="save"]').hidden = !state.edit.active;
    bar.querySelector('[data-page-action="cancel"]').hidden = !state.edit.active;
    const tools = bar.querySelector('[data-edit-tools]');
    if (tools) tools.hidden = !state.edit.active;
  }

  async function loadPageMeta() {
    if (!isHttp || !isEditablePage()) return;
    try {
      state.pageMeta = await apiFetch(`/page?path=${encodeURIComponent(currentWikiPath())}`);
      updateManagePageMeta();
      if (state.pageMeta.upstream_changed) {
        setManageStatus(`Seed changed after local edit by ${state.pageMeta.updated_by || 'local'}`, 'error');
      } else if (state.pageMeta.has_overlay) {
        setManageStatus('', '');
      }
    } catch (err) {
      setManageStatus(`Page meta failed: ${err.message || err}`, 'error');
    }
  }

  function initManageEvents(manage) {
    manage.addEventListener('change', async (event) => {
      const target = event.target;
      if (target.matches('[data-user-select]')) {
        state.currentUser = target.value;
        updateCommentAuthorLabel();
        renderComments();
        await markSeen();
        return;
      }
    });

    manage.addEventListener('input', (event) => {
      if (event.target.matches('[data-new-page-title]')) {
        const slugInput = manage.querySelector('[data-new-page-slug]');
        if (slugInput && slugInput.dataset.slugTouched !== 'true') {
          slugInput.value = slugFromTitle(event.target.value);
        }
      }
      if (event.target.matches('[data-new-page-slug]')) {
        event.target.dataset.slugTouched = 'true';
      }
    });

    manage.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action], [data-user-add], [data-create-page], [data-cancel-page]');
      if (!button) return;
      const action = button.dataset.action;
      const task = handleManageClick(button, action);
      if (task && typeof task.catch === 'function') {
        task.catch((err) => {
          window.alert(`Wiki 관리 실패: ${err.message || err}`);
          setManageStatus(`Failed: ${err.message || err}`, 'error');
        });
      }
    });
  }

  async function handleManageClick(button, action) {
    if (button.hasAttribute('data-user-add')) {
      await addUser();
      return;
    }
    if (button.hasAttribute('data-cancel-page')) {
      resetCreatePanel();
      return;
    }
    if (button.hasAttribute('data-create-page')) {
      await createPageFromPanel();
      return;
    }
    if (action === 'sidebar-page') toggleCreatePanel();
    if (action === 'sidebar-category') await createCategoryFromPrompt();
  }

  function renderSidebarActions(sidebar, categories, existingManage) {
    const manage = existingManage || document.createElement('div');
    manage.className = 'sidebar-manage';
    if (!manage.dataset.ready) {
      manage.dataset.ready = 'true';
      manage.innerHTML = `
        <div class="sidebar-manage-title">Wiki Manage</div>
        <div class="manage-section author-section">
          <label class="manage-label" for="wiki-author-select">작성자</label>
          <div class="sidebar-author-row">
            <select id="wiki-author-select" class="wiki-select" data-user-select aria-label="작성자"></select>
            <button type="button" class="btn-wiki icon" data-user-add title="사용자 추가">+</button>
          </div>
        </div>
        <div class="manage-section create-section">
          <div class="manage-section-title">Create</div>
          <div class="sidebar-tools">
            <button type="button" class="btn-wiki sidebar-btn" data-action="sidebar-category">+ Category</button>
            <button type="button" class="btn-wiki sidebar-btn" data-action="sidebar-page">+ Page</button>
          </div>
          <div class="sidebar-create-panel" hidden>
            <div class="create-grid">
              <label>
                <span>Category</span>
                <select class="wiki-select" data-new-page-category aria-label="카테고리"></select>
              </label>
              <label>
                <span>Page</span>
                <input type="text" class="wiki-input" data-new-page-title placeholder="페이지 제목">
              </label>
            </div>
            <input type="text" class="wiki-input" data-new-page-slug placeholder="url-slug">
            <div class="sidebar-create-actions">
              <button type="button" class="btn-wiki primary" data-create-page>생성</button>
              <button type="button" class="btn-wiki" data-cancel-page>취소</button>
            </div>
          </div>
        </div>
      `;
      const slugInput = manage.querySelector('[data-new-page-slug]');
      if (slugInput) slugInput.dataset.slugTouched = 'false';
      initManageEvents(manage);
    }
    state.manageEl = manage;
    updateNewPageCategories(categories);
    updateManageUserSelects();
    updateManagePageMeta();
    syncEditControls();
    sidebar.appendChild(manage);
  }

  function toggleCreatePanel() {
    const panel = state.manageEl.querySelector('.sidebar-create-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      const titleInput = panel.querySelector('[data-new-page-title]');
      if (titleInput) titleInput.focus();
    }
  }

  function resetCreatePanel() {
    const panel = state.manageEl && state.manageEl.querySelector('.sidebar-create-panel');
    if (!panel) return;
    panel.hidden = true;
    const titleInput = panel.querySelector('[data-new-page-title]');
    const slugInput = panel.querySelector('[data-new-page-slug]');
    if (titleInput) titleInput.value = '';
    if (slugInput) {
      slugInput.value = '';
      slugInput.dataset.slugTouched = 'false';
    }
  }

  async function createCategoryFromPrompt() {
    const author = requireCurrentUser('카테고리 생성');
    if (!author) return;
    const title = window.prompt('새 카테고리 이름');
    if (!title || !title.trim()) return;
    await apiFetch('/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), author }),
    });
    await refreshNav();
  }

  async function createPageFromPanel() {
    const author = requireCurrentUser('페이지 생성');
    if (!author) return;
    const panel = state.manageEl.querySelector('.sidebar-create-panel');
    const titleInput = panel.querySelector('[data-new-page-title]');
    const slugInput = panel.querySelector('[data-new-page-slug]');
    const categorySelect = panel.querySelector('[data-new-page-category]');
    const title = titleInput.value.trim();
    const slug = slugInput.value.trim() || slugFromTitle(title);
    if (!title) {
      titleInput.focus();
      return;
    }
    const data = await apiFetch('/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug,
        category_id: categorySelect.value,
        author,
      }),
    });
    location.href = data.url;
  }

  function navActionButton(label, title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-action-btn';
    button.dataset.navAction = action;
    button.title = title;
    button.textContent = label;
    return button;
  }

  async function moveNav(targetType, id, direction) {
    const author = requireCurrentUser('순서 변경');
    if (!author) return;
    await apiFetch('/nav/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, id, direction, author }),
    });
    await refreshNav();
  }

  async function renameCategory(category) {
    const author = requireCurrentUser('카테고리 이름 변경');
    if (!author) return;
    const title = window.prompt('카테고리 이름', category.title);
    if (!title || !title.trim() || title.trim() === category.title) return;
    await apiFetch(`/category/${encodeURIComponent(category.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), author }),
    });
    await refreshNav();
  }

  async function deleteCategory(category) {
    const author = requireCurrentUser('카테고리 삭제');
    if (!author) return;
    if (!window.confirm(`"${category.title}" 카테고리를 삭제할까요? 비어 있는 사용자 카테고리만 삭제됩니다.`)) return;
    await apiFetch(`/category/${encodeURIComponent(category.id)}`, { method: 'DELETE' });
    await refreshNav();
  }

  async function renamePage(item) {
    const author = requireCurrentUser('페이지 이름 변경');
    if (!author) return;
    const title = window.prompt('페이지 이름', item.title);
    if (!title || !title.trim() || title.trim() === item.title) return;
    await apiFetch('/page-title', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path, title: title.trim(), author }),
    });
    await refreshNav();
    await loadPageMeta();
  }

  async function deletePage(item) {
    const author = requireCurrentUser('페이지 삭제');
    if (!author) return;
    if (!window.confirm(`"${item.title}" 페이지를 삭제할까요? 사용자 생성 페이지의 DB overlay가 삭제됩니다.`)) return;
    await apiFetch(`/page?path=${encodeURIComponent(item.path)}`, { method: 'DELETE' });
    if (isActiveUrl(item.url)) {
      location.href = '/wiki/overview.html';
      return;
    }
    await refreshNav();
  }

  function renderCategoryHeader(container, category) {
    const row = document.createElement('div');
    row.className = 'category category-row';
    row.dataset.categoryId = category.id;

    const title = document.createElement('span');
    title.textContent = category.title;
    row.appendChild(title);

    const actions = document.createElement('span');
    actions.className = 'nav-actions';
    actions.appendChild(navActionButton('↑', '위로 이동', 'move-up'));
    actions.appendChild(navActionButton('↓', '아래로 이동', 'move-down'));
    if (!category.is_seed) {
      actions.appendChild(navActionButton('Edit', '이름 변경', 'rename'));
      actions.appendChild(navActionButton('Del', '삭제', 'delete'));
    }
    row.appendChild(actions);
    actions.addEventListener('click', (event) => {
      const button = event.target.closest('[data-nav-action]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.navAction;
      const task = action === 'move-up'
        ? moveNav('category', category.id, 'up')
        : action === 'move-down'
          ? moveNav('category', category.id, 'down')
          : action === 'rename'
            ? renameCategory(category)
            : action === 'delete'
              ? deleteCategory(category)
              : Promise.resolve();
      task.catch((err) => window.alert(`카테고리 관리 실패: ${err.message || err}`));
    });
    container.appendChild(row);
  }

  function appendNavLink(nav, item) {
    const row = document.createElement('div');
    row.className = 'sidebar-item-row';

    const link = document.createElement('a');
    link.href = item.url;
    link.dataset.path = item.path;
    link.className = 'sidebar-link';
    if (isActiveUrl(item.url)) link.classList.add('active');

    const title = document.createElement('span');
    title.textContent = item.title;
    link.appendChild(title);

    if (item.is_new) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = 'NEW';
      link.appendChild(badge);
    }

    const actions = document.createElement('span');
    actions.className = 'nav-actions';
    actions.appendChild(navActionButton('↑', '위로 이동', 'move-up'));
    actions.appendChild(navActionButton('↓', '아래로 이동', 'move-down'));
    if (!item.is_seed) {
      actions.appendChild(navActionButton('Edit', '이름 변경', 'rename'));
      actions.appendChild(navActionButton('Del', '삭제', 'delete'));
    }
    actions.addEventListener('click', (event) => {
      const button = event.target.closest('[data-nav-action]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.navAction;
      const task = action === 'move-up'
        ? moveNav('page', item.path, 'up')
        : action === 'move-down'
          ? moveNav('page', item.path, 'down')
          : action === 'rename'
            ? renamePage(item)
            : action === 'delete'
              ? deletePage(item)
              : Promise.resolve();
      task.catch((err) => window.alert(`페이지 관리 실패: ${err.message || err}`));
    });

    row.appendChild(link);
    row.appendChild(actions);
    nav.appendChild(row);
  }

  function renderSidebar(navData) {
    const sidebar = document.querySelector('aside.sidebar');
    if (!sidebar || !navData) return;

    const existingManage = state.manageEl || sidebar.querySelector('.sidebar-manage');
    if (existingManage && existingManage.parentElement) existingManage.remove();

    sidebar.innerHTML = '';
    const logo = document.createElement('a');
    logo.href = '/wiki/overview.html';
    logo.className = 'logo';
    logo.textContent = 'HR AX Platform';
    sidebar.appendChild(logo);

    const scrollArea = document.createElement('div');
    scrollArea.className = 'sidebar-scroll';

    const overview = document.createElement('a');
    overview.href = navData.overview.url;
    overview.className = 'category category-link';
    if (isActiveUrl(navData.overview.url)) overview.classList.add('active');
    overview.textContent = navData.overview.title;
    if (navData.overview.is_new) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge category-badge';
      badge.textContent = 'NEW';
      overview.appendChild(badge);
    }
    scrollArea.appendChild(overview);

    (navData.categories || []).forEach((category) => {
      renderCategoryHeader(scrollArea, category);

      const itemNav = document.createElement('nav');
      itemNav.className = 'sidebar-nav';
      (category.items || []).forEach((item) => appendNavLink(itemNav, item));
      scrollArea.appendChild(itemNav);
    });

    const mvp = navData.mvp || { title: 'MVP Demo', url: '/mvp/', path: 'mvp' };
    const mvpLink = document.createElement('a');
    mvpLink.href = mvp.url;
    mvpLink.className = 'category category-link mvp-entry';
    mvpLink.textContent = mvp.title;
    scrollArea.appendChild(mvpLink);

    sidebar.appendChild(scrollArea);
    renderSidebarActions(sidebar, navData.categories || [], existingManage);
  }

  async function refreshNav() {
    if (!isHttp) return;
    const data = await apiFetch(`/nav?user=${encodeURIComponent(currentUser())}`);
    state.nav = data;
    renderSidebar(data);
  }

  async function markSeen() {
    if (!isHttp || !isEditablePage()) return;
    if (!currentUser()) return;
    await apiFetch('/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentWikiPath(), user: currentUser() }),
    });
  }

  function runCommand(command, value = null) {
    document.execCommand(command, false, value);
  }

  function selectedBlock(main) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return main;
    const baseNode = selection.anchorNode;
    const node = baseNode && (baseNode.nodeType === Node.ELEMENT_NODE ? baseNode : baseNode.parentElement);
    return node ? node.closest('h1,h2,h3,h4,p,li,blockquote,.card,.callout,.tag,span') || main : main;
  }

  function insertHtml(main, html) {
    main.focus();
    runCommand('insertHTML', html);
  }

  function applySemanticStyle(main, value) {
    if (!main) return;
    main.focus();
    if (value === 'dim') {
      runCommand('formatBlock', 'p');
      const block = selectedBlock(main);
      block.classList.add('dim');
      return;
    }
    runCommand('formatBlock', value);
    const block = selectedBlock(main);
    if (block && block.classList) block.classList.remove('dim');
  }

  function applyTone(main, tone) {
    if (!main || !tone) return;
    const toneClasses = ['cyan', 'purple', 'amber', 'green', 'rose'];
    const block = selectedBlock(main);
    const target = block.closest ? block.closest('.card,.callout,blockquote,.tag,.text-tone') : null;
    if (target && target !== main) {
      target.classList.remove(...toneClasses);
      target.classList.add(tone);
      return;
    }
    insertHtml(main, `<span class="text-tone ${tone}">강조 텍스트</span>`);
  }

  function insertTable(main) {
    const cols = Math.min(Math.max(parseInt(window.prompt('열 수', '3'), 10) || 3, 2), 6);
    const rows = Math.min(Math.max(parseInt(window.prompt('행 수', '3'), 10) || 3, 2), 8);
    const header = '<thead><tr>' + Array.from({ length: cols }, (_, i) => `<th>헤더 ${i + 1}</th>`).join('') + '</tr></thead>';
    const body = '<tbody>' + Array.from({ length: rows - 1 }, (_, r) => (
      '<tr>' + Array.from({ length: cols }, (_, c) => `<td>내용 ${r + 1}-${c + 1}</td>`).join('') + '</tr>'
    )).join('') + '</tbody>';
    insertHtml(main, `<table>${header}${body}</table><p></p>`);
  }

  function insertCards(main, count) {
    const classes = count === 3 ? ['cyan', 'purple', 'amber'] : ['cyan', 'purple'];
    const cards = classes.map((tone, index) => `
      <div class="card ${tone}">
        <div class="card-label">Label ${index + 1}</div>
        <h4>카드 제목</h4>
        <p>카드 내용을 입력하세요.</p>
      </div>
    `).join('');
    insertHtml(main, `<div class="cards cards-${count}">${cards}</div><p></p>`);
  }

  function insertCallout(main) {
    insertHtml(main, '<blockquote class="callout cyan"><p><strong>핵심 메모</strong><br>강조할 내용을 입력하세요.</p></blockquote><p></p>');
  }

  function insertFaq(main) {
    insertHtml(main, `
      <details class="faq-item">
        <summary>질문을 입력하세요</summary>
        <div class="faq-body">
          <p>답변을 입력하세요.</p>
        </div>
      </details>
    `);
  }

  function createPageActionBar(main, titleEl) {
    let bar = main.querySelector(':scope > .wiki-page-actions');
    if (bar) {
      state.pageBar = bar;
      initPageActionBarEvents(bar);
      return bar;
    }
    bar = document.createElement('div');
    bar.className = 'wiki-page-actions';
    bar.contentEditable = 'false';
    bar.innerHTML = `
      <div class="page-action-meta">
        <span class="page-meta-status" data-page-meta>No local edits yet</span>
        <span class="wiki-status page-status" data-page-status></span>
      </div>
      <div class="page-action-icons" aria-label="Page actions">
        <button type="button" class="btn-wiki icon page-icon-btn" data-page-action="edit" title="Edit page" aria-label="Edit page">✎</button>
        <button type="button" class="btn-wiki icon page-icon-btn primary" data-page-action="save" title="Save changes" aria-label="Save changes" hidden>✓</button>
        <button type="button" class="btn-wiki icon page-icon-btn" data-page-action="cancel" title="Cancel edit" aria-label="Cancel edit" hidden>×</button>
        <button type="button" class="btn-wiki icon page-icon-btn" data-page-action="history" title="View history" aria-label="View history">↺</button>
      </div>
      <div class="edit-tools-panel page-edit-tools" data-edit-tools hidden>
        <select class="wiki-select" data-page-action="style" aria-label="Text style">
          <option value="p">본문</option>
          <option value="h2">제목</option>
          <option value="h3">소제목</option>
          <option value="h4">내용 제목</option>
          <option value="dim">보조 설명</option>
        </select>
        <button type="button" class="btn-wiki" data-page-action="bold" data-edit-tool>Bold</button>
        <button type="button" class="btn-wiki" data-page-action="bullet" data-edit-tool>List</button>
        <button type="button" class="btn-wiki" data-page-action="numbered" data-edit-tool>1. List</button>
        <button type="button" class="btn-wiki" data-page-action="table" data-edit-tool>Table</button>
        <button type="button" class="btn-wiki" data-page-action="cards2" data-edit-tool>2 Cards</button>
        <button type="button" class="btn-wiki" data-page-action="cards3" data-edit-tool>3 Cards</button>
        <button type="button" class="btn-wiki" data-page-action="callout" data-edit-tool>Callout</button>
        <button type="button" class="btn-wiki" data-page-action="faq" data-edit-tool>FAQ</button>
        <select class="wiki-select" data-page-action="tone" aria-label="Tone">
          <option value="">색상</option>
          <option value="cyan">정보</option>
          <option value="purple">강조</option>
          <option value="amber">주의</option>
          <option value="green">성공</option>
          <option value="rose">위험</option>
        </select>
      </div>
    `;
    initPageActionBarEvents(bar);
    if (titleEl && titleEl.parentElement === main) {
      titleEl.insertAdjacentElement('afterend', bar);
    } else {
      main.insertBefore(bar, main.firstChild);
    }
    state.pageBar = bar;
    return bar;
  }

  function initPageActionBarEvents(bar) {
    if (bar.dataset.ready) return;
    bar.dataset.ready = 'true';
    bar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button[data-edit-tool]')) {
        event.preventDefault();
      }
    });
    bar.addEventListener('change', (event) => {
      const target = event.target;
      if (target.matches('[data-page-action="style"]')) {
        applySemanticStyle(editArea(), target.value);
        target.value = 'p';
        return;
      }
      if (target.matches('[data-page-action="tone"]')) {
        applyTone(editArea(), target.value);
        target.value = '';
      }
    });
    bar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page-action]');
      if (!button) return;
      const action = button.dataset.pageAction;
      const task = handlePageActionClick(action, button);
      if (task && typeof task.catch === 'function') {
        task.catch((err) => {
          window.alert(`페이지 편집 실패: ${err.message || err}`);
          setPageStatus(`Failed: ${err.message || err}`, 'error');
        });
      }
    });
  }

  async function handlePageActionClick(action, button) {
    if (button && button.hasAttribute('data-edit-tool')) {
      handleEditTool(action);
      return;
    }
    if (action === 'edit') startEdit();
    if (action === 'save') await saveEdit();
    if (action === 'cancel') cancelEdit();
    if (action === 'history') await openHistory();
  }

  function ensureEditableArea(main) {
    let area = main.querySelector(':scope > .wiki-editable-area');
    let titleEl = main.querySelector(':scope > h1');
    if (!titleEl && area) {
      titleEl = area.querySelector(':scope > h1');
      if (titleEl) main.insertBefore(titleEl, area);
    }
    state.edit.titleEl = titleEl || null;
    const bar = createPageActionBar(main, titleEl);

    if (!area) {
      area = document.createElement('div');
      area.className = 'wiki-editable-area';
      area.tabIndex = -1;
      Array.from(main.childNodes).forEach((node) => {
        if (node === titleEl || node === bar) return;
        area.appendChild(node);
      });
      main.appendChild(area);
    }
    return area;
  }

  function setupEditableArea() {
    const main = document.querySelector('main.content');
    if (!main || !isHttp || !isEditablePage()) return;
    state.edit.area = ensureEditableArea(main);
    updatePageMeta();
    syncEditControls();
  }

  function editArea() {
    if (!state.edit.area) setupEditableArea();
    return state.edit.area;
  }

  function editablePageHtml() {
    const area = editArea();
    const titleHtml = state.edit.titleEl ? `${state.edit.titleEl.outerHTML}\n` : '';
    return `${titleHtml}${area ? area.innerHTML : ''}`;
  }

  function startEdit() {
    const author = requireCurrentUser('수정');
    if (!author) return;
    const area = editArea();
    if (!area || state.edit.active) return;
    state.edit.original = area.innerHTML;
    state.edit.active = true;
    area.contentEditable = 'true';
    area.classList.add('wiki-editing');
    syncEditControls();
    const meta = state.pageBar && state.pageBar.querySelector('[data-page-meta]');
    if (meta) {
      meta.textContent = `Editing as ${author} · Unsaved changes`;
      meta.dataset.tone = 'warning';
    }
    setPageStatus('', '');
    area.focus();
  }

  function cancelEdit() {
    const area = editArea();
    if (!area || !state.edit.active) return;
    area.innerHTML = state.edit.original;
    state.edit.original = '';
    state.edit.active = false;
    area.contentEditable = 'false';
    area.classList.remove('wiki-editing');
    syncEditControls();
    updatePageMeta();
    setPageStatus('Edit cancelled', '');
  }

  async function saveEdit() {
    const author = requireCurrentUser('저장');
    if (!author) return;
    const area = editArea();
    if (!area || !state.edit.active) return;
    setPageStatus('Saving...', '');
    const data = await apiFetch('/page', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentWikiPath(), content: editablePageHtml(), author }),
    });
    state.edit.original = '';
    state.edit.active = false;
    area.contentEditable = 'false';
    area.classList.remove('wiki-editing');
    state.pageMeta = {
      ...(state.pageMeta || {}),
      path: data.path,
      updated_at: data.updated_at,
      updated_by: data.updated_by || author,
      has_overlay: true,
      upstream_changed: false,
    };
    syncEditControls();
    updatePageMeta();
    setPageStatus(`Saved by ${data.updated_by || author} · ${formatFullDateTime(data.updated_at)}`, 'success');
    await markSeen();
    await refreshNav();
  }

  function handleEditTool(action) {
    const area = editArea();
    if (!area || !state.edit.active) return;
    if (action === 'bold') runCommand('bold');
    if (action === 'bullet') runCommand('insertUnorderedList');
    if (action === 'numbered') runCommand('insertOrderedList');
    if (action === 'table') insertTable(area);
    if (action === 'cards2') insertCards(area, 2);
    if (action === 'cards3') insertCards(area, 3);
    if (action === 'callout') insertCallout(area);
    if (action === 'faq') insertFaq(area);
    area.focus();
  }

  function createModal(title) {
    const modal = document.createElement('div');
    modal.className = 'wiki-modal';
    modal.innerHTML = `
      <div class="wiki-modal-card" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="wiki-modal-header">
          <h2>${title}</h2>
          <button type="button" class="btn-wiki icon" data-modal-close aria-label="닫기">×</button>
        </div>
        <div class="wiki-modal-body"></div>
      </div>
    `;
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-modal-close]')) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
    return modal;
  }

  async function openHistory() {
    const modal = createModal('Page History');
    const body = modal.querySelector('.wiki-modal-body');
    body.innerHTML = '<div class="history-loading">히스토리를 불러오는 중입니다.</div>';
    const data = await apiFetch(`/revisions?path=${encodeURIComponent(currentWikiPath())}`);
    const current = data.current || {};
    const revisions = Array.isArray(data.revisions) ? data.revisions : [];
    body.innerHTML = `
      <div class="history-current">
        <div class="history-label">Current</div>
        <div>${current.updated_by || 'local'} · ${formatFullDateTime(current.updated_at) || 'No local edits yet'}</div>
      </div>
      <div class="history-list" data-history-list></div>
      <div class="history-preview" data-history-preview>
        <p>히스토리 항목의 View를 누르면 당시 내용을 확인할 수 있습니다.</p>
      </div>
    `;
    const list = body.querySelector('[data-history-list]');
    if (!revisions.length) {
      list.innerHTML = '<div class="history-empty">저장된 히스토리가 없습니다.</div>';
      return;
    }
    revisions.forEach((revision) => {
      const row = document.createElement('div');
      row.className = 'history-row';
      row.innerHTML = `
        <div>
          <strong>${revision.action || 'update'}</strong>
          <span>${revision.updated_by || 'local'} · ${formatFullDateTime(revision.created_at)}</span>
        </div>
        <button type="button" class="btn-wiki" data-revision-id="${revision.id}">View</button>
      `;
      list.appendChild(row);
    });
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-revision-id]');
      if (!button) return;
      const preview = body.querySelector('[data-history-preview]');
      preview.innerHTML = '<p>불러오는 중입니다.</p>';
      const revision = await apiFetch(`/revisions/${encodeURIComponent(button.dataset.revisionId)}`);
      preview.innerHTML = `
        <div class="history-preview-meta">
          ${revision.action || 'update'} · ${revision.updated_by || 'local'} · ${formatFullDateTime(revision.created_at)}
        </div>
        <div class="history-preview-content">${revision.content || '<p>내용 없음</p>'}</div>
      `;
    });
  }

  function updateCommentAuthorLabel() {
    const label = document.querySelector('[data-comment-author]');
    if (label) label.textContent = currentUserLabel();
  }

  function commentTree(comments) {
    const map = new Map();
    const roots = [];
    comments.forEach((comment) => {
      map.set(comment.id, { comment, children: [] });
    });
    map.forEach((node) => {
      const parentId = node.comment.parent_id;
      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  function makeInlineCommentEditor(mode, comment) {
    const editor = document.createElement('div');
    editor.className = 'inline-comment-editor';
    editor.innerHTML = `
      <textarea class="wiki-textarea" rows="3">${mode === 'edit' ? comment.body || '' : ''}</textarea>
      <div class="inline-comment-actions">
        <button type="button" class="btn-wiki primary" data-comment-submit="${mode}" data-comment-id="${comment.id}">
          ${mode === 'edit' ? '저장' : '전송'}
        </button>
        <button type="button" class="btn-wiki" data-comment-action="cancel-editor">취소</button>
      </div>
    `;
    return editor;
  }

  function renderCommentNode(node) {
    const { comment, children } = node;
    const wrapper = document.createElement('div');
    wrapper.className = 'comment-thread';
    const item = document.createElement('article');
    item.className = 'comment-item';
    if (comment.deleted_at) item.classList.add('deleted');

    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const edited = !comment.deleted_at && !sameMinute(comment.created_at, comment.updated_at) ? ' · 수정됨' : '';
    meta.textContent = `${comment.author || 'local'} · ${formatTime(comment.created_at)}${edited}`;
    const body = document.createElement('p');
    body.textContent = comment.deleted_at ? '삭제된 메모입니다.' : comment.body;
    item.appendChild(meta);
    item.appendChild(body);

    if (!comment.deleted_at) {
      const actions = document.createElement('div');
      actions.className = 'comment-actions';
      actions.appendChild(commentActionButton('Reply', 'reply', comment.id));
      if (currentUser() && currentUser() === comment.author) {
        actions.appendChild(commentActionButton('Edit', 'edit', comment.id));
        actions.appendChild(commentActionButton('Del', 'delete', comment.id));
      }
      item.appendChild(actions);
    }

    if (state.commentEditor && state.commentEditor.id === comment.id) {
      item.appendChild(makeInlineCommentEditor(state.commentEditor.mode, comment));
    }

    wrapper.appendChild(item);
    if (children.length) {
      const replies = document.createElement('div');
      replies.className = 'comment-replies';
      children.forEach((child) => replies.appendChild(renderCommentNode(child)));
      wrapper.appendChild(replies);
    }
    return wrapper;
  }

  function commentActionButton(label, action, id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'comment-action-btn';
    button.dataset.commentAction = action;
    button.dataset.commentId = id;
    button.textContent = label;
    return button;
  }

  function renderComments() {
    const list = document.querySelector('[data-comments-list]');
    if (!list) return;
    list.innerHTML = '';
    if (!state.comments.length) {
      const empty = document.createElement('div');
      empty.className = 'comment-empty';
      empty.textContent = '아직 메모가 없습니다.';
      list.appendChild(empty);
      return;
    }
    commentTree(state.comments).forEach((node) => list.appendChild(renderCommentNode(node)));
  }

  async function loadComments() {
    if (!isHttp || !isEditablePage()) return;
    const data = await apiFetch(`/comments?path=${encodeURIComponent(currentWikiPath())}`);
    state.comments = Array.isArray(data.comments) ? data.comments : [];
    renderComments();
  }

  async function postComment(body, parentId = null) {
    const author = requireCurrentUser('전송');
    if (!author) return false;
    await apiFetch('/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentWikiPath(), body, parent_id: parentId, author }),
    });
    state.commentEditor = null;
    await loadComments();
    return true;
  }

  async function updateComment(commentId, body) {
    const author = requireCurrentUser('수정');
    if (!author) return false;
    await apiFetch(`/comments/${encodeURIComponent(commentId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, author }),
    });
    state.commentEditor = null;
    await loadComments();
    return true;
  }

  async function deleteComment(commentId) {
    const author = requireCurrentUser('삭제');
    if (!author) return false;
    if (!window.confirm('이 메모를 삭제할까요?')) return false;
    await apiFetch(`/comments/${encodeURIComponent(commentId)}?author=${encodeURIComponent(author)}`, { method: 'DELETE' });
    state.commentEditor = null;
    await loadComments();
    return true;
  }

  function createCommentsRail() {
    if (!isHttp || !isEditablePage()) return;
    const rail = document.createElement('aside');
    rail.className = 'wiki-comments-panel';
    rail.innerHTML = `
      <div class="comments-header">
        <div>
          <div class="comments-kicker">Page Chat</div>
          <h2>Chat</h2>
        </div>
        <button type="button" class="btn-wiki icon comment-toggle" data-comments-toggle title="Chat 패널 접기" aria-label="Chat 패널 접기">
          <span class="comment-toggle-icon" aria-hidden="true"></span>
        </button>
      </div>
      <div class="comments-body" data-comments-list></div>
      <div class="comment-composer">
        <div class="comment-author">작성자 <strong data-comment-author>${currentUserLabel()}</strong></div>
        <textarea class="wiki-textarea" data-comment-input rows="4" placeholder="페이지별 의견을 남기세요."></textarea>
        <button type="button" class="btn-wiki primary" data-comment-submit-main>전송</button>
      </div>
    `;
    document.body.appendChild(rail);
    rail.querySelector('[data-comments-toggle]').addEventListener('click', () => {
      rail.classList.toggle('collapsed');
      const collapsed = rail.classList.contains('collapsed');
      const button = rail.querySelector('[data-comments-toggle]');
      button.title = collapsed ? 'Chat 패널 열기' : 'Chat 패널 접기';
      button.setAttribute('aria-label', button.title);
    });
    rail.addEventListener('click', (event) => {
      const mainSubmit = event.target.closest('[data-comment-submit-main]');
      if (mainSubmit) {
        const textarea = rail.querySelector('[data-comment-input]');
        const body = textarea.value.trim();
        if (!body) {
          textarea.focus();
          return;
        }
        postComment(body)
          .then((ok) => {
            if (ok) textarea.value = '';
          })
          .catch((err) => window.alert(`메모 저장 실패: ${err.message || err}`));
        return;
      }

      const inlineSubmit = event.target.closest('[data-comment-submit]');
      if (inlineSubmit) {
        const editor = inlineSubmit.closest('.inline-comment-editor');
        const textarea = editor.querySelector('textarea');
        const body = textarea.value.trim();
        if (!body) {
          textarea.focus();
          return;
        }
        const id = Number(inlineSubmit.dataset.commentId);
        const task = inlineSubmit.dataset.commentSubmit === 'edit'
          ? updateComment(id, body)
          : postComment(body, id);
        task.catch((err) => window.alert(`메모 처리 실패: ${err.message || err}`));
        return;
      }

      const actionButton = event.target.closest('[data-comment-action]');
      if (!actionButton) return;
      const id = Number(actionButton.dataset.commentId);
      const action = actionButton.dataset.commentAction;
      if (action === 'cancel-editor') {
        state.commentEditor = null;
        renderComments();
        return;
      }
      if (action === 'reply') {
        const author = requireCurrentUser('답글 작성');
        if (!author) return;
        state.commentEditor = { mode: 'reply', id };
        renderComments();
        const active = document.querySelector('.inline-comment-editor textarea');
        if (active) active.focus();
        return;
      }
      if (action === 'edit') {
        const author = requireCurrentUser('수정');
        if (!author) return;
        state.commentEditor = { mode: 'edit', id };
        renderComments();
        const active = document.querySelector('.inline-comment-editor textarea');
        if (active) active.focus();
        return;
      }
      if (action === 'delete') {
        deleteComment(id).catch((err) => window.alert(`메모 삭제 실패: ${err.message || err}`));
      }
    });
    loadComments().catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!isHttp || !isEditablePage()) return;
    try {
      await loadUsers();
      setupEditableArea();
      await refreshNav();
      await loadPageMeta();
      await markSeen();
    } catch (err) {
      console.warn('Wiki shell init failed', err);
    }
    createCommentsRail();
  });
})();
