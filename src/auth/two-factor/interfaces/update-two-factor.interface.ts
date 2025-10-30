export interface IUpdateTwoFactorData {
  totpEnabled: boolean;
  totpVerified: boolean;
  totpSecret: string | null;
  backupCodes: string[];

  smsEnabled: boolean;
  phoneVerified: boolean;
  phoneNumber: string | null;
  smsCode: string | null;
  smsCodeExpiresAt: Date | null;
  lastUsedAt: Date | null;
}
