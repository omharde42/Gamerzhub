-- CreateEnum
CREATE TYPE "GameJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GameProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "identityData" JSONB NOT NULL,
    "rank" TEXT,
    "playstyle" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ENGLISH',
    "micPreference" BOOLEAN NOT NULL DEFAULT true,
    "availability" TEXT NOT NULL DEFAULT 'EVENING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityType" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "title" TEXT,
    "roomCode" TEXT,
    "roomPassword" TEXT,
    "joinUrl" TEXT,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'OPEN',
    "maxParticipants" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameJoinRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "GameJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionRating" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSessionRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameProfile_userId_gameId_key" ON "GameProfile"("userId", "gameId");
CREATE INDEX "GameProfile_userId_idx" ON "GameProfile"("userId");
CREATE INDEX "GameProfile_gameId_idx" ON "GameProfile"("gameId");
CREATE INDEX "GameProfile_rank_idx" ON "GameProfile"("rank");
CREATE INDEX "GameProfile_playstyle_idx" ON "GameProfile"("playstyle");
CREATE INDEX "GameProfile_reputationScore_idx" ON "GameProfile"("reputationScore");

-- CreateIndex
CREATE INDEX "GameSession_gameId_idx" ON "GameSession"("gameId");
CREATE INDEX "GameSession_hostId_idx" ON "GameSession"("hostId");
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionParticipant_sessionId_userId_key" ON "GameSessionParticipant"("sessionId", "userId");
CREATE INDEX "GameSessionParticipant_sessionId_idx" ON "GameSessionParticipant"("sessionId");
CREATE INDEX "GameSessionParticipant_userId_idx" ON "GameSessionParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameJoinRequest_sessionId_senderId_status_key" ON "GameJoinRequest"("sessionId", "senderId", "status");
CREATE INDEX "GameJoinRequest_sessionId_idx" ON "GameJoinRequest"("sessionId");
CREATE INDEX "GameJoinRequest_senderId_idx" ON "GameJoinRequest"("senderId");
CREATE INDEX "GameJoinRequest_receiverId_idx" ON "GameJoinRequest"("receiverId");
CREATE INDEX "GameJoinRequest_status_idx" ON "GameJoinRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionRating_sessionId_raterId_ratedUserId_key" ON "GameSessionRating"("sessionId", "raterId", "ratedUserId");
CREATE INDEX "GameSessionRating_sessionId_idx" ON "GameSessionRating"("sessionId");
CREATE INDEX "GameSessionRating_raterId_idx" ON "GameSessionRating"("raterId");
CREATE INDEX "GameSessionRating_ratedUserId_idx" ON "GameSessionRating"("ratedUserId");

-- AddForeignKey
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSessionParticipant" ADD CONSTRAINT "GameSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSessionParticipant" ADD CONSTRAINT "GameSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameJoinRequest" ADD CONSTRAINT "GameJoinRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSessionRating" ADD CONSTRAINT "GameSessionRating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSessionRating" ADD CONSTRAINT "GameSessionRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSessionRating" ADD CONSTRAINT "GameSessionRating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
