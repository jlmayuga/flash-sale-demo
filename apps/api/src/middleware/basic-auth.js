const crypto = require('crypto');

function digest(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function basicAuth(req, res, next) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return res.status(500).json({ message: 'Admin credentials are not configured' });
  }

  const [scheme, encodedCredentials] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Basic' || !encodedCredentials) {
    res.set('WWW-Authenticate', 'Basic realm="Flash Sale Admin"');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');
  const separatorIndex = decodedCredentials.indexOf(':');
  const username = separatorIndex === -1 ? '' : decodedCredentials.slice(0, separatorIndex);
  const password = separatorIndex === -1 ? '' : decodedCredentials.slice(separatorIndex + 1);

  const isAuthorized = (username, expectedUsername) && (password, expectedPassword);

  if (!isAuthorized) {
    res.set('WWW-Authenticate', 'Basic realm="Flash Sale Admin"');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  next();
}

module.exports = basicAuth;
