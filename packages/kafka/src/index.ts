import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(clientId: string, brokers: string[]) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.ERROR,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
  }

  async connectProducer() {
    await this.producer.connect();
  }

  async connectConsumer() {
    await this.consumer.connect();
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async produce(topic: string, messages: any[]) {
    await this.producer.send({
      topic,
      messages: messages.map(msg => ({ value: JSON.stringify(msg) })),
    });
  }

  async consume(topic: string, eachMessage: (payload: any) => Promise<void>) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const parsedMessage = JSON.parse(message.value.toString());
        await eachMessage(parsedMessage);
      },
    });
  }
}
