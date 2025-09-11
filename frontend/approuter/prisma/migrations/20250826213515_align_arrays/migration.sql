-- Align arrays without data loss:
-- - Convert `documentation_consumers` and `explainability_channels` from CSV text to text[]
-- - Add new array/boolean columns used by rules

-- Add new fields first (idempotent if empty table)
ALTER TABLE "public"."Project"
  ADD COLUMN IF NOT EXISTS "credible_harms"           text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS "domain_threshold_not_met" boolean,
  ADD COLUMN IF NOT EXISTS "robustness_below_baseline" boolean,
  ADD COLUMN IF NOT EXISTS "safety_mitigations"       text[] NOT NULL DEFAULT '{}'::text[];

-- Convert documentation_consumers (text -> text[]) in place
ALTER TABLE "public"."Project"
  ALTER COLUMN "documentation_consumers"
  TYPE text[]
  USING (
    CASE
      WHEN "documentation_consumers" IS NULL OR trim("documentation_consumers") = ''
        THEN '{}'::text[]
      ELSE string_to_array(
             -- normalise spaces around commas before splitting
             regexp_replace("documentation_consumers", '\s*,\s*', ',', 'g'),
             ','
           )
    END
  );

-- Ensure default and nullability match Prisma schema (String[])
ALTER TABLE "public"."Project"
  ALTER COLUMN "documentation_consumers" SET DEFAULT '{}'::text[],
  ALTER COLUMN "documentation_consumers" SET NOT NULL;

-- Convert explainability_channels (text -> text[]) in place
ALTER TABLE "public"."Project"
  ALTER COLUMN "explainability_channels"
  TYPE text[]
  USING (
    CASE
      WHEN "explainability_channels" IS NULL OR trim("explainability_channels") = ''
        THEN '{}'::text[]
      ELSE string_to_array(
             regexp_replace("explainability_channels", '\s*,\s*', ',', 'g'),
             ','
           )
    END
  );

-- Ensure default and nullability match Prisma schema (String[])
ALTER TABLE "public"."Project"
  ALTER COLUMN "explainability_channels" SET DEFAULT '{}'::text[],
  ALTER COLUMN "explainability_channels" SET NOT NULL;
