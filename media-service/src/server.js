require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mediaRoutes = require('./routes/media-routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const { handlePostDeleted } = require('./eventHandlers/media-event-handlers');

const app = express();
const port = process.env.PORT || 4003;

mongoose
  .connect(process.env.MONGODB)
  .then(() => logger.info('Connected to mongoDB'))
  .catch((e) => logger.error('MongoDB connection error.', e));

// middlewares here
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

app.use('/api/media', mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    // consume all the events
    await consumeEvent('post.deleted', handlePostDeleted);

    app.listen(port, () => {
      logger.info(`Media service running on port ${port}`);
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
