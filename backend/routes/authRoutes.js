const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { body } = require('express-validator');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  authLimiter,
  [
    body('username', 'Username is required')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username may only contain letters, numbers, and underscores'),
    body('email', 'Please include a valid email')
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('password', 'Password must be at least 8 characters').isLength({ min: 8 })
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ],
  authController.register
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  authLimiter,
  [
    body('email', 'Please include a valid email').trim().isEmail().normalizeEmail(),
    body('password', 'Password is required').exists(),
  ],
  authController.login
);

// @route   POST api/auth/refresh
// @desc    Rotate refresh token and issue a new access token
// @access  Public
router.post(
  '/refresh',
  authLimiter,
  [
    body('refreshToken', 'Refresh token is required').isString().notEmpty(),
  ],
  authController.refreshToken
);

// @route   POST api/auth/logout
// @desc    Revoke refresh token
// @access  Public
router.post(
  '/logout',
  [
    body('refreshToken', 'Refresh token is required').isString().notEmpty(),
  ],
  authController.logout
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

// @route   PUT api/auth/password
// @desc    Update current user's password
// @access  Private
router.put(
  '/password',
  auth,
  [
    body('currentPassword', 'Current password is required').exists().notEmpty(),
    body('newPassword', 'New password must be at least 8 characters')
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('New password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number'),
  ],
  authController.updatePassword
);

// @route   DELETE api/auth/me
// @desc    Delete current user's account (requires password confirmation)
// @access  Private
router.delete(
  '/me',
  auth,
  [
    body('password', 'Password is required to confirm account deletion').exists().notEmpty(),
  ],
  authController.deleteAccount
);

module.exports = router;
