import { db } from './db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seedDemoUser() {
  console.log('Seeding demo user...');
  
  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@stratalink.io'))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log('✓ Demo user already exists');
      return;
    }
    
    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
    
    await db.insert(users).values({
      id: 'user_demo_admin',
      email: 'admin@stratalink.io',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      twoFactorEnabled: true,
      twoFactorMethod: 'email',
      totpSecret: null,
      backupCodes: [],
    });
    
    console.log('✓ Demo user created successfully');
    console.log('  Email: admin@stratalink.io');
    console.log('  Password: SecurePass123!');
  } catch (error) {
    console.error('Error seeding demo user:', error);
    throw error;
  }
}

seedDemoUser()
  .then(() => {
    console.log('Seeding complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
