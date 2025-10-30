import { IsStrongPasswordOptions } from 'class-validator';

export const PASSWORD_CONFIG: IsStrongPasswordOptions = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

export enum STRATEGIES {
  GOOGLE = 'google',
  GITHUB = 'github',
  LOCAL = 'local',
}
