const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');

const COOKIE = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// Issues a new access token + rotates the refresh token (stored hashed in DB, sent as httpOnly cookie).
const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  res.cookie(COOKIE, refreshToken, cookieOptions);
  return accessToken;
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (await User.findOne({ email: String(email).toLowerCase() })) throw httpError(409, 'Email is already registered');

  // role is ALWAYS "user" here – admins are created via the seed script only.
  const user = await User.create({ name, email, password, role: 'user' });
  const accessToken = await issueTokens(user, res);
  res.status(201).json({ success: true, user: publicUser(user), accessToken });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw httpError(401, 'Invalid email or password');

  const accessToken = await issueTokens(user, res);
  res.json({ success: true, user: publicUser(user), accessToken });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[COOKIE];
  if (!token) throw httpError(401, 'No refresh token');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw httpError(401, 'Refresh token expired or invalid');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== hashToken(token)) throw httpError(401, 'Refresh token revoked');

  const accessToken = await issueTokens(user, res);
  res.json({ success: true, user: publicUser(user), accessToken });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies[COOKIE];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
    } catch { /* token already invalid – nothing to revoke */ }
  }
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true, message: 'Logged out' });
});
