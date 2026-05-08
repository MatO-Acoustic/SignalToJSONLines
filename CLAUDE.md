# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SignalToJSONLines** — browser tool that converts CSV/Excel files into JSON Lines (.jsonl) for Acoustic Connect SFTP/local-storage bulk signal triggering. Users upload a blank signal template to define the schema, upload a source data file, map columns to signal fields, preview output, and download the ready-to-upload `.jsonl` file. Intended to be hosted on GitHub Pages.

## Architecture

Pure static site — no build step, no framework, no server. All processing is client-side.

| File | Role |
|---|---|
| `index.html` | App shell and 5-step layout |
| `style.css` | Acoustic brand styles (violet `#1F1E5D`, periwinkle `#706CFF`, green `#00DF8F`) |
| `parser.js` | SheetJS CDN wrapper — parses `.csv`/`.xlsx`/`.xls` into `{ headers, data }` |
| `mapper.js` | Mapping state module — auto-matches columns to prefixed signal fields, tracks which fields are claimed |
| `exporter.js` | Builds JSONL lines from mappings and triggers a Blob download |
| `app.js` | Orchestrates all modules; owns DOM events and app state |

## Step 1 — Define Signal

The user provides:
1. **App key** — required string, stamped onto every output row as `signal.appKey`
2. **Blank signal template** — a `.json` file matching the Connect signal structure (see format below). The tool parses it to extract the signal type, identifier type, and all signal content fields.
3. **Test flag** — optional checkbox; adds `"test": true` to every output row

Blank signal template format (the tool accepts `{"signal": {...}}` or the inner object directly):
```json
{
  "signal": {
    "appKey": "",
    "identifiableAttributes": { "email": "" },
    "signalContent": {
      "signalType": "order",
      "orderId": "",
      "orderTotal": ""
    }
  }
}
```

Valid `identifiableAttributes` keys: `email`, `sms`, `whatsapp`, `contactKey`.

## Field prefix system (mapper.js)

Signal fields are stored with a category prefix so the exporter knows where to place each value in the nested output:

| Prefix | Output location | Example |
|---|---|---|
| `identifier:email` | `signal.identifiableAttributes.email` | Contact identifier |
| `content:orderId` | `signal.signalContent.orderId` | Signal-specific field |
| `session:sessionId` | `signal.sessionId` | Optional session grouping |

Auto-match rules (in order): exact match on field name → normalised match (strips `_`, `-`, spaces, lowercases). `sessionId` is always offered as an optional mapping target.

## JSONL output format

One JSON object per line. Connect's required structure:
```json
{"signal":{"appKey":"app_abc123","identifiableAttributes":{"email":"user@example.com"},"signalContent":{"signalType":"order","orderId":"ORD-001","orderTotal":"149.99"},"sessionId":"SESS-AAA"}}
```

- `signalType` is stamped from the uploaded template, not mapped per row
- `sessionId` is omitted entirely when the source cell is empty (not written as `""`)
- `test: true` is added only when the test flag checkbox is checked

## Serving locally

```bash
npx serve -p 3456 .
```

## Logs

`logs/logs.log` — leftover application start marker from an earlier unrelated process. Can be deleted.
