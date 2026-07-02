import { db } from './db';
import { users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const TEST_USERS = [
  {
    id: 'user_demo_admin',
    email: 'robert@stratalink.ai',
    password: 'SecurePass123!',
    name: 'Robert Chen',
    role: 'admin',
    staticOtpPin: '291305',
  },
  {
    id: 'user_demo_alex',
    email: 'atkwilliams1977@gmail.com',
    password: 'SecurePass234',
    name: 'Alex Williams',
    role: 'viewer',
    staticOtpPin: '123456',
  },
];

async function seedUsers() {
  console.log('Seeding test users...');

  for (const u of TEST_USERS) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);

    if (existing.length > 0) {
      // Update static OTP pin in case it changed
      await db
        .update(users)
        .set({ staticOtpPin: u.staticOtpPin })
        .where(eq(users.email, u.email));
      console.log(`✓ User already exists  -  updated pin: ${u.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 10);

    await db.insert(users).values({
      id: u.id,
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
      twoFactorEnabled: true,
      twoFactorMethod: 'email',
      totpSecret: null,
      backupCodes: [],
      staticOtpPin: u.staticOtpPin,
    });

    console.log(`✓ Created: ${u.email} (pin: ${u.staticOtpPin})`);
  }

  console.log('\nLogin access table:');
  console.log('─'.repeat(70));
  console.log(`${'EMAIL'.padEnd(34)} ${'PASSWORD'.padEnd(16)} ${'2FA PIN'.padEnd(8)} ROLE`);
  console.log('─'.repeat(70));
  for (const u of TEST_USERS) {
    console.log(`${u.email.padEnd(34)} ${u.password.padEnd(16)} ${u.staticOtpPin.padEnd(8)} ${u.role}`);
  }
  console.log('─'.repeat(70));
}

seedUsers()
  .then(() => {
    console.log('\nSeeding complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
