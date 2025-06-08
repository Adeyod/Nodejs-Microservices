const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokenUser,
} = require('../controllers/identity-controller');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshTokenUser);
router.post('/logout', logoutUser);

module.exports = router;
