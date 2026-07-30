// Vercel serverless entry: every /api/* request is rewritten here
// (see vercel.json) and handled by the same Express app used locally.
// Note: deal state lives in module memory — it persists while the
// function instance is warm and re-seeds on cold start (the ⟲ reset
// button covers demo rehearsals either way).
import app from "../server/app.js";

export default app;
