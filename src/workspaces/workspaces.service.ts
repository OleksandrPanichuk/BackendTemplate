import { Injectable } from '@nestjs/common';
import { WorkspacesRepository } from '@/workspaces/workspaces.repository';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  public async findByUserId(userId: string) {
    return this.workspacesRepository.findByUserId(userId);
  }
}
