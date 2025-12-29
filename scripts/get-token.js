// Helper to obtain a Twitch OAuth token using Implicit Grant
// Serves a local callback page that reads the token from the URL fragment

require("dotenv").config();
const http = require("http");
const url = require("url");
const { exec } = require("child_process");

const CLIENT_ID = (process.env.TWITCH_CLIENT_ID || "").trim();
const REDIRECT_URI = (
  process.env.TWITCH_REDIRECT_URI || "http://localhost:5173/callback"
).trim();
const SCOPES = (process.env.TWITCH_SCOPES || "chat:read chat:edit").trim();

if (!CLIENT_ID) {
  console.error("\n[Token Helper] Missing TWITCH_CLIENT_ID in .env");
  console.error(" - Create an app at https://dev.twitch.tv/console/apps");
  console.error(" - Set TWITCH_CLIENT_ID and TWITCH_REDIRECT_URI in .env");
  process.exit(1);
}

const PORT = (() => {
  try {
    return new URL(REDIRECT_URI).port || 5173;
  } catch {
    return 5173;
  }
})();

const authorizeUrl = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${encodeURIComponent(
  CLIENT_ID
)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(
  SCOPES
)}&force_verify=true`;

const page = `<!doctype html>
<html>
<meta charset="utf-8" />
<title>Twitch Token Helper</title>
<style>body{font-family:system-ui,Segoe UI,Arial;margin:2rem;max-width:720px}</style>
<body>
<h1>Twitch Token Helper</h1>
<p>If you were redirected here from Twitch, this page will extract your access token.</p>
<pre id="out">Waiting for token...</pre>
<script>
(function(){
  function parseFragment(){
    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const params = new URLSearchParams(hash);
    return {
      access_token: params.get('access_token'),
      scope: params.get('scope'),
      token_type: params.get('token_type'),
      expires_in: params.get('expires_in')
    };
  }
  const data = parseFragment();
  const out = document.getElementById('out');
  if (!data.access_token){
    out.textContent = 'No access_token found in URL fragment. Did you approve the app?';
    return;
  }
  const oauth = 'oauth:' + data.access_token;
  out.textContent = [
    'Token: ' + oauth,
    'Scopes: ' + (data.scope || ''),
    'Token type: ' + (data.token_type || ''),
    'Expires in: ' + (data.expires_in || '') + 's',
    '',
    'Copy the Token value into your .env as TWITCH_OAUTH_TOKEN.'
  ].join('\n');
  // Notify server so it can print and exit
  fetch('/save?token=' + encodeURIComponent(oauth)).catch(()=>{});
})();
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === "/callback") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(page);
    return;
  }
  if (parsed.pathname === "/save") {
    const token = (parsed.query.token || "").trim();
    if (token) {
      console.log("\n[Token Helper] Received token:");
      console.log("  " + token);
      console.log(
        "\nAdd this to your .env as TWITCH_OAUTH_TOKEN. Ensure TWITCH_USERNAME matches the authorized account."
      );
      // Delay a moment before exiting to allow fetch to complete
      setTimeout(() => {
        server.close(() => process.exit(0));
      }, 500);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Saved");
      return;
    }
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing token");
    return;
  }
  // Root page provides a link
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    `<!doctype html><meta charset=\"utf-8\"><body><a href=\"${authorizeUrl}\">Authorize on Twitch</a></body>`
  );
});

server.listen(PORT, () => {
  console.log(`[Token Helper] Listening on ${REDIRECT_URI}`);
  console.log("[Token Helper] Open this URL to authorize:");
  console.log("  " + authorizeUrl);
  // Try to open the auth URL in the default browser (Windows)
  if (process.platform === "win32") {
    exec(`start "" "${authorizeUrl}"`);
  }
});
