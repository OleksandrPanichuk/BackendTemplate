import { Tenant } from '@prisma/generated';

export class TenantEntity implements Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(partial: Partial<Tenant>) {
    Object.assign(this, partial);
  }
}
