const { execSync } = require('child_process');
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;

if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
  console.log('[Build] Remote DATABASE_URL detected. Synchronizing production database schema...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[Build] Database schema synchronized successfully 🚀');
  } catch (err) {
    console.warn('[Build] DB push warning:', err?.message || String(err));
  }
} else {
  console.log('[Build] Skipping db push for local build (no remote DATABASE_URL configured).');
}
