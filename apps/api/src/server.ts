import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { createRealtimeServer } from './realtime.js';

const app = createApp();
const server = http.createServer(app);

createRealtimeServer(server);

server.listen(env.PORT, () => {
  console.log(`OpsPilot API listening on http://localhost:${env.PORT}`);
});
