import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="auth-bg d-flex align-items-center justify-content-center min-vh-100 px-3 py-4">
      <div class="container">
        <div class="row justify-content-center">
          <!-- Wider -->
          <div class="col-12 col-sm-11 col-md-9 col-lg-7 col-xl-6">

            <!-- Shorter -->
            <div class="app-card login-card p-3 p-md-4">
              <!-- Header -->
              <div class="text-center mb-3">
                <div class="logo-badge mx-auto mb-2">H</div>
                <h3 class="fw-bold mb-1">Login</h3>
                <p class="text-muted mb-0 small">Sign in to continue</p>
              </div>

              <!-- Form -->
              <form [formGroup]="form" (ngSubmit)="submit()">

                <!-- Email -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="you@email.com"
                  />
                  <div
                    class="text-danger small mt-1"
                    *ngIf="form.controls.email.touched && form.controls.email.invalid"
                  >
                    Valid email required
                  </div>
                </div>

                <!-- Password -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Password</label>
                  <input
                    type="password"
                    class="form-control"
                    formControlName="password"
                    placeholder="********"
                  />
                  <div
                    class="text-danger small mt-1"
                    *ngIf="form.controls.password.touched && form.controls.password.invalid"
                  >
                    Password required
                  </div>
                </div>

                <!-- Forgot Password -->
                
<div class="d-flex justify-content-end mb-2">
  <a routerLink="/auth/forgot-password" class="small text-decoration-none">
    Forgot password?
  </a>
</div>


                <!-- Button -->
                <button
                  type="submit"
                  class="btn btn-app w-100"
                  [disabled]="form.invalid || loading"
                >
                  <span *ngIf="!loading">Login</span>
                  <span *ngIf="loading" class="d-inline-flex align-items-center gap-2">
                    <span class="spinner-border spinner-border-sm"></span>
                    Logging in...
                  </span>
                </button>

                <!-- Register -->
                <div class="text-center mt-2">
                  <span class="text-muted small">New user?</span>
                  <a
                    routerLink="/auth/register"
                    class="small fw-semibold text-decoration-none ms-1"
                  >
                    Create account
                  </a>
                </div>

              </form>
            </div>

            <div class="text-center mt-3 small text-muted">
              © 2026 Hotel Booking System
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-bg {
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.18), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.16), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.10), transparent 55%),
        var(--app-bg);
    }

    .logo-badge {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
    }

    /* Wider + shorter card */
    .login-card {
      max-width: 560px;
      margin: 0 auto;
    }

    /* Reduce control height to reduce card height */
    .login-card .form-control {
      padding: 10px 12px;
      font-size: 0.95rem;
    }
  `]
})
export class LoginComponent {
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) { }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: (user) => {
        this.loading = false;
        console.log('[LOGIN SUCCESS]', user);
        this.snack.open(`Welcome ${user.fullName}`, 'OK', { duration: 2000 });

        if (user.role === 'ADMIN') this.router.navigateByUrl('/admin/dashboard');
        else if (user.role === 'STAFF') this.router.navigateByUrl('/staff/dashboard');
        else this.router.navigateByUrl('/customer/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.message ?? 'Login failed', 'OK', { duration: 3000 });
      }
    });
  }
}