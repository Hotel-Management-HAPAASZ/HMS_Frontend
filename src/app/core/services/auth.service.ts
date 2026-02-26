// core/services/auth.service.ts
import { Injectable, Inject, signal } from '@angular/core';
import { Router } from '@angular/router';
// import { HttpClient } from '@angular/common/http';
import { User, Role } from '../models/models';
// src/app/core/services/auth.service.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { StorageService } from './storage.service';
import { AuthResponse, Session } from '../models/auth.models';
import { API_BASE_URL } from '../../app.config';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';

const SESSION_KEY = 'app_session_v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);
  user = this._user.asReadonly();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router,
    @Inject(API_BASE_URL) private apiBaseUrl: string
  ) {
    // Try restore session on app start
    const session = this.storage.get<Session | null>(SESSION_KEY, null);
    if (session?.token && !this.isTokenExpired(session.token)) {
      const compatUser: User = {
        id: session.user.id,
        fullName: session.user.fullName,
        email: session.user.email,
        password: '',
        phone: undefined,
        role: session.user.role,
        active: true
      };
      this._user.set(compatUser);
    } else {
      this.storage.remove(SESSION_KEY);
    }
  }

  isLoggedIn(): boolean {
    return !!this._user();
  }

  role(): Role | null {
    return this._user()?.role ?? null;
  }

  /** STEP 1: Login calling backend */
  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, { email, password })
      .pipe(
        map((res) => {
          if (!res?.token) throw new Error('Invalid login response: token missing');
          if (this.isTokenExpired(res.token)) throw new Error('Received an expired token');

          const session: Session = {
            token: res.token,
            firstLogin: res.firstLogin,
            user: {
              id: String(res.id),
              fullName: res.userName,
              email: res.email,
              role: res.role
            }
          };

          this.storage.set(SESSION_KEY, session);

          const compatUser: User = {
            id: session.user.id,
            fullName: session.user.fullName,
            email: session.user.email,
            password: '',
            phone: undefined,
            role: session.user.role,
            active: true
          };

          this._user.set(compatUser);
          return compatUser;
        }),
        shareReplay(1),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            'Login failed';
          return throwError(() => new Error(msg));
        })
      );
  }

  /** Registration (no auto-login) */

register(fullName: string, email: string, password: string, phone: string) {
  const payload = { userName: fullName, email, password, phoneNumber: phone };

  return this.http
    .post<any>(`${this.apiBaseUrl}/auth/register/customer`, payload)
    .pipe(
      map((res) => {
        const user: User = {
          id: String(res.id),
          fullName,
          email: res.email,
          password: '',
          phone,
          role: res.role,
          active: true
        };
        return user;
      }),
      catchError((err: HttpErrorResponse) => {
        // Prefer backend JSON message if present
        let msg = 'Registration failed';
        if (typeof err.error === 'string' && err.error.trim().length) {
          // Plain text body (e.g., "Email already exists")
          msg = err.error;
        } else if (err.error?.message) {
          msg = err.error.message;
        } else if (err.message) {
          msg = err.message;
        }
        return throwError(() => new Error(msg));
      })
    );
}


  logout() {
    this._user.set(null);
    this.storage.remove(SESSION_KEY);
    this.router.navigateByUrl('/auth/login');
  }

  /** Utility: decode JWT and check expiry */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expMs = payload.exp * 1000;
      return Date.now() > expMs;
    } catch {
      return true;
    }
  }

  // ----------------------
  // Forgot Password Flow
  // ----------------------
// 1) Forgot Password - expect *text* not JSON
forgotPassword(email: string): Observable<void> {
  return this.http
    .post(`${this.apiBaseUrl}/forgot/forgot-password`, { email }, { responseType: 'text' as 'json' })
    .pipe(
      // we don't need the string, just map to void
      map(() => void 0),
      catchError((err) => {
        const msg =
          err?.error?.message ||
          err?.error ||
          err?.message ||
          'Failed to start password reset';
        return throwError(() => new Error(msg));
      })
    );
}

// 2) Verify OTP - you already did this correctly (expects text token)
verifyOtp(email: string, otp: string): Observable<string> {
  return this.http
    .post(`${this.apiBaseUrl}/forgot/verify-otp`, { email, otp }, { responseType: 'text' as 'json' })
    .pipe(
      map((token) => String(token)),
      catchError((err) => {
        const msg =
          err?.error?.message ||
          err?.error ||
          err?.message ||
          'Invalid or expired OTP';
        return throwError(() => new Error(msg));
      })
    );
}

// 3) Reset Password - if your backend returns plain text here too, add responseType
resetPassword(email: string, resetToken: string, newPassword: string): Observable<void> {
  return this.http
    .post(`${this.apiBaseUrl}/forgot/reset-password`, { email, resetToken, newPassword }, { responseType: 'text' as 'json' })
    .pipe(
      map(() => void 0),
      catchError((err) => {
        const msg =
          err?.error?.message ||
          err?.error ||
          err?.message ||
          'Password reset failed';
        return throwError(() => new Error(msg));
      })
    );
}}
