require('dotenv').config();
const connectDB = require('../src/config/database');
const User = require('../src/models/User');

async function createAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters.');
  }

  await connectDB();
  if (await User.exists({ role: 'admin' })) {
    throw new Error('An admin account already exists; bootstrap did not create another one.');
  }
  if (await User.exists({ email })) throw new Error('That email already belongs to an account.');

  const admin = await User.create({ name: 'Administrator', email, password, role: 'admin' });
  console.log(`Admin account created for ${admin.email}. Remove the bootstrap credentials from the environment now.`);
}

createAdmin()
  .then(() => require('mongoose').disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await require('mongoose').disconnect();
    process.exitCode = 1;
  });
