// Runs the Express app the way Vercel does (api/index.js): no server.ts, no
// Socket.IO. Use it to reproduce serverless-only behaviour locally:
//   BACKEND_PORT=5090 npx tsx scripts/dev-serverless-like.cjs
require('dotenv').config({ path: 'backend/.env' });
const http = require('http');
const { app } = require('../backend/src/app');
const port = Number(process.env.BACKEND_PORT || 5090);
http.createServer(app).listen(port, () => console.log(`serverless-like backend on ${port} (no realtime)`));
