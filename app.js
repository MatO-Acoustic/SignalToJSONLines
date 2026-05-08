(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let appKey         = '';
  let signalType     = '';
  let identifierType = '';
  let testFlag       = false;
  let signalFields   = []; // prefixed: ["identifier:email", "content:orderId", "session:sessionId", ...]
  let parsedHeaders  = [];
  let parsedData     = [];

  // ── Element refs — Step 1 ───────────────────────────────────
  const appKeyInput       = document.getElementById('app-key');
  const signalDropZone    = document.getElementById('signal-drop-zone');
  const signalFileInput   = document.getElementById('signal-file-input');
  const signalParseStatus = document.getElementById('signal-parse-status');
  const signalSummary     = document.getElementById('signal-summary');
  const signalTypeDisplay = document.getElementById('signal-type-display');
  const signalIdDisplay   = document.getElementById('signal-identifier-display');
  const signalFieldsList  = document.getElementById('signal-content-fields');
  const testFlagInput     = document.getElementById('test-flag');
  const emptyHint         = document.getElementById('signal-empty-hint');
  const signalStepBadge   = document.getElementById('signal-step-badge');

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
      const text   = await file.text();
      const parsed = JSON.parse(text);

      // Accept {"signal": {...}} or the inner object directly
      const s = parsed.signal || parsed;

      if (!s.signalContent) {
        throw new Error('No signalContent found. Make sure the file is a valid blank signal.');
      }
      if (!s.identifiableAttributes) {
        throw new Error('No identifiableAttributes found. The signal must include an identifier (email, sms, whatsapp, or contactKey).');
      }

      const idKeys = Object.keys(s.identifiableAttributes);
      if (!idKeys.length) {
        throw new Error('identifiableAttributes is empty — must contain at least one identifier key.');
      }

      const extractedSignalType     = s.signalContent.signalType || '';
      const extractedIdentifierType = idKeys[0];

      // Pre-populate appKey if the template carries one and the field is still empty
      if (s.appKey && !appKeyInput.value.trim()) {
        appKeyInput.value = s.appKey;
        appKey = s.appKey;
      }

      // Build the prefixed field list
      // 1. Contact identifier
      const fields = [`identifier:${extractedIdentifierType}`];
      // 2. Signal content fields (signalType is fixed — exclude from mapping)
      Object.keys(s.signalContent).forEach(k => {
        if (k !== 'signalType') fields.push(`content:${k}`);
      });
      // 3. sessionId is always offered as optional
      fields.push('session:sessionId');

      signalType     = extractedSignalType;
      identifierType = extractedIdentifierType;
      signalFields   = fields;

      showSignalStatus(`${file.name} — parsed successfully`, 'success');
      renderSignalSummary();

      if (parsedHeaders.length && isStep1Ready()) {
        Mapper.init(signalFields, parsedHeaders);
        renderMappingTable();
        updatePreview();
      }
      onStep1Changed();

    } catch (err) {
      showSignalStatus('Error: ' + err.message, 'error');
      signalType     = '';
      identifierType = '';
      signalFields   = [];
      signalSummary.classList.add('hidden');
      onStep1Changed();
    }
  }

  function showSignalStatus(msg, type) {
    signalParseStatus.textContent = msg;
    signalParseStatus.className   = 'file-status ' + type;
    signalParseStatus.classList.toggle('hidden', !msg);
  }

  function renderSignalSummary() {
    signalTypeDisplay.textContent = signalType || '(unknown)';
    signalIdDisplay.textContent   = identifierType;

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
    return appKey.length > 0 && signalFields.length > 0;
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
