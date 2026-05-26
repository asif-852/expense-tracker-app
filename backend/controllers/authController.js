const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Transaction = require('../models/Transaction');
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
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();

  // Atomically claim the token: only succeeds if it is unrevoked AND unexpired.
  // This prevents two concurrent /refresh calls from both treating the same
  // token as valid and minting two pairs of new tokens.
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { revokedAt: now },
    { new: true }
  );

  if (claimed) {
    const tokens = await issueAuthTokens(claimed.user);
    return res.status(200).json(tokens);
  }

  // Claim failed — figure out why so we can decide whether this looks like
  // theft (replaying an already-revoked token) or just an expired/unknown one.
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Reuse of a previously-revoked token: assume the token has been stolen and
  // proactively revoke every active session for this user.
  if (existing.revokedAt) {
    await revokeAllRefreshTokens(existing.user);
  }

  throw new AppError('Refresh token is expired or revoked', 401);
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

  const userId = req.user.id;
  await deleteAccountAtomically(userId);

  return res.status(200).json({ message: 'Account deleted successfully' });
};

/**
 * Best-effort all-or-nothing account deletion. Uses a Mongo transaction when
 * the deployment supports it (replica set / mongos), otherwise falls back to
 * a careful sequential delete that always removes dependents before the user.
 *
 * The fallback ordering guarantees that, even on a partial failure, the User
 * record is the last thing deleted — so a retry can complete the cleanup.
 */
async function deleteAccountAtomically(userId) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await RefreshToken.deleteMany({ user: userId }).session(session);
      await Transaction.deleteMany({ userId }).session(session);
      await User.findByIdAndDelete(userId).session(session);
    });
  } catch (err) {
    if (isUnsupportedTransactionError(err)) {
      // Standalone MongoDB: fall back to ordered, non-transactional deletion.
      await RefreshToken.deleteMany({ user: userId });
      await Transaction.deleteMany({ userId });
      await User.findByIdAndDelete(userId);
    } else {
      throw err;
    }
  } finally {
    session.endSession();
  }
}

function isUnsupportedTransactionError(err) {
  if (!err) return false;
  if (err.code === 20 || err.codeName === 'IllegalOperation') return true;
  return /replica set|Transaction numbers|transactions are not supported/i.test(
    err.message || ''
  );
}
