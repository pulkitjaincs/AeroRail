import './config/env.js';
import { initTracing } from './otel.js';
initTracing('payment-service');

import express from 'express';
import { env } from './config/env.js';
import { startServer } from '@aerorail/server';
import { KafkaClient } from '@aerorail/kafka';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@aerorail/db';

const kafkaClient = new KafkaClient('payment-service', env.KAFKA_BROKERS.split(','));
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

async function init() {
  await kafkaClient.connectProducer();

  startServer({
    serviceName: 'payment-service',
    port: env.PORT,
    routes: (app: express.Express) => {
      app.use(express.json());

      app.post('/create-order', async (req: express.Request, res: express.Response) => {
        try {
          const { amount, currency, bookingId } = req.body;
          const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // convert to paise
            currency: currency || 'INR',
            receipt: bookingId,
          });
          
          await prisma.payments.create({
            data: {
              payment_id: order.id,
              booking_id: bookingId,
              amount: amount,
              currency: currency || 'INR',
              status: 'PENDING',
              updated_at: new Date()
            }
          });
          
          res.json({ orderId: order.id, amount, currency });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Failed to create order' });
        }
      });

      app.post('/webhook', async (req: express.Request, res: express.Response) => {
        try {
          const secret = env.RAZORPAY_WEBHOOK_SECRET;
          const signature = req.headers['x-razorpay-signature'] as string;
          
          const bodyString = JSON.stringify(req.body);
          const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

          if (expectedSignature !== signature) {
            return res.status(400).json({ error: 'Invalid signature' });
          }

          const event = req.body;
          if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
            const paymentEntity = event.payload.payment.entity;
            const orderId = paymentEntity.order_id;
            
            // Check idempotency (prevent duplicate webhooks)
            const payment = await prisma.payments.findUnique({ where: { payment_id: orderId } });
            if (payment && payment.status !== 'SUCCESSFUL') {
              await prisma.payments.update({
                where: { payment_id: orderId },
                data: { status: 'SUCCESSFUL', updated_at: new Date() }
              });
              
              // Produce Kafka event
              await kafkaClient.produce('payment.completed', [{
                bookingId: payment.booking_id,
                paymentId: orderId,
                status: 'SUCCESSFUL'
              }]);
            }
          }
          
          res.status(200).json({ status: 'ok' });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Webhook processing failed' });
        }
      });
    },
    shutdownHandlers: [
      async () => {
        await kafkaClient.disconnect();
        await prisma.$disconnect();
      }
    ],
  });
}

init().catch(console.error);
