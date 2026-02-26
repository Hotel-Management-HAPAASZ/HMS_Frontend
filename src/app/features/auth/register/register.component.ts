import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

/** Group-level validator to ensure two fields match */
function matchValidator(a: string, b: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const v1 = group.get(a)?.value;
    const v2 = group.get(b)?.value;
    if (!v1 || !v2) return null; // don't show mismatch until both have a value
    return v1 === v2 ? null : { mismatch: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="auth-bg d-flex align-items-center justify-content-center min-vh-100 px-3 py-4">
      <div class="container">
        <div class="row justify-content-center">

          <!-- Wider -->
          <div class="col-12 col-sm-11 col-md-9 col-lg-7 col-xl-6">

            <!-- Shorter card -->
            <div class="app-card register-card p-3 p-md-4">

              <!-- Header -->
              <div class="text-center mb-3">
                <div class="logo-badge mx-auto mb-2">H</div>
                <h3 class="fw-bold mb-1">Create account</h3>
                <p class="text-muted mb-0 small">Sign up to get started</p>
              </div>

              <!-- Form -->
              <form [formGroup]="form" (ngSubmit)="submit()">

                <!-- Full Name -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Full Name</label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="fullName"
                    placeholder="Your full name"
                  />
                  <div class="text-danger small mt-1"
                       *ngIf="form.controls.fullName.touched && form.controls.fullName.invalid">
                    Name required
                  </div>
                </div>

                <!-- Email -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="you@email.com"
                  />
                  <div class="text-danger small mt-1"
                       *ngIf="form.controls.email.touched && form.controls.email.invalid">
                    Valid email required
                  </div>
                </div>

                <!-- Phone -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Phone</label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="phone"
                    placeholder="10-digit phone"
                  />
                  <div class="text-danger small mt-1"
                       *ngIf="form.controls.phone.touched && form.controls.phone.invalid">
                    10-digit phone required
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
                  <div class="text-danger small mt-1"
                       *ngIf="form.controls.password.touched && form.controls.password.invalid">
                    Min 8 chars, include 1 uppercase, 1 number
                  </div>
                </div>

                <!-- Confirm Password -->
                <div class="mb-2">
                  <label class="form-label fw-semibold small">Confirm Password</label>
                  <input
                    type="password"
                    class="form-control"
                    formControlName="confirmPassword"
                    placeholder="********"
                  />
                  <div class="text-danger small mt-1"
                       *ngIf="form.errors?.['mismatch'] && (form.controls.confirmPassword.touched || form.controls.password.touched)">
                    Passwords do not match
                  </div>
                </div>

                <!-- Button -->
                <button type="submit"
                        class="btn btn-app w-100"
                        [disabled]="form.invalid || loading">
                  <span *ngIf="!loading">Create Account</span>
                  <span *ngIf="loading" class="d-inline-flex align-items-center gap-2">
                    <span class="spinner-border spinner-border-sm"></span>
                    Creating...
                  </span>
                </button>

                <!-- Login -->
                <div class="text-center mt-2">
                  <span class="text-muted small">Already have an account?</span>
                  <a routerLink="/auth/login"
                     class="small fw-semibold text-decoration-none ms-1">
                    Login
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

    .register-card {
      max-width: 560px;
      margin: 0 auto;
    }

    .register-card .form-control {
      padding: 10px 12px;
      font-size: 0.95rem;
    }
  `]
})
export class RegisterComponent {
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: matchValidator('password', 'confirmPassword') });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { fullName, email, password, phone } = this.form.value;

    this.auth.register(fullName!, email!, password!, phone!).subscribe({
      next: (user) => {
        this.loading = false;
        this.snack.open(`Account created for ${user.fullName}. Please login.`, 'OK', { duration: 2500 });
        this.router.navigateByUrl('/auth/login');
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.message ?? 'Registration failed', 'OK', { duration: 3000 });
      }
    });
  }
}