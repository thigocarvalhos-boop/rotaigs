// Script to clear the _prisma_migrations table state
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetMigrations() {
  try {
    await prisma.$executeRaw`TRUNCATE TABLE _prisma_migrations`
    console.log('Migration table cleared successfully.');
  } catch (error) {
    console.error('Error clearing migration table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetMigrations();
