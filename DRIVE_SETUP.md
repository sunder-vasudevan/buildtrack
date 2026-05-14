# Google Drive Backup Setup

## One-time setup (~10 minutes)

### 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com
2. Create a new project (e.g. "BuildTrack Backup")
3. Enable the **Google Drive API**: APIs & Services → Enable APIs → search "Drive API" → Enable

### 2. Create a Service Account
1. APIs & Services → Credentials → Create Credentials → Service Account
2. Give it any name (e.g. "buildtrack-backup")
3. Skip optional steps, click Done
4. Click the service account → Keys tab → Add Key → JSON
5. Download the JSON file — keep it safe, do not commit it

### 3. Create a Drive folder & share it
1. Open Google Drive, create a folder called "BuildTrack Backup"
2. Right-click → Share → paste the service account email (looks like `...@....iam.gserviceaccount.com`)
3. Give it **Editor** access
4. Copy the folder ID from the URL: `drive.google.com/drive/folders/THIS_PART_HERE`

### 4. Add environment variables to `.env.local`

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}

GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

Paste the **entire contents** of the downloaded JSON file as a single line for `GOOGLE_SERVICE_ACCOUNT_JSON`.

### 5. Restart the dev server
```bash
npm run dev
```

The "Backup to Drive" button in More → Settings & Export will now work.

## How backups work

- Files are organised into subfolders: `receipts/`, `logs/`, `plans/`
- Files already in Drive are **skipped** (not duplicated) on subsequent backups
- The service account only has access to the shared folder — nothing else in your Drive
