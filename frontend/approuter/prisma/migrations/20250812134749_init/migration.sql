-- CreateTable
CREATE TABLE "public"."Project" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "userId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data_types" TEXT,
    "model_type" TEXT,
    "deployment_env" TEXT,
    "special_category_data" BOOLEAN NOT NULL DEFAULT false,
    "processes_personal_data" BOOLEAN NOT NULL DEFAULT false,
    "privacy_techniques" TEXT,
    "explainability_tooling" TEXT,
    "interpretability_rating" TEXT,
    "drift_detection" TEXT,
    "retraining_cadence" TEXT,
    "penetration_tested" BOOLEAN,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assessment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flags" JSONB NOT NULL,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_sessionId_idx" ON "public"."Project"("sessionId");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "public"."Project"("createdAt");

-- CreateIndex
CREATE INDEX "Assessment_projectId_idx" ON "public"."Assessment"("projectId");

-- CreateIndex
CREATE INDEX "Assessment_createdAt_idx" ON "public"."Assessment"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Assessment" ADD CONSTRAINT "Assessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
