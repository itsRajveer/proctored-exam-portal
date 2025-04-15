const { auth, db } = require('../config/firebase');

const registerUser = async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for role-based access
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create user profile in Realtime Database
    const userProfile = {
      uid: userRecord.uid,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };

    // Save user profile to database
    await db.ref(`users/${userRecord.uid}`).set(userProfile);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email,
        name,
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Determine role based on email domain
    let role;
    if (email.endsWith('@student.com')) {
      role = 'student';
    } else if (email.endsWith('@teacher.com')) {
      role = 'teacher';
    } else {
      return res.status(400).json({ error: 'Invalid email domain. Use @student.com or @teacher.com' });
    }

    // Get user record from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Set custom claims for the user
    await auth.setCustomUserClaims(userRecord.uid, { role });
    
    // Get user profile from Realtime Database
    const snapshot = await db.ref(`users/${userRecord.uid}`).once('value');
    const userProfile = snapshot.val();
    
    if (!userProfile) {
      // Create user profile if it doesn't exist
      const newUserProfile = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || email.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
      };
      await db.ref(`users/${userRecord.uid}`).set(newUserProfile);
    }
    
    // Generate custom token for client-side authentication
    const customToken = await auth.createCustomToken(userRecord.uid, { role });
    
    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || email.split('@')[0],
        role,
      },
      customToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Get user profile from database
    const snapshot = await db.ref(`users/${uid}`).once('value');
    const userProfile = snapshot.val();
    
    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
}; 