require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Testing database connectivity...');
  console.log('📋 Environment variables:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'present' : 'missing');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'present' : 'missing');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log('👥 Total users in database:', userCount);
    
    // Test if we can find a user
    const firstUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        subscription_status: true,
        trial_end: true
      }
    });
    
    if (firstUser) {
      console.log('✅ Found user:', {
        id: firstUser.id,
        email: firstUser.email,
        subscription_status: firstUser.subscription_status,
        trial_end: firstUser.trial_end
      });
    } else {
      console.log('⚠️ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase(); 