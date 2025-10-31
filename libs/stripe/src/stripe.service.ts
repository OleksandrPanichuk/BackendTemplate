import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constants';
import {
  IBillingPortalSessionData,
  ISubscriptionCheckoutSessionData,
} from './stripe.interfaces';

@Injectable()
export class StripeService {
  constructor(@Inject(STRIPE_CLIENT) private readonly client: Stripe) {}

  public getClient(): Stripe {
    return this.client;
  }

  public createProduct(
    params: Stripe.ProductCreateParams,
  ): Promise<Stripe.Product> {
    return this.client.products.create(params);
  }

  public retrieveProduct(productId: string): Promise<Stripe.Product> {
    return this.client.products.retrieve(productId);
  }

  public updateProduct(
    productId: string,
    params: Stripe.ProductUpdateParams,
  ): Promise<Stripe.Product> {
    return this.client.products.update(productId, params);
  }

  public archiveProduct(productId: string): Promise<Stripe.Product> {
    return this.client.products.update(productId, { active: false });
  }

  public listProducts(
    params?: Stripe.ProductListParams,
  ): Promise<Stripe.ApiList<Stripe.Product>> {
    return this.client.products.list(params);
  }

  public createPrice(params: Stripe.PriceCreateParams): Promise<Stripe.Price> {
    return this.client.prices.create(params);
  }

  public retrievePrice(priceId: string): Promise<Stripe.Price> {
    return this.client.prices.retrieve(priceId);
  }

  public updatePrice(
    priceId: string,
    params: Stripe.PriceUpdateParams,
  ): Promise<Stripe.Price> {
    return this.client.prices.update(priceId, params);
  }

  public deactivatePrice(priceId: string): Promise<Stripe.Price> {
    return this.client.prices.update(priceId, { active: false });
  }

  public listPrices(
    params?: Stripe.PriceListParams,
  ): Promise<Stripe.ApiList<Stripe.Price>> {
    return this.client.prices.list(params);
  }

  public createCustomer(
    params: Stripe.CustomerCreateParams,
  ): Promise<Stripe.Customer> {
    return this.client.customers.create(params);
  }

  public retrieveCustomer(
    customerId: string,
  ): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    return this.client.customers.retrieve(customerId);
  }

  public updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    return this.client.customers.update(customerId, params);
  }

  public deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    return this.client.customers.del(customerId);
  }

  public createSubscription(
    params: Stripe.SubscriptionCreateParams,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.create(params);
  }

  public retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  public updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, params);
  }

  public cancelSubscription(
    subscriptionId: string,
    params?: Stripe.SubscriptionCancelParams,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.cancel(subscriptionId, params);
  }

  public cancelSubscriptionAtPeriodEnd(
    subscriptionId: string,
    params?: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, {
      ...(params ?? {}),
      cancel_at_period_end: true,
    });
  }

  public resumeSubscription(
    subscriptionId: string,
    params?: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    return this.client.subscriptions.update(subscriptionId, {
      ...(params ?? {}),
      cancel_at_period_end: false,
    });
  }

  public listSubscriptions(
    params?: Stripe.SubscriptionListParams,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.client.subscriptions.list(params);
  }

  public listCustomerSubscriptions(
    customerId: string,
    params?: Omit<Stripe.SubscriptionListParams, 'customer'>,
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return this.client.subscriptions.list({
      ...(params ?? {}),
      customer: customerId,
    });
  }

  public createSubscriptionItem(
    params: Stripe.SubscriptionItemCreateParams,
  ): Promise<Stripe.SubscriptionItem> {
    return this.client.subscriptionItems.create(params);
  }

  public updateSubscriptionItem(
    itemId: string,
    params: Stripe.SubscriptionItemUpdateParams,
  ): Promise<Stripe.SubscriptionItem> {
    return this.client.subscriptionItems.update(itemId, params);
  }

  public deleteSubscriptionItem(
    itemId: string,
    params?: Stripe.SubscriptionItemDeleteParams,
  ): Promise<Stripe.DeletedSubscriptionItem> {
    return this.client.subscriptionItems.del(itemId, params);
  }

  public createSubscriptionCheckoutSession(
    data: ISubscriptionCheckoutSessionData,
  ): Promise<Stripe.Checkout.Session> {
    const subscriptionData:
      | Stripe.Checkout.SessionCreateParams.SubscriptionData
      | undefined =
      data.trialPeriodDays || data.subscriptionMetadata
        ? {
            trial_period_days: data.trialPeriodDays,
            metadata: data.subscriptionMetadata,
          }
        : undefined;

    const discounts:
      | Stripe.Checkout.SessionCreateParams.Discount[]
      | undefined = data.promotionCodeId
      ? [{ promotion_code: data.promotionCodeId }]
      : undefined;

    return this.client.checkout.sessions.create({
      mode: 'subscription',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      customer: data.customerId,
      customer_email: data.customerEmail,
      line_items: [
        {
          price: data.priceId,
          quantity: data.quantity ?? 1,
        },
      ],
      metadata: data.metadata,
      subscription_data: subscriptionData,
      allow_promotion_codes: data.allowPromotionCodes,
      discounts,
    });
  }

  public retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.retrieve(sessionId);
  }

  public createBillingPortalSession(
    data: IBillingPortalSessionData,
  ): Promise<Stripe.BillingPortal.Session> {
    return this.client.billingPortal.sessions.create({
      customer: data.customerId,
      return_url: data.returnUrl,
    });
  }
}
