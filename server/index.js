// Local dev entry point. On Vercel, api/index.js serves the same app
// as a serverless function instead.
import app from "./app.js";
import { aiAvailable } from "./claude.js";

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`TCan Express API on :${PORT} — AI ${aiAvailable() ? "LIVE (claude-opus-5)" : "OFFLINE (cached fallbacks)"}`);
});
