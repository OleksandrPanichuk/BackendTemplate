import { TenantMemberRole } from "@prisma/generated";

export interface ITenantContext {
  id: string;
  role: TenantMemberRole;
}

export interface ICreateTenantData {
  name: string;
  slug: string;
  ownerId: string;
}

export interface IUpdateTenantData {
  name?: string;
  slug?: string;
}
