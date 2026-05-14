const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { AppError } = require('../middleware/errorHandler');

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const DEFAULT_REFRESH_TOKEN_DAYS = 7;

const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      user: {
        id: userId,
      },
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

const hashRefreshToken = (refreshToken) => {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
};

const getRefreshTokenExpiresAt = () => {
  const configuredDays = Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10);
  const days = Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_REFRESH_TOKEN_DAYS;

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const createRefreshToken = async (userId) => {
  const refreshToken = crypto.randomBytes(64).toString('hex');

  await RefreshToken.create({
    user: userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
  });

  return refreshToken;
};

const issueAuthTokens = async (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: await createRefreshToken(userId),
  };
};

const revokeRefreshToken = async (refreshToken) => {
  await RefreshToken.updateOne(
    { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    { revokedAt: new Date() }
  );
};

const revokeAllRefreshTokens = async (userId) => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  const user = await User.create({ username, email, password });
  const tokens = await issueAuthTokens(user.id);

  return res.status(201).json(tokens);
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 400);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 400);
  }

  const tokens = await issueAuthTokens(user.id);
  return res.status(200).json(tokens);
};

exports.refreshToken = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { refreshToken } = req.body;
  const storedToken = await RefreshToken.findOne({
    tokenHash: hashRefreshToken(refreshToken),
  }).populate('user');

  if (!storedToken || !storedToken.user) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (!storedToken.isActive()) {
    if (storedToken.revokedAt) {
      await revokeAllRefreshTokens(storedToken.user.id);
    } else {
      storedToken.revokedAt = new Date();
      await storedToken.save();
    }

    throw new AppError('Refresh token is expired or revoked', 401);
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = await issueAuthTokens(storedToken.user.id);
  return res.status(200).json(tokens);
};

exports.logout = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  await revokeRefreshToken(req.body.refreshToken);
  return res.status(200).json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return res.status(200).json(user);
};

exports.updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  // Load user with password field included (excluded by default)
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify the current password before allowing a change
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Prevent setting the same password again
  const isSamePassword = await user.matchPassword(newPassword);
  if (isSamePassword) {
    throw new AppError('New password must be different from your current password', 400);
  }

  // Assign new password; pre-save hook in User model will hash it.
  user.password = newPassword;
  await user.save();

  await revokeAllRefreshTokens(user.id);
  const tokens = await issueAuthTokens(user.id);

  return res.status(200).json({
    ...tokens,
    message: 'Password updated successfully',
  });
};

exports.deleteAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { password } = req.body;

  // Load user with password field included (excluded by default)
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Require password confirmation as a safety gate before permanent deletion
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Incorrect password', 400);
  }

  await RefreshToken.deleteMany({ user: req.user.id });
  await User.findByIdAndDelete(req.user.id);
  // NOTE (Iteration 4): Once the Transaction model exists, cascade-delete here:
  // await Transaction.deleteMany({ userId: req.user.id });

  return res.status(200).json({ message: 'Account deleted successfully' });
};
