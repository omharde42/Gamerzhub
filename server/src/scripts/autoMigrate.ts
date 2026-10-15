import prisma from '../config/database';

/**
 * Executes raw SQL DDL migrations over the active Prisma database connection.
 * Adds missing columns, indices, and tables safely using IF NOT EXISTS.
 * Preserves 100% of existing users, profiles, messages, posts, and data.
 */
export async function applyRawMigrations(): Promise<{ success: boolean; executed: string[]; errors: string[] }> {
  const executed: string[] = [];
  const errors: string[] = [];

  const statements = [
    // 1. User table additions
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gamerzId" TEXT;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_gamerzId_key" ON "User"("gamerzId");`,
    `CREATE INDEX IF NOT EXISTS "User_gamerzId_idx" ON "User"("gamerzId");`,

    // 2. Profile table additions
    `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "allowComparison" BOOLEAN NOT NULL DEFAULT true;`,
    `CREATE INDEX IF NOT EXISTS "Profile_allowComparison_idx" ON "Profile"("allowComparison");`,

    // 3. Tournament table additions
    `ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "reminderMinutes" INTEGER DEFAULT 30;`,

    // 4. TournamentSupportTicket and TicketMessage table creation & additions
    `CREATE TABLE IF NOT EXISTS "TournamentSupportTicket" (
      "id" TEXT NOT NULL,
      "ticketNumber" TEXT NOT NULL,
      "tournamentId" TEXT NOT NULL,
      "matchId" TEXT,
      "reporterId" TEXT NOT NULL,
      "targetUserId" TEXT,
      "targetTeamId" TEXT,
      "targetResultId" TEXT,
      "targetMessageId" TEXT,
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
      "subject" TEXT NOT NULL DEFAULT '',
      "description" TEXT NOT NULL DEFAULT '',
      "evidenceUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
      "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
      "resolution" TEXT,
      "actionTaken" TEXT,
      "reviewedById" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "resolvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TournamentSupportTicket_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TournamentSupportTicket_ticketNumber_key" ON "TournamentSupportTicket"("ticketNumber");`,
    `CREATE INDEX IF NOT EXISTS "TournamentSupportTicket_tournamentId_idx" ON "TournamentSupportTicket"("tournamentId");`,
    `CREATE INDEX IF NOT EXISTS "TournamentSupportTicket_reporterId_idx" ON "TournamentSupportTicket"("reporterId");`,
    `CREATE INDEX IF NOT EXISTS "TournamentSupportTicket_status_idx" ON "TournamentSupportTicket"("status");`,
    `CREATE INDEX IF NOT EXISTS "TournamentSupportTicket_category_idx" ON "TournamentSupportTicket"("category");`,
    `CREATE TABLE IF NOT EXISTS "TicketMessage" (
      "id" TEXT NOT NULL,
      "ticketId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "senderRole" TEXT NOT NULL DEFAULT 'PLAYER',
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entity" TEXT,
      "entityId" TEXT,
      "metadata" JSONB,
      "ip" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "userId" TEXT,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetTeamId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetResultId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "targetMessageId" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "severity" TEXT DEFAULT 'MEDIUM';`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "actionTaken" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);`,
    `ALTER TABLE "TournamentSupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);`,

    // 5. GameProfile table creation
    `CREATE TABLE IF NOT EXISTS "GameProfile" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "game" TEXT NOT NULL,
      "gameUid" TEXT,
      "rank" TEXT,
      "level" TEXT,
      "region" TEXT,
      "role" TEXT,
      "availability" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "GameProfile_userId_game_key" ON "GameProfile"("userId", "game");`,
    `CREATE INDEX IF NOT EXISTS "GameProfile_game_rank_region_availability_idx" ON "GameProfile"("game", "rank", "region", "availability");`,
    `CREATE INDEX IF NOT EXISTS "GameProfile_userId_idx" ON "GameProfile"("userId");`,

    // 6. Foreign key constraint for GameProfile
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GameProfile_userId_fkey'
      ) THEN
        ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`,
    `ALTER TABLE "GameProfile" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "ConnectedGame" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;`,

    // 7. Product table creation
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
        CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK');
      END IF;
    END $$;`,
    `CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
      "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");`,
    `CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");`,
    `CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");`,

    // 8. Order table creation
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
      END IF;
    END $$;`,
    `CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL,
      "orderNumber" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
      "totalAmount" DOUBLE PRECISION NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "shippingAddress" JSONB,
      "stripePaymentId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");`,
    `CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");`,
    `CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");`,
    `CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");`,
    `CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");`,
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Order_userId_fkey'
      ) THEN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`,

    // 9. OrderItem table creation
    `CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPrice" DOUBLE PRECISION NOT NULL,
      "totalPrice" DOUBLE PRECISION NOT NULL,
      "size" TEXT,
      "color" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");`,
    `CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");`,
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey'
      ) THEN
        ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey'
      ) THEN
        ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;`,

    // 10. NewsArticle table creation (Editorial & News CMS)
    `CREATE TABLE IF NOT EXISTS "NewsArticle" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "slug" TEXT,
      "summary" TEXT,
      "content" TEXT,
      "imageUrl" TEXT,
      "source" TEXT NOT NULL DEFAULT 'GamerZ Hub Editorial',
      "sourceUrl" TEXT,
      "category" TEXT NOT NULL DEFAULT 'Esports',
      "author" TEXT DEFAULT 'GamerZ Hub Admin',
      "isFeatured" BOOLEAN NOT NULL DEFAULT false,
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_slug_key" ON "NewsArticle"("slug");`,
    `CREATE INDEX IF NOT EXISTS "NewsArticle_isPublished_idx" ON "NewsArticle"("isPublished");`,
    `CREATE INDEX IF NOT EXISTS "NewsArticle_isFeatured_idx" ON "NewsArticle"("isFeatured");`,
    `CREATE INDEX IF NOT EXISTS "NewsArticle_category_idx" ON "NewsArticle"("category");`,
    `CREATE INDEX IF NOT EXISTS "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");`,

    // Session createdAt
    `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `CREATE INDEX IF NOT EXISTS "Session_createdAt_idx" ON "Session"("createdAt");`,

    // Platform Games Catalog
    `CREATE TABLE IF NOT EXISTS "PlatformGame" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "genre" TEXT NOT NULL DEFAULT 'Battle Royale',
      "category" TEXT NOT NULL DEFAULT 'Popular',
      "description" TEXT,
      "logo" TEXT,
      "bannerUrl" TEXT,
      "platforms" TEXT[] DEFAULT ARRAY['PC', 'Mobile']::TEXT[],
      "modes" TEXT[] DEFAULT ARRAY['Solo', 'Squad']::TEXT[],
      "isEnabled" BOOLEAN NOT NULL DEFAULT true,
      "isFeatured" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlatformGame_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "PlatformGame_name_key" ON "PlatformGame"("name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "PlatformGame_slug_key" ON "PlatformGame"("slug");`,
    `CREATE INDEX IF NOT EXISTS "PlatformGame_isEnabled_idx" ON "PlatformGame"("isEnabled");`,
    `CREATE INDEX IF NOT EXISTS "PlatformGame_isFeatured_idx" ON "PlatformGame"("isFeatured");`,
    `CREATE INDEX IF NOT EXISTS "PlatformGame_genre_idx" ON "PlatformGame"("genre");`,

    // User Login Tracking & Historical Sessions
    `CREATE TABLE IF NOT EXISTS "UserLoginEvent" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "username" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "device" TEXT,
      "provider" TEXT NOT NULL DEFAULT 'credentials',
      "success" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserLoginEvent_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE INDEX IF NOT EXISTS "UserLoginEvent_userId_idx" ON "UserLoginEvent"("userId");`,
    `CREATE INDEX IF NOT EXISTS "UserLoginEvent_createdAt_idx" ON "UserLoginEvent"("createdAt");`,
    `CREATE INDEX IF NOT EXISTS "UserLoginEvent_provider_idx" ON "UserLoginEvent"("provider");`,

    // Global Site & Platform Configuration
    `CREATE TABLE IF NOT EXISTS "SiteSetting" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "description" TEXT,
      "category" TEXT NOT NULL DEFAULT 'general',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "SiteSetting_key_key" ON "SiteSetting"("key");`,
    `CREATE INDEX IF NOT EXISTS "SiteSetting_category_idx" ON "SiteSetting"("category");`,

    // Seed default platform games
    `INSERT INTO "PlatformGame" ("id", "name", "slug", "genre", "category", "platforms", "isEnabled", "isFeatured", "sortOrder")
     VALUES 
      ('game-valorant', 'Valorant', 'valorant', 'FPS', 'Tactical Shooter', ARRAY['PC'], true, true, 1),
      ('game-bgmi', 'BGMI / PUBG', 'bgmi', 'Battle Royale', 'Mobile', ARRAY['Mobile', 'Android', 'iOS'], true, true, 2),
      ('game-freefire', 'Free Fire', 'free-fire', 'Battle Royale', 'Mobile', ARRAY['Mobile', 'Android', 'iOS'], true, true, 3),
      ('game-cs2', 'Counter-Strike 2', 'cs2', 'FPS', 'Tactical Shooter', ARRAY['PC'], true, true, 4),
      ('game-lol', 'League of Legends', 'league-of-legends', 'MOBA', 'Strategy', ARRAY['PC'], true, false, 5),
      ('game-dota2', 'Dota 2', 'dota-2', 'MOBA', 'Strategy', ARRAY['PC'], true, false, 6),
      ('game-apex', 'Apex Legends', 'apex-legends', 'Battle Royale', 'Hero Shooter', ARRAY['PC', 'PlayStation', 'Xbox'], true, true, 7),
      ('game-fortnite', 'Fortnite', 'fortnite', 'Battle Royale', 'Sandbox', ARRAY['PC', 'PlayStation', 'Xbox', 'Mobile'], true, true, 8),
      ('game-overwatch2', 'Overwatch 2', 'overwatch-2', 'FPS', 'Hero Shooter', ARRAY['PC', 'PlayStation', 'Xbox'], true, false, 9),
      ('game-rocketleague', 'Rocket League', 'rocket-league', 'Sports', 'Vehicular Soccer', ARRAY['PC', 'PlayStation', 'Xbox'], true, false, 10),
      ('game-r6', 'Rainbow Six Siege', 'rainbow-six-siege', 'FPS', 'Tactical', ARRAY['PC', 'PlayStation', 'Xbox'], true, false, 11),
      ('game-cod', 'Call of Duty: Warzone', 'cod-warzone', 'Battle Royale', 'Military', ARRAY['PC', 'PlayStation', 'Xbox'], true, true, 12),
      ('game-codm', 'Call of Duty Mobile', 'cod-mobile', 'FPS', 'Mobile', ARRAY['Mobile'], true, false, 13),
      ('game-clashofclans', 'Clash of Clans', 'clash-of-clans', 'Strategy', 'Mobile', ARRAY['Mobile'], true, false, 14),
      ('game-clashroyale', 'Clash Royale', 'clash-royale', 'Strategy', 'Card Battler', ARRAY['Mobile'], true, false, 15),
      ('game-brawlstars', 'Brawl Stars', 'brawl-stars', 'Action', 'Mobile', ARRAY['Mobile'], true, false, 16)
     ON CONFLICT ("name") DO NOTHING;`,

    // Seed default site settings
    `INSERT INTO "SiteSetting" ("id", "key", "value", "description", "category")
     VALUES
      ('setting-banner-enabled', 'banner_enabled', 'true', 'Show announcement banner at the top of the website', 'announcement'),
      ('setting-banner-text', 'banner_text', '🔥 Welcome to GamerZ Hub! Discover teammates, join live tournaments, and climb the leaderboards.', 'announcement'),
      ('setting-banner-type', 'banner_type', 'INFO', 'Announcement banner alert style (INFO, SUCCESS, WARNING)', 'announcement'),
      ('setting-banner-link', 'banner_link', '/tournaments', 'Optional link for banner action button', 'announcement'),
      ('setting-maintenance', 'maintenance_mode', 'false', 'Enable maintenance mode for public visitors', 'access'),
      ('setting-registrations', 'registrations_open', 'true', 'Allow new user registrations', 'access')
     ON CONFLICT ("key") DO NOTHING;`
  ];

  console.log('[AutoMigrate] Executing database schema DDL migrations...');

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      executed.push(sql.substring(0, 60) + '...');
    } catch (err: any) {
      console.warn(`[AutoMigrate Warn] SQL statement execution notice:`, err?.message || err);
      errors.push(err?.message || String(err));
    }
  }

  console.log(`[AutoMigrate Complete] Successfully executed ${executed.length} DDL migration step(s).`);
  return { success: errors.length === 0, executed, errors };
}
