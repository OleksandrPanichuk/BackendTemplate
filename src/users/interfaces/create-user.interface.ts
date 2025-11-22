export interface ICreateUserData {
  email: string;
  username: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
}
