const { auth } = require('../config/firebase');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};


const checkRole = (role) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userRecord = await auth.getUser(user.uid);
      const customClaims = userRecord.customClaims || {};
      console.log(customClaims);
      
      if (customClaims.role !== role) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(403).json({ error: 'Forbidden - Role verification failed' });
    }
  };
};

module.exports = { authenticate, checkRole }; 