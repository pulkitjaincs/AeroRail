import './config/env.js'; // Load env variables first
import { initTracing } from './otel.js';
// Initialize tracing before any other setup
initTracing('service-template');

import { env } from './config/env.js';
import { startServer } from '@aerorail/server';

startServer({
  serviceName: 'service-template',
  port: env.PORT,
  routes: (app) => {
    app.get('/', (req, res) => {
      res.json({ message: 'Hello from AeroRail Service Template!' });
    });
  },
  shutdownHandlers: [
    // Add graceful shutdown callbacks for DBs or custom services here
  ],
});
