export interface ICreateVerificationCodeData {
  code: string;
  userId: string;
  expiresAt: Date;
  consumedAt?: Date;
  resendCount?: number;
}
