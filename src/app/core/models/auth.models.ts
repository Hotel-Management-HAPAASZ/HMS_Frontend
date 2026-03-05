
import { Role } from './models';

export interface AuthResponse {
  id: number;
  userName: string;
  email: string;
  role: Role;
  token: string;
  firstLogin: boolean;
  phoneNumber?: string;
}

export interface Session {
  token: string;

  firstLogin?: boolean;

  user: {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    phone?: string;
  };
}