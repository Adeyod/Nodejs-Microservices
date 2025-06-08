require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const searchRoutes = require('./routes/search-routes');
const {
  handlePostCreated,
  handlePostDeleted,
} = require('./eventHandlers/search-event-handlers');

const app = express();
const port = process.env.PORT || 4002;

mongoose
  .connect(process.env.MONGODB)
  .then(() => logger.info('Connected to mongoDB'))
  .catch((e) => logger.error('MongoDB connection error.', e));

const redisClient = new Redis(process.env.REDIS_URL);

// middlewares here
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

/**
 * HOMEWORK
 * 1) Implement IP based rate limiting for sensitive endpoints
 * 2) Pass redis client as part of your req and implement redis caching here
 *
 */
app.use('/api/search', searchRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    // Consume or subscribe to events here
    await consumeEvent('post.created', handlePostCreated);
    await consumeEvent('post.deleted', handlePostDeleted);

    app.listen(port, () => {
      logger.info(`Search service running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to connect to server.', error);
    process.exit(1);
  }
}

startServer();

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.warn(`Unhandled rejection at:`, promise, 'reason:', reason);
});
