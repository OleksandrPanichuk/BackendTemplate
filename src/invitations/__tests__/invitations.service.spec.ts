import { InvitationsRepository, InvitationsService } from '@/invitations';
import { Test } from '@nestjs/testing';
import { UsersRepository } from '@/users';
import { MembersRepository } from '@/members';

describe('InvitationsService', () => {
  let service: InvitationsService;

  let mockInvitationsRepository = {
    findByWorkspaceIdAndUserId: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  let mockUsersRepository = {
    findByEmail: jest.fn(),
  };

  let mockMembersRepository = {
    findByWorkspaceIdAndUserId: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: InvitationsRepository,
          useValue: mockInvitationsRepository,
        },
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: MembersRepository,
          useValue: mockMembersRepository,
        },
      ],
    }).compile();

    service = module.get(InvitationsService);
  });
});
