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
2. **Signal template** — either uploaded as a `.json` file or pasted directly into the textarea. Accepts two formats:
   - **JSON signal payload** — `{"signal": {...}}` or the inner object directly
   - **GraphQL `createSignal` mutation** — the full mutation text. `parseGraphQL()` in `app.js` parses it line-by-line using a section stack, extracts all fields, blanks values, keeps `signalType`, and includes commented-out optional `signalContent` fields. If an `appKey` is present in the mutation it pre-fills the app key input.
3. **Test flag** — optional checkbox; adds `"test": true` to every output row

Known `identifiableAttributes` keys: `email`, `sms`, `whatsapp`. Any other key (e.g. `contactKey`, `loyaltyId`, `customerId`) is treated as a contact key and labelled `(contact key)` in the picker.

Signal type casing confirmed: camelCase — e.g. `addToCart`, `browseAbandonment`, `surveyQualificationFromActivity`.

## Identifier picker

When the parsed template contains more than one identifier type, checkboxes replace the static identifier chip. The user can select one or more identifiers simultaneously. Only constraint: `sms` and `whatsapp` are mutually exclusive (checking one disables the other). All other combinations are valid, including contact key + email, contact key + sms, email + sms, etc.

State: `activeIdentifiers: string[]` (replaces the old single `identifierType` string). `setIdentifiers(types)` rebuilds the `identifier:X` entries in `signalFields`, re-inits the mapper, and re-renders. Single-identifier templates show static text only. `isStep1Ready()` requires `activeIdentifiers.length > 0`.

## signalTimestamp auto-injection

`content:signalTimestamp` is always injected into `signalFields` after the template content fields, regardless of whether it appears in the template. Labelled `signalTimestamp (30-day window)` in the mapper to hint that signals need a timestamp within the last 30 days to appear in the contact activity feed.

## Reset

"↺ Start over" button in the header clears all state, form inputs, file inputs, mapper, and hides steps 3–5. Calls `Mapper.reset()` and scrolls to top.

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
