import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'GUEST';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface BackendUser {
  id: number | string;
  userName?: string;            // backend uses userName
  email: string;
  role: UserRole;
  phoneNumber?: string;
  status?: AccountStatus;       // if present on entity
  active?: boolean;             // or sometimes boolean
  accountStatus?: AccountStatus;// if present
  // ...any other fields the backend returns
}

export interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface CreateUserWithStaffRequest {
  user: CreateUserRequest;
  departmentName: string;
}

@Injectable({ providedIn: 'root' })
export class ApiUserService {
  private readonly baseUrl = 'http://localhost:8080/api/user';

  constructor(private http: HttpClient) {}

  // ---- LIST USERS (paged + optional filters) ----
  async listUsers(params?: {
    search?: string;
    role?: UserRole;
    status?: AccountStatus;
    page?: number; size?: number; sort?: string; // e.g. 'userName,asc'
  }): Promise<PageResp<BackendUser>> {
    let p = new HttpParams()
      .set('page', String(params?.page ?? 0))
      .set('size', String(params?.size ?? 20))
      .set('sort', params?.sort ?? 'userName,asc');
    if (params?.search) p = p.set('search', params.search);
    if (params?.role)   p = p.set('role', params.role);
    if (params?.status) p = p.set('status', params.status);

    return await firstValueFrom(this.http.get<PageResp<BackendUser>>(`${this.baseUrl}/users`, { params: p }));
  }

  // ---- CREATE CUSTOMER / GENERIC USER ----
  async createUser(body: CreateUserRequest): Promise<BackendUser> {
    return await firstValueFrom(this.http.post<BackendUser>(`${this.baseUrl}/users`, body));
  }

  // ---- CREATE STAFF ----
  async createStaff(body: CreateUserWithStaffRequest): Promise<BackendUser> {
    return await firstValueFrom(this.http.post<BackendUser>(`${this.baseUrl}/staff`, body));
  }

  // ---- UPDATE USER ----
  async updateUser(userId: number | string, patch: any): Promise<BackendUser> {
    return await firstValueFrom(this.http.put<BackendUser>(`${this.baseUrl}/users/${userId}`, patch));
  }

  // ---- SET ACTIVE VIA PUT /status?active= ----
  async setActive(userId: number | string, active: boolean): Promise<void> {
    await firstValueFrom(this.http.put(`${this.baseUrl}/users/${userId}/status`, null, {
      params: new HttpParams().set('active', String(active))
    }));
  }

  // ---- PATCH helpers from your controller ----
  async deactivate(userId: number | string): Promise<{ message: string; status: string }> {
    return await firstValueFrom(this.http.patch<{ message: string; status: string }>(`${this.baseUrl}/users/${userId}/deactivate`, {}));
  }

  async reactivate(userId: number | string): Promise<{ message: string; status: string }> {
    return await firstValueFrom(this.http.patch<{ message: string; status: string }>(`${this.baseUrl}/users/${userId}/reactivate`, {}));
  }

  async hardDelete(userId: number | string): Promise<{ message: string }> {
    return await firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl}/${userId}`));
  }
}