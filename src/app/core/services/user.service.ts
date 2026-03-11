import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

import { StorageService } from './storage.service';
import type { User } from '../models/models';

// ----- CONFIG (no environment) -----
const API_BASE = 'http://localhost:8080/api'; // change if needed
const USERS_KEY = 'app_users_v1';
const API_HEALTH_URL = `${API_BASE}/health`; // change to an endpoint you have
const API_USERS_URL = `${API_BASE}/user/users`;    // ✅ matches backend /api/user/users
const API_AVAILABILITY_CACHE_KEY = 'api_available_v1';

export interface UpdateUserRequest {
  userName?: string;
  email?: string;
  phone?: string;
}

// ----- HELPERS -----
function uuid() {
  return (globalThis as any)?.crypto?.randomUUID?.()
    ?? Math.random().toString(16).slice(2) + Date.now().toString(16);
}

type Source = 'api' | 'local' | 'auto';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  // Cached API availability status (null = unknown; true/false = known)
  private apiAvailable: boolean | null = null;
  private apiProbe$?: Observable<boolean>;

  constructor(
    private storage: StorageService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // Restore cached availability (optional) and seed local users in browser
    if (isPlatformBrowser(this.platformId)) {
      const cached = localStorage.getItem(API_AVAILABILITY_CACHE_KEY);
      this.apiAvailable = cached === null ? null : cached === 'true';
      this.seed();
    }
  }

  // -------- LocalStorage (sync, backward compatible) --------
  private seed() {
    const existing = this.storage.get<User[]>(USERS_KEY, []);
    if (existing.length) return;

    const seedUsers: User[] = [
      {
        id: uuid(),
        fullName: 'Admin User',
        email: 'admin@hotel.com',
        password: 'Admin@123',
        role: 'ADMIN',
        active: true,
        phone: '9999999999'
      },
      {
        id: uuid(),
        fullName: 'Staff User',
        email: 'staff@hotel.com',
        password: 'Staff@123',
        role: 'STAFF',
        active: true,
        phone: '8888888888'
      },
      {
        id: uuid(),
        fullName: 'Customer User',
        email: 'customer@hotel.com',
        password: 'Customer@123',
        role: 'CUSTOMER',
        active: true,
        phone: '7777777777'
      }
    ];

    this.storage.set(USERS_KEY, seedUsers);
  }

  list(): User[] {
    return this.storage.get<User[]>(USERS_KEY, []);
  }

  byId(id: string): User | undefined {
    return this.list().find(u => u.id === id);
  }

  byEmail(email: string): User | undefined {
    return this.list().find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  create(user: Omit<User, 'id' | 'active'>): User {
    const users = this.list();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const newUser: User = { ...user, id: uuid(), active: true };
    users.push(newUser);
    this.storage.set(USERS_KEY, users);
    return newUser;
  }

  update(user: User): User {
    const users = this.list();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = user;
    this.storage.set(USERS_KEY, users);
    return user;
  }

  setActive(userId: string, active: boolean) {
    const u = this.byId(userId);
    if (!u) return;
    this.update({ ...u, active });
  }

  // -------- API availability (runtime probe, cached) --------
  private probeApi$(): Observable<boolean> {
    // If we already have a cached boolean, return it.
    if (this.apiAvailable !== null) return of(this.apiAvailable);

    // If a probe is already in-flight, reuse it (shareReplay).
    if (this.apiProbe$) return this.apiProbe$;

    // Probe a cheap endpoint; change URL if /health doesn't exist
    this.apiProbe$ = this.http.get(API_HEALTH_URL, { responseType: 'text' }).pipe(
      map(() => true),
      catchError(() => of(false)),
      map((available) => {
        this.apiAvailable = available;
        try {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(API_AVAILABILITY_CACHE_KEY, String(available));
          }
        } catch {}
        return available;
      }),
      shareReplay(1)
    );

    return this.apiProbe$;
  }

  private resolveSource$(requested: Source = 'auto'): Observable<'api' | 'local'> {
    if (requested === 'api') return of('api');
    if (requested === 'local') return of('local');
    // Always prefer API. The catchError blocks will fallback to local automatically if the API is down or user is only local.
    return of('api');
  }

  // -------- Async API (with fallback) --------

  /**
   * Get user by id as Observable.
   * - source: 'api' | 'local' | 'auto' (default: 'auto')
   */
  getById$(userId: number | string, options?: { source?: Source }): Observable<User> {
    const source = options?.source ?? 'auto';
    return this.resolveSource$(source).pipe(
      switchMap((resolved) => {
        if (resolved === 'api') {
          return this.http.get<any>(`${API_USERS_URL}/${userId}`).pipe( // ✅ /api/users/{id}
            map(apiUser => this.mapApiUserToAppUser(apiUser)),
            catchError(err => {
              // On API error, fallback to local automatically
              const local = this.byId(String(userId));
              return local ? of(local) : throwError(() => err);
            })
          );
        } else {
          const local = this.byId(String(userId));
          return local
            ? of(local)
            : throwError(() => new Error('User not found'));
        }
      })
    );
  }

  /** Alias (Observable) in case some code calls getById(...) instead of getById$ */
  getById(userId: number | string, options?: { source?: Source }): Observable<User> {
    return this.getById$(userId, options);
  }

  /**
   * Update profile via DTO (userName/email/phone).
   * - source: 'api' | 'local' | 'auto' (default: 'auto')
   */
  private updateProfileCore(
    userId: number | string,
    payload: UpdateUserRequest,
    options?: { source?: Source }
  ): Observable<User> {
    const source = options?.source ?? 'auto';
    return this.resolveSource$(source).pipe(
      switchMap((resolved) => {
        if (resolved === 'api') {
          return this.http.put<any>(`${API_USERS_URL}/${userId}`, payload).pipe( // ✅ /api/users/{id}
            map(apiUser => this.mapApiUserToAppUser(apiUser)),
            catchError(err => {
              // On API error, fallback to local patch
              const fallback = this.patchLocalUser(userId, payload);
              return fallback ?? throwError(() => err);
            })
          );
        } else {
          const patched$ = this.patchLocalUser(userId, payload);
          return patched$ ?? throwError(() => new Error('User not found'));
        }
      })
    );
  }

  /** Expose both names to avoid refactors in components */
  updateProfile$(userId: number | string, payload: UpdateUserRequest, options?: { source?: Source }): Observable<User> {
    return this.updateProfileCore(userId, payload, options);
  }
  updateProfile(userId: number | string, payload: UpdateUserRequest, options?: { source?: Source }): Observable<User> {
    return this.updateProfileCore(userId, payload, options);
  }

  // -------- Mapping & local patch helpers --------

  private mapApiUserToAppUser(apiUser: any): User {
    return {
      id: String(apiUser.id ?? apiUser.userId ?? apiUser.uuid ?? ''),
      fullName: apiUser.fullName ?? apiUser.userName ?? '',
      email: apiUser.email ?? '',
      password: apiUser.password ?? '',  // usually not returned by API
      role: apiUser.role ?? 'CUSTOMER',
      active: apiUser.active ?? true,
      phone: apiUser.phone ?? undefined
    };
  }

  private patchLocalUser(userId: number | string, payload: UpdateUserRequest): Observable<User> | null {
    const idStr = String(userId);
    let existing = this.byId(idStr);

    // Optional: try fallback by email if ID doesn't match (useful when local uses UUIDs)
    if (!existing && payload.email) {
      existing = this.byEmail(payload.email);
    }

    if (!existing) return null;

    const patched: User = {
      ...existing,
      fullName: payload.userName ?? existing.fullName,
      email: payload.email ?? existing.email,
      phone: payload.phone ?? existing.phone
    };
    this.update(patched);
    return of(patched);
  }
}