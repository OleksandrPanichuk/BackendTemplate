import { TenantMember, TenantMemberRole } from '@prisma/generated';

export class TenantMemberEntity implements TenantMember {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly role: TenantMemberRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(partial: Partial<TenantMember>) {
    Object.assign(this, partial);
  }
}
