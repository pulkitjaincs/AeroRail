import './config/env.js'; // Load env variables first
import { initTracing } from './otel.js';
// Initialize tracing before any other setup
initTracing('service-template');

import { env } from './config/env.js';
import { startServer } from '@aerorail/server';

import availabilityRouter from './routes/availability.js';
import bookRouter from './routes/book.js';
import queueRouter from './routes/queue.js';
import { KafkaClient } from '@aerorail/kafka';
import { handlePaymentCompleted } from './consumers/paymentConsumer.js';

const kafkaClient = new KafkaClient('booking-service', env.KAFKA_BROKERS.split(','));

async function init() {
  await kafkaClient.connectConsumer();
  await kafkaClient.consume('payment.completed', handlePaymentCompleted);

  startServer({
  serviceName: 'booking-service',
  port: env.PORT || 3003,
  routes: (app) => {
    app.get('/', (req, res) => {
      res.json({ message: 'Hello from AeroRail Booking Service!' });
    });
    
    app.use('/booking', availabilityRouter);
    app.use('/booking/book', bookRouter);
    app.use('/booking/queue', queueRouter);
  },
  shutdownHandlers: [
    async () => {
      await kafkaClient.disconnect();
    }
  ],
});
}

init().catch(console.error);
