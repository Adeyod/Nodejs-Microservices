const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('authHeader:', authHeader);
    console.log('token:', token);
    console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);

    if (!token) {
      logger.warn('Access attempt without valid token!');
      return res.status(401).json({
        message: 'Authentication required',
        success: false,
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        logger.warn('Invalid token!');
        return res.status(429).json({
          message: 'Invalid token!',
          success: false,
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports = { validateToken };
