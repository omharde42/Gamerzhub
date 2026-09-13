-- CreateEnum
CREATE TYPE "FreeFireTeammateRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "FreeFireProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "freeFireUid" TEXT,
    "freeFireUsername" TEXT,
    "preferredMode" TEXT NOT NULL DEFAULT 'BR_SQUAD',
    "rank" TEXT NOT NULL DEFAULT 'HEROIC',
    "playstyle" TEXT NOT NULL DEFAULT 'BALANCED',
    "language" TEXT NOT NULL DEFAULT 'ENGLISH',
    "micPreference" BOOLEAN NOT NULL DEFAULT true,
    "availability" TEXT NOT NULL DEFAULT 'EVENING',
    "teammatePreference" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeFireProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeFireTeammateRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FreeFireTeammateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeFireTeammateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeFireSessionRating" (
    "id" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "communicationRating" INTEGER,
    "reliabilityRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeFireSessionRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeFireProfile_userId_key" ON "FreeFireProfile"("userId");

-- CreateIndex
CREATE INDEX "FreeFireProfile_userId_idx" ON "FreeFireProfile"("userId");

-- CreateIndex
CREATE INDEX "FreeFireProfile_rank_idx" ON "FreeFireProfile"("rank");

-- CreateIndex
CREATE INDEX "FreeFireProfile_playstyle_idx" ON "FreeFireProfile"("playstyle");

-- CreateIndex
CREATE INDEX "FreeFireProfile_availability_idx" ON "FreeFireProfile"("availability");

-- CreateIndex
CREATE INDEX "FreeFireProfile_reputationScore_idx" ON "FreeFireProfile"("reputationScore");

-- CreateIndex
CREATE INDEX "FreeFireTeammateRequest_senderId_idx" ON "FreeFireTeammateRequest"("senderId");

-- CreateIndex
CREATE INDEX "FreeFireTeammateRequest_receiverId_idx" ON "FreeFireTeammateRequest"("receiverId");

-- CreateIndex
CREATE INDEX "FreeFireTeammateRequest_status_idx" ON "FreeFireTeammateRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FreeFireTeammateRequest_senderId_receiverId_status_key" ON "FreeFireTeammateRequest"("senderId", "receiverId", "status");

-- CreateIndex
CREATE INDEX "FreeFireSessionRating_raterId_idx" ON "FreeFireSessionRating"("raterId");

-- CreateIndex
CREATE INDEX "FreeFireSessionRating_ratedUserId_idx" ON "FreeFireSessionRating"("ratedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FreeFireSessionRating_raterId_ratedUserId_key" ON "FreeFireSessionRating"("raterId", "ratedUserId");

-- AddForeignKey
ALTER TABLE "FreeFireProfile" ADD CONSTRAINT "FreeFireProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeFireTeammateRequest" ADD CONSTRAINT "FreeFireTeammateRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeFireTeammateRequest" ADD CONSTRAINT "FreeFireTeammateRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeFireSessionRating" ADD CONSTRAINT "FreeFireSessionRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeFireSessionRating" ADD CONSTRAINT "FreeFireSessionRating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
