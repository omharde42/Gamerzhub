import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    if (name === 'DATABASE_URL' && (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
      return 'postgresql://postgres:postgres@localhost:5432/gamerhub?schema=public';
    }
    if (fallback) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;
if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}
if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:4000',
  database: {
    url: databaseUrl || requiredEnv('DATABASE_URL'),
    directUrl: process.env.DIRECT_URL || databaseUrl || requiredEnv('DATABASE_URL'),
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  jwt: {
    secret: requiredEnv('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-jwt-secret-change-in-production'),
    refreshSecret: requiredEnv('JWT_REFRESH_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-refresh-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  openai: { apiKey: process.env.OPENAI_API_KEY || '' },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@gamerhub.com',
  },
  encryption: {
    key: requiredEnv('ENCRYPTION_KEY', process.env.NODE_ENV === 'production' ? undefined : 'dev-encryption-key-32bytes!!'),
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=discord`,
  },
  riot: {
    apiKey: process.env.RIOT_API_KEY || '',
    appId: process.env.RIOT_APP_ID || '871157',
    clientId: process.env.RIOT_CLIENT_ID || '',
    clientSecret: process.env.RIOT_CLIENT_SECRET || '',
    redirectUri: process.env.RIOT_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?provider=riot`,
    mockMode: process.env.RIOT_MOCK_MODE === 'true' || process.env.NODE_ENV === 'development',
  },
  challonge: {
    apiKey: process.env.CHALLONGE_API_KEY || '',
  },
};

