const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config({ path: "../../.env" });
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };
