const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let gapiInited = false;
let gisInited = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenClient: any = null;

export async function initGoogleDrive(): Promise<void> {
  await Promise.all([loadGapi(), loadGis()]);
}

function loadGapi(): Promise<void> {
  return new Promise((resolve) => {
    if (gapiInited) return resolve();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = async () => {
      await new Promise<void>((r) => gapi.load("client", r));
      await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
      gapiInited = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

function loadGis(): Promise<void> {
  return new Promise((resolve) => {
    if (gisInited) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        scope: SCOPES,
        callback: () => {},
      });
      gisInited = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

export function requestAccessToken(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Google not initialized"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokenClient.callback = (resp: any) => {
      if (resp.error) reject(new Error(resp.error));
      else resolve();
    };
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

export async function uploadToDrive(filename: string, content: string): Promise<string> {
  const metadata = { name: filename, mimeType: "application/json" };
  const blob = new Blob([content], { type: "application/json" });

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);

  const token = gapi.client.getToken();
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}` },
    body: form,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.id as string;
}
