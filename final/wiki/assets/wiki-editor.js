(function () {
  const apiBase = '/api/wiki';
  const editableDocPaths = new Set(['/docs/ppt', '/docs/one-pager']);
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  const state = {
    users: [],
    nav: null,
    currentUser: '',
    comments: [],
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
    }).format(date);
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
    renderUserBar();
    await markSeen();
    await refreshNav();
  }

  function populateUserSelect(select) {
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

  function renderAuthorControl(container) {
    const author = document.createElement('div');
    author.className = 'sidebar-author-control';
    author.innerHTML = `
      <label for="wiki-author-select">작성자</label>
      <div class="sidebar-author-row">
        <select id="wiki-author-select" class="wiki-select" data-user-select aria-label="작성자"></select>
        <button type="button" class="btn-wiki icon" data-user-add title="사용자 추가">+</button>
      </div>
    `;
    container.appendChild(author);
    populateUserSelect(author.querySelector('[data-user-select]'));
    author.querySelector('[data-user-add]').addEventListener('click', () => {
      addUser().catch((err) => window.alert(`사용자 추가 실패: ${err.message || err}`));
    });
    author.querySelector('[data-user-select]').addEventListener('change', async (event) => {
      state.currentUser = event.target.value;
      updateCommentAuthorLabel();
      await markSeen();
      await refreshNav();
    });
  }

  function renderSidebarActions(sidebar, categories) {
    const manage = document.createElement('div');
    manage.className = 'sidebar-manage';

    const heading = document.createElement('div');
    heading.className = 'sidebar-manage-title';
    heading.textContent = 'Wiki Manage';
    manage.appendChild(heading);
    renderAuthorControl(manage);

    const tools = document.createElement('div');
    tools.className = 'sidebar-tools';
    tools.appendChild(createButton('+ Category', 'btn-wiki sidebar-btn', 'sidebar-category'));
    tools.appendChild(createButton('+ Page', 'btn-wiki sidebar-btn', 'sidebar-page'));

    const panel = document.createElement('div');
    panel.className = 'sidebar-create-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <select class="wiki-select" data-new-page-category aria-label="카테고리"></select>
      <input type="text" class="wiki-input" data-new-page-title placeholder="페이지 제목">
      <input type="text" class="wiki-input" data-new-page-slug placeholder="url-slug">
      <div class="sidebar-create-actions">
        <button type="button" class="btn-wiki primary" data-create-page>생성</button>
        <button type="button" class="btn-wiki" data-cancel-page>취소</button>
      </div>
    `;

    const categorySelect = panel.querySelector('[data-new-page-category]');
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.title;
      categorySelect.appendChild(option);
    });
    if (categorySelect.querySelector('option[value="concepts"]')) {
      categorySelect.value = 'concepts';
    }

    const titleInput = panel.querySelector('[data-new-page-title]');
    const slugInput = panel.querySelector('[data-new-page-slug]');
    slugInput.dataset.slugTouched = 'false';
    titleInput.addEventListener('input', () => {
      if (slugInput.dataset.slugTouched !== 'true') {
        slugInput.value = slugFromTitle(titleInput.value);
      }
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.slugTouched = 'true';
    });

    tools.querySelector('[data-action="sidebar-page"]').addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) titleInput.focus();
    });
    tools.querySelector('[data-action="sidebar-category"]').addEventListener('click', async () => {
      const author = requireCurrentUser('카테고리 생성');
      if (!author) return;
      const title = window.prompt('새 카테고리 이름');
      if (!title || !title.trim()) return;
      try {
        await apiFetch('/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), author }),
        });
        await refreshNav();
      } catch (err) {
        window.alert(`카테고리 생성 실패: ${err.message || err}`);
      }
    });
    panel.querySelector('[data-cancel-page]').addEventListener('click', () => {
      panel.hidden = true;
      titleInput.value = '';
      slugInput.value = '';
      slugInput.dataset.slugTouched = 'false';
    });
    panel.querySelector('[data-create-page]').addEventListener('click', async () => {
      const author = requireCurrentUser('페이지 생성');
      if (!author) return;
      const title = titleInput.value.trim();
      const slug = slugInput.value.trim() || slugFromTitle(title);
      if (!title) {
        titleInput.focus();
        return;
      }
      try {
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
      } catch (err) {
        window.alert(`페이지 생성 실패: ${err.message || err}`);
      }
    });

    manage.appendChild(tools);
    manage.appendChild(panel);
    sidebar.appendChild(manage);
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

    const logo = sidebar.querySelector('.logo') || document.createElement('a');
    logo.href = '/wiki/overview.html';
    logo.className = 'logo';
    logo.textContent = 'HR AX Platform';

    sidebar.innerHTML = '';
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
    renderSidebarActions(sidebar, navData.categories || []);
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

  function setStatus(toolbar, message, tone) {
    const status = toolbar.querySelector('[data-wiki-status]');
    status.textContent = message || '';
    status.dataset.tone = tone || '';
  }

  function setEditToolsVisible(toolbar, visible) {
    toolbar.querySelectorAll('[data-edit-tool]').forEach((node) => {
      node.hidden = !visible;
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
    if (!tone) return;
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
    insertHtml(main, `<blockquote class="callout cyan"><p><strong>핵심 메모</strong><br>강조할 내용을 입력하세요.</p></blockquote><p></p>`);
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

  function ensureEditableArea(main) {
    let area = main.querySelector(':scope > .wiki-editable-area');
    if (area) return area;

    area = document.createElement('div');
    area.className = 'wiki-editable-area';
    area.tabIndex = -1;
    Array.from(main.childNodes).forEach((node) => {
      area.appendChild(node);
    });
    main.appendChild(area);
    return area;
  }

  function createToolbar() {
    const main = document.querySelector('main.content');
    if (!main || !isHttp || !isEditablePage()) return;
    const editArea = ensureEditableArea(main);

    const toolbar = document.createElement('div');
    toolbar.className = 'wiki-toolbar';
    toolbar.innerHTML = `
      <select class="wiki-select" data-action="style" data-edit-tool hidden aria-label="Text style">
        <option value="p">본문</option>
        <option value="h2">제목</option>
        <option value="h3">소제목</option>
        <option value="h4">내용 제목</option>
        <option value="dim">보조 설명</option>
      </select>
      <button type="button" class="btn-wiki" data-action="bold" data-edit-tool hidden>Bold</button>
      <button type="button" class="btn-wiki" data-action="bullet" data-edit-tool hidden>List</button>
      <button type="button" class="btn-wiki" data-action="numbered" data-edit-tool hidden>1. List</button>
      <button type="button" class="btn-wiki" data-action="table" data-edit-tool hidden>Table</button>
      <button type="button" class="btn-wiki" data-action="cards2" data-edit-tool hidden>2 Cards</button>
      <button type="button" class="btn-wiki" data-action="cards3" data-edit-tool hidden>3 Cards</button>
      <button type="button" class="btn-wiki" data-action="callout" data-edit-tool hidden>Callout</button>
      <button type="button" class="btn-wiki" data-action="faq" data-edit-tool hidden>FAQ</button>
      <select class="wiki-select" data-action="tone" data-edit-tool hidden aria-label="Tone">
        <option value="">색상</option>
        <option value="cyan">정보</option>
        <option value="purple">강조</option>
        <option value="amber">주의</option>
        <option value="green">성공</option>
        <option value="rose">위험</option>
      </select>
      <button type="button" class="btn-wiki" data-action="edit">Edit</button>
      <button type="button" class="btn-wiki primary" data-action="save" hidden>Save</button>
      <button type="button" class="btn-wiki" data-action="cancel" hidden>Cancel</button>
      <span class="wiki-status" data-wiki-status></span>
    `;
    main.insertBefore(toolbar, editArea);
    toolbar.contentEditable = 'false';
    setEditToolsVisible(toolbar, false);

    apiFetch(`/page?path=${encodeURIComponent(currentWikiPath())}`)
      .then((data) => {
        if (data.upstream_changed) {
          setStatus(toolbar, `Local DB edit by ${data.updated_by || 'local'}; seed changed`, 'error');
        } else if (data.has_overlay) {
          setStatus(toolbar, `Local DB edit by ${data.updated_by || 'local'}`, 'success');
        }
      })
      .catch(() => {});

    let original = '';

    toolbar.querySelector('[data-action="edit"]').addEventListener('click', () => {
      original = editArea.innerHTML;
      editArea.contentEditable = 'true';
      editArea.classList.add('wiki-editing');
      toolbar.querySelector('[data-action="edit"]').hidden = true;
      toolbar.querySelector('[data-action="save"]').hidden = false;
      toolbar.querySelector('[data-action="cancel"]').hidden = false;
      setEditToolsVisible(toolbar, true);
      setStatus(toolbar, currentUser() ? `Editing as ${currentUser()}` : '작성자 선택 필요', '');
      editArea.focus();
    });

    toolbar.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      editArea.innerHTML = original;
      editArea.contentEditable = 'false';
      editArea.classList.remove('wiki-editing');
      toolbar.querySelector('[data-action="edit"]').hidden = false;
      toolbar.querySelector('[data-action="save"]').hidden = true;
      toolbar.querySelector('[data-action="cancel"]').hidden = true;
      setEditToolsVisible(toolbar, false);
      setStatus(toolbar, 'Edit cancelled', '');
    });

    toolbar.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const author = requireCurrentUser('저장');
      if (!author) return;
      setStatus(toolbar, 'Saving...', '');
      try {
        await apiFetch('/page', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentWikiPath(), content: editArea.innerHTML, author }),
        });
        editArea.contentEditable = 'false';
        editArea.classList.remove('wiki-editing');
        toolbar.querySelector('[data-action="edit"]').hidden = false;
        toolbar.querySelector('[data-action="save"]').hidden = true;
        toolbar.querySelector('[data-action="cancel"]').hidden = true;
        setEditToolsVisible(toolbar, false);
        setStatus(toolbar, `Saved by ${author}`, 'success');
        await markSeen();
        await refreshNav();
      } catch (err) {
        setStatus(toolbar, `Save failed: ${err.message || err}`, 'error');
      }
    });

    toolbar.addEventListener('click', (event) => {
      const action = event.target.dataset && event.target.dataset.action;
      if (!action || !event.target.hasAttribute('data-edit-tool')) return;
      event.preventDefault();
      if (action === 'bold') runCommand('bold');
      if (action === 'bullet') runCommand('insertUnorderedList');
      if (action === 'numbered') runCommand('insertOrderedList');
      if (action === 'table') insertTable(editArea);
      if (action === 'cards2') insertCards(editArea, 2);
      if (action === 'cards3') insertCards(editArea, 3);
      if (action === 'callout') insertCallout(editArea);
      if (action === 'faq') insertFaq(editArea);
      editArea.focus();
    });

    toolbar.querySelector('[data-action="style"]').addEventListener('change', (event) => {
      applySemanticStyle(editArea, event.target.value);
      event.target.value = 'p';
    });

    toolbar.querySelector('[data-action="tone"]').addEventListener('change', (event) => {
      applyTone(editArea, event.target.value);
      event.target.value = '';
      editArea.focus();
    });
  }

  function updateCommentAuthorLabel() {
    const label = document.querySelector('[data-comment-author]');
    if (label) label.textContent = currentUserLabel();
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
    state.comments.forEach((comment) => {
      const item = document.createElement('article');
      item.className = 'comment-item';
      const meta = document.createElement('div');
      meta.className = 'comment-meta';
      meta.textContent = `${comment.author || 'local'} · ${formatTime(comment.created_at)}`;
      const body = document.createElement('p');
      body.textContent = comment.body;
      item.appendChild(meta);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  async function loadComments() {
    if (!isHttp || !isEditablePage()) return;
    const data = await apiFetch(`/comments?path=${encodeURIComponent(currentWikiPath())}`);
    state.comments = Array.isArray(data.comments) ? data.comments : [];
    renderComments();
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
        <button type="button" class="btn-wiki primary" data-comment-submit>전송</button>
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
    rail.querySelector('[data-comment-submit]').addEventListener('click', async () => {
      const author = requireCurrentUser('전송');
      if (!author) return;
      const textarea = rail.querySelector('[data-comment-input]');
      const body = textarea.value.trim();
      if (!body) {
        textarea.focus();
        return;
      }
      try {
        const data = await apiFetch('/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentWikiPath(), body, author }),
        });
        state.comments.push(data.comment);
        textarea.value = '';
        renderComments();
      } catch (err) {
        window.alert(`메모 저장 실패: ${err.message || err}`);
      }
    });
    loadComments().catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!isHttp || !isEditablePage()) return;
    try {
      await loadUsers();
      await markSeen();
      await refreshNav();
    } catch (err) {
      console.warn('Wiki shell init failed', err);
    }
    createToolbar();
    createCommentsRail();
  });
})();
