const httpError = require('../utils/httpError');

// Role is read from the DB user loaded in `protect`, never from the client.
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(httpError(403, 'Forbidden: you do not have permission to perform this action'));
  }
  next();
};
