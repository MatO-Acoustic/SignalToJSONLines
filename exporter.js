const Exporter = (() => {
  function buildLine(appKey, signalType, testFlag, row, headers, mappings) {
    const signal = {
      appKey,
      identifiableAttributes: {},
      signalContent: { signalType }
    };

    if (testFlag) signal.test = true;

    headers.forEach((col, i) => {
      const target = mappings.get(col);
      if (!target || target === '__ignore__') return;

      const raw = row[i];
      const val = (raw === undefined || raw === null) ? '' : String(raw);

      if (target.startsWith('identifier:')) {
        signal.identifiableAttributes[target.slice(11)] = val;
      } else if (target.startsWith('content:')) {
        signal.signalContent[target.slice(8)] = val;
      } else if (target === 'session:sessionId') {
        if (val) signal.sessionId = val;
      }
    });

    return JSON.stringify({ signal });
  }

  function buildLines(appKey, signalType, testFlag, headers, data, mappings) {
    return data.map(row => buildLine(appKey, signalType, testFlag, row, headers, mappings));
  }

  function preview(appKey, signalType, testFlag, headers, data, mappings, limit = 5) {
    if (!data.length) return '(no data loaded)';
    const lines = buildLines(appKey, signalType, testFlag, headers, data.slice(0, limit), mappings);
    return lines.join('\n') || '(no fields mapped yet)';
  }

  function download(appKey, signalType, testFlag, headers, data, mappings) {
    const lines = buildLines(appKey, signalType, testFlag, headers, data, mappings);
    const blob  = new Blob([lines.join('\n')], { type: 'application/x-ndjson' });
    const url   = URL.createObjectURL(blob);

    const today    = new Date().toISOString().slice(0, 10);
    const filename = `${signalType || 'signal'}_${today}.jsonl`;

    const a = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    return filename;
  }

  return { preview, download };
})();
