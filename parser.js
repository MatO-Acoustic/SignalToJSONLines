const Parser = (() => {
  async function parse(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      raw: false,
      dateNF: 'YYYY-MM-DD',
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) throw new Error('File must have a header row and at least one data row.');

    const headers = rows[0].map(h => String(h).trim()).filter(Boolean);
    if (!headers.length) throw new Error('No column headers found in the first row.');

    const data = rows.slice(1).filter(row =>
      row.some(cell => cell !== '' && cell !== null && cell !== undefined)
    );

    if (!data.length) throw new Error('No data rows found after the header.');

    return { headers, data };
  }

  return { parse };
})();
