-- AlterTable
ALTER TABLE "TournamentSupportTicket" 
ADD COLUMN "targetUserId" TEXT,
ADD COLUMN "targetTeamId" TEXT,
ADD COLUMN "targetResultId" TEXT,
ADD COLUMN "targetMessageId" TEXT,
ADD COLUMN "evidenceUrl" TEXT,
ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "actionTaken" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TournamentSupportTicket_category_idx" ON "TournamentSupportTicket"("category");

-- AddForeignKey
ALTER TABLE "TournamentSupportTicket" ADD CONSTRAINT "TournamentSupportTicket_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSupportTicket" ADD CONSTRAINT "TournamentSupportTicket_targetTeamId_fkey" FOREIGN KEY ("targetTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSupportTicket" ADD CONSTRAINT "TournamentSupportTicket_targetResultId_fkey" FOREIGN KEY ("targetResultId") REFERENCES "TournamentResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSupportTicket" ADD CONSTRAINT "TournamentSupportTicket_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
