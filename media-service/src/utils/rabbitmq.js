const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'facebook_events';

const connectToRabbitMQ = async () => {
  const maxRetries = 10;
  const delay = 5000; // 5 seconds
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      connection = await amqp.connect(rabbitmqUrl);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });
      logger.info('Connected to rabbit MQ');
      return channel;
    } catch (error) {
      attempts++;
      logger.error(
        `Error connecting to rabbit MQ (attempt ${attempts}/${maxRetries})`,
        error
      );

      if (attempts >= maxRetries) {
        logger.error(
          `Failed to connect to RabbitMQ after multiple attempts. Exiting...`
        );
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const publishEvent = async (routingKey, message) => {
  if (!channel) {
    await connectToRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
};

const consumeEvent = async (routingKey, callback) => {
  if (!channel) {
    await connectToRabbitMQ();
  }

  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  logger.info(`Listening to queue for routing key: ${routingKey}`);

  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      logger.info(`Parsed content: ${content}`);
      callback(content);
      channel.ack(msg);
    }
  });

  logger.info(`Subscribed to event: ${routingKey}`);
};
module.exports = { connectToRabbitMQ, publishEvent, consumeEvent };
