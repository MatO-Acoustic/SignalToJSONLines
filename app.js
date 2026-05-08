(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  const KNOWN_IDENTIFIERS = new Set(['email', 'sms', 'whatsapp']);

  let appKey               = '';
  let signalType           = '';
  let activeIdentifiers    = []; // currently selected identifier keys (one or more)
  let availableIdentifiers = []; // all identifier types found in the template
  let testFlag             = false;
  let signalFields         = []; // prefixed: ["identifier:email", "content:orderId", "session:sessionId", ...]
  let parsedHeaders        = [];
  let parsedData           = [];

  // ── Element refs — Step 1 ───────────────────────────────────
  const appKeyInput       = document.getElementById('app-key');
  const signalDropZone    = document.getElementById('signal-drop-zone');
  const signalFileInput   = document.getElementById('signal-file-input');
  const signalParseStatus  = document.getElementById('signal-parse-status');
  const signalJsonInput    = document.getElementById('signal-json-input');
  const identifierPickerEl = document.getElementById('identifier-picker');
  const signalSummary     = document.getElementById('signal-summary');
  const signalTypeDisplay = document.getElementById('signal-type-display');
  const signalIdDisplay   = document.getElementById('signal-identifier-display');
  const signalFieldsList  = document.getElementById('signal-content-fields');
  const testFlagInput     = document.getElementById('test-flag');
  const emptyHint         = document.getElementById('signal-empty-hint');
  const signalStepBadge   = document.getElementById('signal-step-badge');

  // ── Element refs — Reset ────────────────────────────────────
  const resetBtn = document.getElementById('reset-btn');

  // ── Element refs — Step 2 ───────────────────────────────────
  const dropZone   = document.getElementById('drop-zone');
  const fileInput  = document.getElementById('file-input');
  const fileStatus = document.getElementById('file-status');

  // ── Element refs — Steps 3–5 ────────────────────────────────
  const stepMapping    = document.getElementById('step-mapping');
  const mappingTbody   = document.getElementById('mapping-tbody');
  const mappingSummary = document.getElementById('mapping-summary');
  const stepPreview    = document.getElementById('step-preview');
  const previewBlock   = document.getElementById('preview-block');
  const rowCountEl     = document.getElementById('row-count');
  const stepDownload   = document.getElementById('step-download');
  const downloadBtn    = document.getElementById('download-btn');
  const downloadHintEl = document.getElementById('download-hint');

  // ── Step 1: App key ─────────────────────────────────────────

  appKeyInput.addEventListener('input', () => {
    appKey = appKeyInput.value.trim();
    onStep1Changed();
    if (parsedHeaders.length && isStep1Ready()) updatePreview();
  });

  // ── Step 1: Blank signal file upload ────────────────────────

  signalDropZone.addEventListener('click', () => signalFileInput.click());
  signalDropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') signalFileInput.click(); });
  signalDropZone.addEventListener('dragover', e => { e.preventDefault(); signalDropZone.classList.add('dragover'); });
  signalDropZone.addEventListener('dragleave', () => signalDropZone.classList.remove('dragover'));
  signalDropZone.addEventListener('drop', e => {
    e.preventDefault();
    signalDropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleSignalFile(file);
  });
  signalFileInput.addEventListener('change', () => {
    if (signalFileInput.files[0]) handleSignalFile(signalFileInput.files[0]);
  });

  async function handleSignalFile(file) {
    showSignalStatus('', '');
    try {
      const text = await file.text();
      parseSignalJson(text, file.name);
      signalJsonInput.value = '';
    } catch (err) {
      showSignalStatus('Error reading file: ' + err.message, 'error');
    }
  }

  function parseGraphQL(text) {
    const allIdentifiers  = [];   // every identifier key found (commented or not)
    let defaultIdentifier = '';   // first uncommented one
    const signalContent   = {};
    let extractedAppKey   = '';
    const sectionStack    = [];

    for (const rawLine of text.split('\n')) {
      const trimmed    = rawLine.trim();
      const isOptional = trimmed.startsWith('#');
      const line       = isOptional ? trimmed.slice(1).trim() : trimmed;

      const openMatch = line.match(/^(\w+)\s*:\s*\{/);
      if (openMatch) { sectionStack.push(openMatch[1]); continue; }
      if (/^[)}\]],?$/.test(line)) { sectionStack.pop(); continue; }

      const section = sectionStack[sectionStack.length - 1];
      const cleaned = line.replace(/#.*$/, '').trim();
      const m = cleaned.match(/^(\w+)\s*:\s*(?:"([^"]*)"|([\w.-]+))/);
      if (!m) continue;

      const key   = m[1];
      const value = m[2] !== undefined ? m[2] : (m[3] || '');

      if (section === 'signal' && key === 'appKey') {
        extractedAppKey = value;
      } else if (key === 'sessionId') {
        // skip — tool always injects this
      } else if (section === 'identifiableAttributes') {
        allIdentifiers.push(key);
        if (!isOptional && !defaultIdentifier) defaultIdentifier = key;
      } else if (section === 'signalContent') {
        signalContent[key] = key === 'signalType' ? value : '';
      }
    }

    if (!allIdentifiers.length)
      throw new Error('No identifiers found in identifiableAttributes.');
    if (!Object.keys(signalContent).length)
      throw new Error('No signalContent fields found in mutation.');

    const activeIdentifier = defaultIdentifier || allIdentifiers[0];
    return {
      extractedAppKey,
      allIdentifiers,
      defaultIdentifier: activeIdentifier,
      identifiableAttributes: { [activeIdentifier]: '' },
      signalContent
    };
  }

  function parseSignalJson(text, sourceName) {
    let s;
    let gqlAllIdentifiers = null;

    try {
      const parsed = JSON.parse(text);
      s = parsed.signal || parsed;
    } catch (_) {
      if (!/createSignal|identifiableAttributes/i.test(text)) {
        throw new Error('Invalid format — paste a GraphQL signal mutation or a JSON signal payload.');
      }
      const gql = parseGraphQL(text);
      if (gql.extractedAppKey && !appKeyInput.value.trim()) {
        appKeyInput.value = gql.extractedAppKey;
        appKey = gql.extractedAppKey;
      }
      gqlAllIdentifiers = gql.allIdentifiers;
      s = { identifiableAttributes: gql.identifiableAttributes, signalContent: gql.signalContent };
    }

    if (!s.signalContent)
      throw new Error('No signalContent found. Make sure this is a valid signal.');
    if (!s.identifiableAttributes)
      throw new Error('No identifiableAttributes found. The signal must include an identifier (email, sms, whatsapp, or contactKey).');

    const idKeys = Object.keys(s.identifiableAttributes);
    if (!idKeys.length)
      throw new Error('identifiableAttributes is empty — must contain at least one identifier key.');

    const extractedSignalType = s.signalContent.signalType || '';
    const defaultActive       = idKeys[0];

    if (s.appKey && !appKeyInput.value.trim()) {
      appKeyInput.value = s.appKey;
      appKey = s.appKey;
    }

    const fields = [`identifier:${defaultActive}`];
    Object.keys(s.signalContent).forEach(k => {
      if (k !== 'signalType') fields.push(`content:${k}`);
    });
    if (!fields.includes('content:signalTimestamp')) fields.push('content:signalTimestamp');
    fields.push('session:sessionId');

    signalType           = extractedSignalType;
    activeIdentifiers    = [defaultActive];
    signalFields         = fields;
    availableIdentifiers = gqlAllIdentifiers || idKeys;

    showSignalStatus(`${sourceName} — parsed successfully`, 'success');
    renderSignalSummary();
    renderIdentifierPicker();

    if (parsedHeaders.length && isStep1Ready()) {
      Mapper.init(signalFields, parsedHeaders);
      renderMappingTable();
      updatePreview();
    }
    onStep1Changed();
  }

  // ── Step 1: Paste JSON ───────────────────────────────────────

  function autoResizeTextarea() {
    signalJsonInput.style.height = 'auto';
    signalJsonInput.style.height = signalJsonInput.scrollHeight + 'px';
  }

  let _pasteDebounce = null;
  signalJsonInput.addEventListener('input', () => {
    autoResizeTextarea();
    clearTimeout(_pasteDebounce);
    const val = signalJsonInput.value.trim();

    if (!val) {
      showSignalStatus('', '');
      signalType = ''; identifierType = ''; signalFields = [];
      signalSummary.classList.add('hidden');
      onStep1Changed();
      return;
    }

    _pasteDebounce = setTimeout(() => {
      try {
        parseSignalJson(val, 'pasted JSON');
        signalFileInput.value = '';
      } catch (err) {
        showSignalStatus('Error: ' + err.message, 'error');
        signalType = ''; identifierType = ''; signalFields = [];
        signalSummary.classList.add('hidden');
        onStep1Changed();
      }
    }, 400);
  });

  function showSignalStatus(msg, type) {
    signalParseStatus.textContent = msg;
    signalParseStatus.className   = 'file-status ' + type;
    signalParseStatus.classList.toggle('hidden', !msg);
  }

  function renderSignalSummary() {
    signalTypeDisplay.textContent = signalType || '(unknown)';

    signalFieldsList.innerHTML = '';
    signalFields.forEach(field => {
      if (field.startsWith('content:') || field === 'session:sessionId') {
        const tag = document.createElement('span');
        tag.className   = 'tag';
        tag.textContent = Mapper.getLabel(field);
        signalFieldsList.appendChild(tag);
      }
    });

    signalSummary.classList.remove('hidden');
  }

  // ── Step 1: Test flag ────────────────────────────────────────

  testFlagInput.addEventListener('change', () => {
    testFlag = testFlagInput.checked;
    if (parsedHeaders.length && isStep1Ready()) updatePreview();
  });

  // ── Step 1 state helpers ─────────────────────────────────────

  function isStep1Ready() {
    return appKey.length > 0 && signalFields.length > 0 && activeIdentifiers.length > 0;
  }

  function onStep1Changed() {
    const ready = isStep1Ready();
    emptyHint.style.display = ready ? 'none' : '';
    signalStepBadge.textContent = ready ? 'Ready' : '';
    signalStepBadge.classList.toggle('hidden', !ready);

    if (!ready) {
      stepMapping.classList.add('hidden');
      stepPreview.classList.add('hidden');
      stepDownload.classList.add('hidden');
    }
  }

  // ── Step 2: Data file upload ─────────────────────────────────

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    showFileStatus('', '');
    try {
      const result  = await Parser.parse(file);
      parsedHeaders = result.headers;
      parsedData    = result.data;
      showFileStatus(
        `${file.name} — ${parsedData.length.toLocaleString()} rows, ${parsedHeaders.length} columns`,
        'success'
      );
      if (isStep1Ready()) {
        Mapper.init(signalFields, parsedHeaders);
        renderMappingTable();
        updatePreview();
      }
    } catch (err) {
      showFileStatus('Error: ' + err.message, 'error');
    }
  }

  function showFileStatus(msg, type) {
    fileStatus.textContent = msg;
    fileStatus.className   = 'file-status ' + type;
    fileStatus.classList.toggle('hidden', !msg);
  }

  // ── Step 3: Mapping table ────────────────────────────────────

  function renderMappingTable() {
    mappingTbody.innerHTML = '';

    const identifierFields = signalFields.filter(f => f.startsWith('identifier:'));
    const contentFields    = signalFields.filter(f => f.startsWith('content:'));
    const sessionFields    = signalFields.filter(f => f.startsWith('session:'));

    parsedHeaders.forEach(col => {
      const currentVal = Mapper.getMapping(col);
      const available  = Mapper.availableFieldsFor(col);
      const isAvail    = f => available.includes(f) || currentVal === f;

      let optHtml = `<option value="">— unassigned —</option>`;
      optHtml    += `<option value="__ignore__"${currentVal === '__ignore__' ? ' selected' : ''}>Ignore column</option>`;

      if (identifierFields.length) {
        optHtml += `<optgroup label="Identifier">`;
        identifierFields.forEach(f => {
          const disabled = isAvail(f) ? '' : ' disabled';
          const selected = currentVal === f ? ' selected' : '';
          optHtml += `<option value="${esc(f)}"${disabled}${selected}>${esc(Mapper.getLabel(f))}</option>`;
        });
        optHtml += `</optgroup>`;
      }

      if (contentFields.length) {
        optHtml += `<optgroup label="Signal content">`;
        contentFields.forEach(f => {
          const disabled = isAvail(f) ? '' : ' disabled';
          const selected = currentVal === f ? ' selected' : '';
          optHtml += `<option value="${esc(f)}"${disabled}${selected}>${esc(Mapper.getLabel(f))}</option>`;
        });
        optHtml += `</optgroup>`;
      }

      if (sessionFields.length) {
        optHtml += `<optgroup label="Optional">`;
        sessionFields.forEach(f => {
          const disabled = isAvail(f) ? '' : ' disabled';
          const selected = currentVal === f ? ' selected' : '';
          optHtml += `<option value="${esc(f)}"${disabled}${selected}>${esc(Mapper.getLabel(f))}</option>`;
        });
        optHtml += `</optgroup>`;
      }

      // Status badge
      let statusLabel, statusClass;
      if (!currentVal)                            { statusLabel = 'Unmatched';  statusClass = 'unmatched'; }
      else if (currentVal === '__ignore__')        { statusLabel = 'Ignored';    statusClass = 'ignored'; }
      else if (currentVal.startsWith('identifier:')) { statusLabel = 'Identifier'; statusClass = 'identifier'; }
      else if (currentVal === 'session:sessionId') { statusLabel = 'Session';    statusClass = 'matched'; }
      else                                         { statusLabel = 'Matched';    statusClass = 'matched'; }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-name">${esc(col)}</td>
        <td>
          <select class="mapping-select" data-col="${esc(col)}">
            ${optHtml}
          </select>
        </td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      `;

      tr.querySelector('.mapping-select').addEventListener('change', e => {
        Mapper.setMapping(col, e.target.value || null);
        renderMappingTable();
        updatePreview();
      });

      mappingTbody.appendChild(tr);
    });

    const stats = Mapper.getStats();
    mappingSummary.textContent = `${stats.matched} / ${stats.total} mapped`;
    stepMapping.classList.remove('hidden');
  }

  // ── Steps 4–5: Preview & Download ────────────────────────────

  function updatePreview() {
    const mappings = Mapper.getMappings();
    previewBlock.textContent = Exporter.preview(appKey, signalType, testFlag, parsedHeaders, parsedData, mappings);
    rowCountEl.textContent   = `${parsedData.length.toLocaleString()} rows`;
    updateDownloadHint();
    stepPreview.classList.remove('hidden');
    stepDownload.classList.remove('hidden');
  }

  downloadBtn.addEventListener('click', () => {
    const mappings = Mapper.getMappings();
    const filename = Exporter.download(appKey, signalType, testFlag, parsedHeaders, parsedData, mappings);
    downloadHintEl.textContent = `Downloaded: ${filename}`;
  });

  function updateDownloadHint() {
    const today = new Date().toISOString().slice(0, 10);
    downloadHintEl.textContent = `${signalType || 'signal'}_${today}.jsonl`;
  }

  // ── Identifier picker ────────────────────────────────────────

  function renderIdentifierPicker() {
    if (availableIdentifiers.length <= 1) {
      signalIdDisplay.textContent = availableIdentifiers[0] || '';
      signalIdDisplay.classList.remove('hidden');
      identifierPickerEl.classList.add('hidden');
      return;
    }

    identifierPickerEl.innerHTML = '';
    availableIdentifiers.forEach(id => {
      const isContactKey = !KNOWN_IDENTIFIERS.has(id);
      const label = document.createElement('label');
      label.className = 'id-check-label';

      const cb = document.createElement('input');
      cb.type    = 'checkbox';
      cb.value   = id;
      cb.checked = activeIdentifiers.includes(id);
      cb.addEventListener('change', onIdentifierCheckboxChange);

      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + id + (isContactKey ? ' (contact key)' : '')));
      identifierPickerEl.appendChild(label);
    });

    signalIdDisplay.classList.add('hidden');
    identifierPickerEl.classList.remove('hidden');
    applyIdentifierConstraints();
  }

  function onIdentifierCheckboxChange() {
    const checkboxes = [...identifierPickerEl.querySelectorAll('input[type=checkbox]')];
    const checked    = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    setIdentifiers(checked);
    applyIdentifierConstraints();
  }

  function applyIdentifierConstraints() {
    const checkboxes = [...identifierPickerEl.querySelectorAll('input[type=checkbox]')];
    const checked    = checkboxes.filter(cb => cb.checked).map(cb => cb.value);

    // Nothing checked — enable everything so the user can pick freely
    if (checked.length === 0) {
      checkboxes.forEach(cb => {
        cb.disabled = false;
        cb.closest('label').classList.remove('disabled');
      });
      return;
    }

    const hasSms      = checked.includes('sms');
    const hasWhatsapp = checked.includes('whatsapp');

    checkboxes.forEach(cb => {
      if (cb.checked) {
        cb.disabled = false;
        cb.closest('label').classList.remove('disabled');
        return;
      }

      const id      = cb.value;
      const disable = (id === 'sms' && hasWhatsapp) || (id === 'whatsapp' && hasSms);

      cb.disabled = disable;
      cb.closest('label').classList.toggle('disabled', disable);
    });
  }

  function setIdentifiers(types) {
    activeIdentifiers = [...types];

    const nonIdentifier = signalFields.filter(f => !f.startsWith('identifier:'));
    signalFields = [...types.map(t => `identifier:${t}`), ...nonIdentifier];

    signalIdDisplay.textContent = types.join(' + ');

    if (parsedHeaders.length && isStep1Ready()) {
      Mapper.init(signalFields, parsedHeaders);
      renderMappingTable();
      updatePreview();
    }
  }

  // ── Reset ─────────────────────────────────────────────────────

  resetBtn.addEventListener('click', resetApp);

  function resetApp() {
    appKey = ''; signalType = ''; activeIdentifiers = []; testFlag = false;
    availableIdentifiers = [];
    signalFields = []; parsedHeaders = []; parsedData = [];

    appKeyInput.value      = '';
    signalFileInput.value  = '';
    signalJsonInput.value  = '';
    fileInput.value        = '';
    testFlagInput.checked  = false;

    Mapper.reset();

    showSignalStatus('', '');
    signalSummary.classList.add('hidden');
    signalIdDisplay.textContent = '';
    signalIdDisplay.classList.remove('hidden');
    identifierPickerEl.innerHTML = '';
    identifierPickerEl.classList.add('hidden');
    showFileStatus('', '');
    mappingTbody.innerHTML = '';

    stepMapping.classList.add('hidden');
    stepPreview.classList.add('hidden');
    stepDownload.classList.add('hidden');

    onStep1Changed();
    updateDownloadHint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Utility ───────────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────
  onStep1Changed();
  updateDownloadHint();

})();
