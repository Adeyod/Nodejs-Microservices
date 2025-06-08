const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'facebook_events';

const connectToRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });
    logger.info('Connected to rabbit MQ');
    return channel;
  } catch (error) {
    logger.error('Error connecting to rabbit MQ', error);
  }
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
module.exports = { connectToRabbitMQ, consumeEvent };
