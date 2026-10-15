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
    END $$;`
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
