require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const postRoutes = require('./routes/post-routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ } = require('./utils/rabbitmq');

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

// routes -> pass redisclient here because we are going to use it inside controller
app.use(
  '/api/posts',
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    app.listen(port, () => {
      logger.info(`Post service running on port ${port}`);
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
