const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw httpError(401, 'Not authorized: no token provided');

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw httpError(401, err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw httpError(401, 'User no longer exists');
  req.user = user;
  next();
});
