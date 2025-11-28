import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import app from './app.js';
import { connectDB } from './config/db.js';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eco-shop';

const seedAdmin = async () => {
  const adminEmail = 'admin@gmail.com';
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });
    console.log('Seeded admin account (admin@gmail.com / admin123)');
  }
};

const start = async () => {
  await connectDB(MONGO_URI);
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

start();

