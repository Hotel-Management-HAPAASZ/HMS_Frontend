// src/app/features/auth/forgot-password.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="auth-bg d-flex align-items-center justify-content-center min-vh-100 px-3 py-4">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-12 col-sm-11 col-md-9 col-lg-7 col-xl-6">
            <div class="app-card login-card p-3 p-md-4">
              <div class="text-center mb-3">
                <div class="logo-badge mx-auto mb-2">H</div>
                <h3 class="fw-bold mb-1">Forgot Password</h3>
                <p class="text-muted mb-0 small">Enter your account email to receive the OTP</p>
              </div>

              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Email</label>
                  <input type="email" class="form-control" placeholder="you@email.com" formControlName="email" />
                  <div class="text-danger small mt-1" *ngIf="form.controls.email.touched && form.controls.email.invalid">
                    Valid email required
                  </div>
                </div>

                <button class="btn btn-app w-100" type="submit" [disabled]="form.invalid || loading">
                  <span *ngIf="!loading">Send OTP</span>
                  <span *ngIf="loading" class="d-inline-flex align-items-center gap-2">
                    <span class="spinner-border spinner-border-sm"></span>
                    Sending...
                  </span>
                </button>

                <div class="text-center mt-2">
                  <a routerLink="/auth/login" class="small text-decoration-none">Back to login</a>
                </div>
              </form>
            </div>

            <div class="text-center mt-3 small text-muted">© 2026 Hotel Booking System</div>
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
      width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center;
      font-size: 20px; font-weight: 800; color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
    }
    .login-card { max-width: 560px; margin: 0 auto; }
    .login-card .form-control { padding: 10px 12px; font-size: 0.95rem; }
  `]
})
export class ForgotPasswordComponent {
  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

 submit() {
  if (this.form.invalid) { this.form.markAllAsTouched(); return; }
  this.loading = true;
  const email = this.form.value.email!;

  this.auth.forgotPassword(email).subscribe({
    next: () => {
      this.loading = false;
      this.router.navigate(['/auth/verify-otp'], { queryParams: { email } })
        .then(() => {
          this.snack.open('If the email exists, an OTP has been sent.', 'OK', { duration: 2500 });
        });
    },
    error: (err) => {
      this.loading = false;
      this.snack.open(err?.message ?? 'Failed to start reset', 'OK', { duration: 3000 });
    }
  });
}
}