-- AlterTable
ALTER TABLE "public"."verification_codes" ADD COLUMN     "resend_count" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "code" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "public"."two_factor_auth" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "totp_secret" VARCHAR(255),
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_verified" BOOLEAN NOT NULL DEFAULT false,
    "backup_codes" TEXT[],
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "phone_number" VARCHAR(20),
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_user_id_key" ON "public"."two_factor_auth"("user_id");

-- AddForeignKey
ALTER TABLE "public"."two_factor_auth" ADD CONSTRAINT "two_factor_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
