const { execSync } = require('child_process');
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;

if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
  console.log('[Build] Remote DATABASE_URL detected. Running production database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('[Build] Database migrations applied successfully 🚀');
  } catch (err) {
    console.warn('[Build] Migrate deploy notice:', err?.message || String(err));
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('[Build] Database schema pushed successfully 🚀');
    } catch (pushErr) {
      console.warn('[Build] DB push warning:', pushErr?.message || String(pushErr));
    }
  }
} else {
  console.log('[Build] Skipping DB migration for local build (no remote DATABASE_URL configured).');
}
