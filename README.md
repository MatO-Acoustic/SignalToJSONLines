# Signal → JSON Lines

A browser-based tool that converts CSV or Excel files into JSON Lines (`.jsonl`) ready for Acoustic Connect bulk signal import via SFTP or local storage upload.

All processing happens in your browser — no data is sent to any server.

---

## What it does

Connect's SFTP and local-storage signal import expects a `.jsonl` file where each line is a complete signal object. Building these files manually from a data export is error-prone and time-consuming. This tool automates the conversion:

1. Upload a blank signal template to define the schema
2. Upload your source data file (CSV or Excel)
3. Map your columns to the signal fields
4. Preview the output
5. Download the ready-to-upload `.jsonl` file

---

## Before you start

You will need:

- **Your app key** — provided during Connect Pro onboarding, or generated via the Connect interface (Premium/Ultimate)
- **A signal template** — paste your GraphQL `createSignal` mutation directly, or upload/paste a blank `.json` signal file (see below)
- **Your source data file** — `.csv`, `.xlsx`, or `.xls`

---

## Signal template

The tool extracts field structure from either a GraphQL `createSignal` mutation or a blank signal JSON file. Paste either directly into the text area in Step 1, or upload a `.json` file.

### GraphQL mutation (recommended)

Paste your `createSignal` mutation as-is. The tool strips the GraphQL wrapper, blanks all values, and extracts the field list. Commented-out fields (`#field: ...`) in `signalContent` are included as optional mapping targets; commented-out identifiers are included in the identifier picker but not selected by default. If your mutation includes an `appKey` value, it will be pre-filled automatically.

### JSON blank signal format

```json
{
  "signal": {
    "appKey": "",
    "identifiableAttributes": {
      "email": ""
    },
    "signalContent": {
      "signalType": "order",
      "orderId": "",
      "orderTotal": "",
      "currency": ""
    }
  }
}
```

### Key fields

| Field | Required | Notes |
|---|---|---|
| `appKey` | Yes | Can be left blank in the template — you'll enter it in the tool |
| `identifiableAttributes` | Yes | One or more identifier keys — `email`, `sms`, `whatsapp`, or a contact key (any other name). `sms` and `whatsapp` cannot be combined with each other; all other combinations are valid. |
| `signalContent.signalType` | Yes | The Connect signal type (e.g. `order`, `addToCart`, `pageView`) |
| Other `signalContent` fields | Signal-dependent | Add any fields your signal requires or optionally accepts |

The tool accepts the full `{"signal": {...}}` wrapper or just the inner object.

### Custom signals

Custom signals work the same way — add your custom field names to `signalContent` in the template. The tool will extract them automatically.

---

## Mapping columns

After uploading both files, the tool shows a mapping table with one row per source column.

Columns are auto-matched to signal fields where names align. Each column maps to one of three target types:

| Type | Description | Output location |
|---|---|---|
| **Identifier** | The contact lookup field | `signal.identifiableAttributes` |
| **Signal content** | Signal-specific data fields | `signal.signalContent` |
| **Session ID** | Optional — groups signals into a session | `signal.sessionId` |

Columns you don't need can be set to **Ignore column**.

> **Session ID note:** including a session ID registers signals in aggregate reports and in-market interest calculations. Without one, signals appear in contact activity feeds only.

---

## Output format

Each line in the downloaded file follows the Connect import structure:

```json
{"signal":{"appKey":"app_abc123","identifiableAttributes":{"email":"user@example.com"},"signalContent":{"signalType":"order","orderId":"ORD-001","orderTotal":"149.99","currency":"GBP"},"sessionId":"SESS-AAA"}}
```

When multiple identifiers are selected (e.g. contact key + email), both appear in `identifiableAttributes`:

```json
{"signal":{"appKey":"app_abc123","identifiableAttributes":{"contactKey":"cust-12345","email":"user@example.com"},"signalContent":{"signalType":"order","orderId":"ORD-001"}}}
```

- `signalType` is stamped from your template — the same for every row
- `sessionId` is omitted entirely when the source cell is empty
- The downloaded file is named `{signalType}_{date}.jsonl`

---

## Test mode

Check **Test mode** in Step 1 to add `"test": true` to every signal. Test signals go through full validation but have no impact on campaigns, segmentation, or the activity feed. Use this to verify your file before a live import.

---

## Connect import limits and notes

| Item | Detail |
|---|---|
| Max file size | 500 MB per import job |
| SFTP file retention | Files are deleted from the SFTP server 14 days after upload |
| Activity feed window | Signals must have a `signalTimestamp` within the last 30 days to appear in contact feeds |
| Identifier types | `email`, `sms` (E.164 format: `+[country][area][number]`), `whatsapp`, contact key (any custom name). Multiple can be combined except `sms` + `whatsapp`. |
| Batch size (API) | Up to 500 signals per call (not applicable to file import) |

### Contact creation behaviour

| Identifier provided | Outcome |
|---|---|
| Existing contact found | Signal maps to that contact |
| New contact with email or phone | New contact created, signal maps to it |
| Contact key only (new contact) | Signal is discarded — contact keys cannot create new contacts |

---

## Importing in Connect

**Local storage:**
1. Go to **Behavioral management → Signal management**
2. Click **Import signals → Import from local storage**
3. Upload your `.jsonl` file and assign a job name
4. Click **Start import**

**SFTP:**
1. Upload your `.jsonl` file to your subscription directory on the Acoustic SFTP server (`/[your_subscription_name]/`)
2. Go to **Behavioral management → Signal management**
3. Click **Import signals → Import from SFTP**
4. Browse to your file, assign a job name, and click **Start**

**Verifying the import:**
- **Job status:** Data management → Job monitoring → Job status tab
- **Contact activity:** Data management → Audience → select a contact → activity feed
- **Signal list:** Behavioral management → Signal management → select a signal type
