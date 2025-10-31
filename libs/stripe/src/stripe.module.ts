import { Env } from '@/shared/config';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.constants';
import { StripeService } from './stripe.service';

@Module({
  providers: [
    StripeService,
    {
      provide: STRIPE_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Stripe(config.get<string>(Env.STRIPE_API_KEY)!, {
          apiVersion: '2025-10-29.clover',
          typescript: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [StripeService],
})
export class StripeModule {}
