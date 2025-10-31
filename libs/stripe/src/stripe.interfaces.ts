export interface ISubscriptionCheckoutSessionData {
  successUrl: string;
  cancelUrl: string;
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  quantity?: number;
  metadata?: Record<string, string>;
  subscriptionMetadata?: Record<string, string>;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
  promotionCodeId?: string;
}

export interface IBillingPortalSessionData {
  customerId: string;
  returnUrl: string;
}
