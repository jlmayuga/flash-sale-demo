const jwt = require('jsonwebtoken');

function createToken() {
  const secret = process.env.ADMIN_JWT_SECRET;
  const expiresIn = process.env.ADMIN_TOKEN_EXPIRES_IN || '12h';

  if (!secret) {
    const error = new Error('Admin token secret is not configured');
    error.statusCode = 500;
    throw error;
  }

  const token = jwt.sign(
    { role: 'admin' },
    secret,
    {
      subject: process.env.ADMIN_USERNAME,
      expiresIn,
    },
  );

  return { token, tokenType: 'Bearer', expiresIn };
}

module.exports = { createToken };
