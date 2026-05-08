const Mapper = (() => {
  let _signalFields  = [];
  let _sourceColumns = [];
  // Map<sourceCol, prefixedField | '__ignore__' | null>
  let _mappings = new Map();

  function normalise(s) {
    return String(s).toLowerCase().replace(/[\s_\-]+/g, '');
  }

  // Extract the name portion from a prefixed field ("content:orderId" → "orderId")
  function fieldName(f) {
    const i = f.indexOf(':');
    return i >= 0 ? f.slice(i + 1) : f;
  }

  // Human-readable label for dropdown display
  function getLabel(field) {
    if (!field || field === '__ignore__')          return 'Ignore column';
    if (field === 'session:sessionId')             return 'sessionId (optional)';
    if (field === 'content:signalTimestamp')       return 'signalTimestamp (30-day window)';
    if (field.startsWith('identifier:')) return fieldName(field) + ' (identifier)';
    if (field.startsWith('content:'))    return fieldName(field);
    return field;
  }

  function init(signalFields, sourceColumns) {
    _signalFields  = [...signalFields];
    _sourceColumns = [...sourceColumns];

    const prevMappings = new Map(_mappings);
    _mappings = new Map();

    sourceColumns.forEach(col => {
      const prev = prevMappings.get(col);

      if (prev === '__ignore__') {
        _mappings.set(col, '__ignore__');
        return;
      }

      if (prev && _signalFields.includes(prev)) {
        _mappings.set(col, prev);
        return;
      }

      // Auto-match: compare source col against the name portion of each prefixed field
      const normCol   = normalise(col);
      const exactMatch = _signalFields.find(f => fieldName(f) === col);
      const normMatch  = _signalFields.find(f => normalise(fieldName(f)) === normCol);

      _mappings.set(col, exactMatch || normMatch || null);
    });
  }

  function setMapping(sourceCol, value) {
    _mappings.set(sourceCol, value || null);
  }

  function availableFieldsFor(exceptCol) {
    const claimed = new Set();
    _mappings.forEach((val, col) => {
      if (col !== exceptCol && val && val !== '__ignore__') claimed.add(val);
    });
    return _signalFields.filter(f => !claimed.has(f));
  }

  function getMapping(col)  { return _mappings.get(col) ?? null; }
  function getMappings()    { return new Map(_mappings); }

  function getStats() {
    let matched = 0, unmatched = 0, ignored = 0;
    _sourceColumns.forEach(col => {
      const val = _mappings.get(col);
      if (!val)                    unmatched++;
      else if (val === '__ignore__') ignored++;
      else                         matched++;
    });
    return { matched, unmatched, ignored, total: _sourceColumns.length };
  }

  function reset() {
    _signalFields  = [];
    _sourceColumns = [];
    _mappings      = new Map();
  }

  return { init, setMapping, availableFieldsFor, getMapping, getMappings, getStats, getLabel, reset };
})();
