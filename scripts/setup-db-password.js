/**
 * setup-db-password.js
 * 
 * Tries to set up the database. If it can't connect, it starts the app anyway
 * (the app handles DB errors gracefully with try/catch).
 */
const { execSync } = require('child_process');

async function main() {
  console.log('[setup-db] Starting database setup...');
  
  // Try prisma db push — if the DATABASE_URL password is correct, this creates all tables
  try {
    console.log('[setup-db] Running prisma db push...');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { 
      stdio: 'inherit',
      timeout: 30000 
    });
    console.log('[setup-db] ✅ Database schema created successfully!');
  } catch (e) {
    console.log('[setup-db] ⚠ prisma db push failed — the app will still start.');
    console.log('[setup-db] The app handles DB errors gracefully.');
  }
  
  console.log('[setup-db] Setup complete. Starting app...');
}

main().catch(() => {
  // Don't fail — start the app anyway
  console.log('[setup-db] Setup failed, but continuing to start the app...');
});
