const logger = require('../utils/logger');
const { validateRegistration, validateLogin } = require('../utils/validation');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const RefreshToken = require('../models/RefreshToken');

// user registration
const registerUser = async (req, res) => {
  logger.info('Registration endpoint hit...');
  try {
    // validate schema
    const { error } = validateRegistration(req.body);

    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        message: error.details[0].message,
        success: false,
      });
    }

    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn('User already exists.');
      return res.status(400).json({
        message: 'User already exists.',
        success: false,
      });
    }

    user = new User({ email, username, password });
    await user.save();
    logger.warn('User saved successfully.', user._id);
    const { accessToken, refreshToken } = await generateToken(user);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error occured');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// user login
const loginUser = async (req, res) => {
  logger.info('Login endpoint hit...');

  try {
    const { error } = validateLogin(req.body);

    if (error) {
      logger.warn('Validation error', error.details[0].message);
      return res.status(400).json({
        message: error.details[0].message,
        success: false,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Invalid User.');
      return res.status(400).json({
        message: 'Invalid Credentials.',
        success: false,
      });
    }

    // user valid password or not
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn('Invalid Password.');
      return res.status(400).json({
        message: 'Invalid Credentials.',
        success: false,
      });
    }
    const { accessToken, refreshToken } = await generateToken(user);

    logger.warn('User login successfully.', user._id);
    res.status(201).json({
      success: true,
      message: 'User login successfully',
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error('Login error occured', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// refresh token
const refreshTokenUser = async (req, res) => {
  logger.info('Refresh token endpoint hit...');

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn('Refresh token missing');
      return res.status(400).json({
        message: 'Refresh token missing',
        success: false,
      });
    }

    const storedToken = await RefreshToken({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired refresh token.');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    const user = await User.findById({ _id: storedToken.user });

    if (!user) {
      logger.warn('User not found.');
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    // delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    logger.warn('Refresh token generated successfully.');
    res.status(201).json({
      success: true,
      message: 'Refresh token generated successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Refresh token error occured', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// logout
const logoutUser = async (req, res) => {
  logger.info('Logout endpoint hit...');

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      logger.warn('Refresh token missing');
      return res.status(400).json({
        message: 'Refresh token missing',
        success: false,
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.warn('Refresh token deleted as user logout successfully.');

    res.status(200).json({
      message: 'User logged out successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Logout error occured');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = { logoutUser, registerUser, loginUser, refreshTokenUser };
