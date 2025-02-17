const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ 
        message: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED' // Add custom error code
      });
    }
    req.user = decoded;
    next();
  });
};