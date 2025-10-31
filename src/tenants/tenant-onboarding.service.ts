import { TenantsRepository } from '@/tenants/tenants.repository';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);

  constructor(private readonly tenantsRepository: TenantsRepository) {}

  public async createDefaultTenant(userId: string, username: string) {
    try {
      const slug = await this.generateUniqueSlug(username);

      const tenant = await this.tenantsRepository.create({
        name: `${username}'s Workspace`,
        slug,
        ownerId: userId,
      });

      this.logger.log(
        `Default tenant created for user ${userId}: ${tenant.id}`,
      );
      return tenant;
    } catch (error) {
      this.logger.error(
        `Failed to create default tenant for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let attempt = 0;
    let uniqueSlug = slug;

    while (await this.tenantsRepository.findBySlug(uniqueSlug)) {
      attempt++;
      uniqueSlug = `${slug}-${attempt}`;
    }

    return uniqueSlug;
  }
}
