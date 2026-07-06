import './config/env.js'; // Load env variables first
import { initTracing } from './otel.js';
// Initialize tracing before any other setup
initTracing('service-template');

import { env } from './config/env.js';
import { startServer } from '@aerorail/server';

import availabilityRouter from './routes/availability.js';

startServer({
  serviceName: 'booking-service',
  port: env.PORT || 3003,
  routes: (app) => {
    app.get('/', (req, res) => {
      res.json({ message: 'Hello from AeroRail Booking Service!' });
    });
    
    app.use('/booking', availabilityRouter);
  },
  shutdownHandlers: [
    // Add graceful shutdown callbacks for DBs or custom services here
  ],
});
