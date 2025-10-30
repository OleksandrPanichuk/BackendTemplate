import { Session } from 'express-session';

export type TOAuthUser = {
  email: string;
  avatar: {
    url: string;
  };
  username: string;
  firstName?: string;
  lastName?: string;
};

export type TSession = Session & {
  passport?: {
    user?: string;
    verified?: boolean;
  };
  pending2FA?: {
    userId: string;
    timestamp: number;
  };
};
