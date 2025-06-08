const Post = require('../models/Post');
const logger = require('../utils/logger');
const { publishEvent } = require('../utils/rabbitmq');
const { validateCreatePost } = require('../utils/validation');

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys('posts:*');
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info('Create post endpoint hit...');

  try {
    const { content, mediaIds } = req.body;
    const { error } = validateCreatePost({ content });

    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        message: error.details[0].message,
        success: false,
      });
    }

    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    // Publish an event to be consumed by search service
    await publishEvent('post.created', {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostCache(req, newlyCreatedPost._id.toString());

    logger.info(`Post created successfully.`, newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
    });
  } catch (error) {
    logger.error('Error creating post...', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info('Get all posts endpoint hit...');

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    // save your posts in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    logger.error('Error getting all posts...', error);
    res.status(500).json({
      success: false,
      message: 'Error getting all posts',
    });
  }
};

const getPost = async (req, res) => {
  logger.info('Get a post endpoint hit...');

  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;

    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    const singlePostDetailsById = await Post.findById(postId);

    if (!singlePostDetailsById) {
      return res.status(404).json({
        message: 'Post not found',
        success: false,
      });
    }

    await req.redisClient.setex(
      cachedPost,
      3600,
      JSON.stringify(singlePostDetailsById)
    );
    res.json(singlePostDetailsById);
  } catch (error) {
    logger.error('Error getting a post...', error);
    res.status(500).json({
      success: false,
      message: 'Error getting a post',
    });
  }
};

const deletePost = async (req, res) => {
  logger.info('Delete a post endpoint hit...');

  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await post.deleteOne();

    // publish post delete method
    await publishEvent('post.deleted', {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting a post...', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting a post',
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
