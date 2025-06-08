const Search = require('../models/Search');
const logger = require('../utils/logger');

const handlePostCreated = async (event) => {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();

    logger.info(
      `Search post created: ${event.postId}, ${newSearchPost._id.toString()}`
    );
  } catch (error) {
    logger.error(`Error occured while trying to store post in search.`, error);
  }
};

const handlePostDeleted = async (event) => {
  console.log(event, 'event');
  const { postId } = event;
  try {
    const mediaToDelete = await Search.findOneAndDelete({
      postId: postId,
    });

    logger.info(`Processed deletion of search for post ID ${postId}`);
  } catch (error) {
    logger.error(`Error occured while deleting search.`, error);
  }
};

module.exports = { handlePostCreated, handlePostDeleted };
