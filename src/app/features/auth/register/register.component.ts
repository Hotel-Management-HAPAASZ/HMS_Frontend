import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


// Group-level validator to ensure two controls match
function matchValidator(a: string, b: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const v1 = group.get(a)?.value;
    const v2 = group.get(b)?.value;
    if (v1 == null || v2 == null) return null;
    return v1 === v2 ? null : { mismatch: true };
  };
}

// Indian mobile: 10 digits, starts with 6–9
const IN_INDIAN_MOBILE = /^[6-9]\d{9}$/;

// 🔸 UPDATED: Password rules now include at least 1 special character
// Allows common ASCII punctuation as special characters
const PWD_RULE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{}|;:'",.<>/?`~]).{8,}$/;

type RegisterControlName = 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="auth-wrapper">

      <!-- Background layer -->
      <div class="auth-bg-media">
        <div class="bg-overlay"></div>
        <div class="bg-gradient"></div>
        <div class="blob b1"></div>
        <div class="blob b2"></div>
      </div>

      <div class="container py-4 py-md-5">
        <div class="row justify-content-center">
          <div class="col-12 col-xl-10">

            <div class="auth-grid app-card overflow-hidden">
              <!-- LEFT: Benefits / brand -->
              <aside class="promo-pane">
                <div class="promo-content">
                  <div class="brand">
                    <div class="brand-badge">H</div>
                    <div class="brand-text">
                      <h4 class="mb-1">Hotel Booking</h4>
                     <p class="promo-sub small m-0">Smarter stays. Better savings.</p>
                    </div>
                  </div>

                  <h3 class="promo-title">Unlock member <span>benefits</span></h3>
                  <ul class="benefits">
                    <li>
                      <div class="ic">%</div>
                      <div>
                        <div class="b-h">Flat 25% off*</div>
                        <div class="b-s">on your first booking</div>
                      </div>
                    </li>
                    <li>
                      <div class="ic">₹</div>
                      <div>
                        <div class="b-h">goCash / Rewards</div>
                        <div class="b-s">Earn on every trip & redeem instantly</div>
                      </div>
                    </li>
                    <li>
                      <div class="ic">★</div>
                      <div>
                        <div class="b-h">Loyalty perks</div>
                        <div class="b-s">Free selection & exclusive deals</div>
                      </div>
                    </li>
                    <li>
                      <div class="ic">⚡</div>
                      <div>
                        <div class="b-h">Quick checkout</div>
                        <div class="b-s">Save guests & cards securely</div>
                      </div>
                    </li>
                  </ul>

                  <div class="promo-image">
                    <img src="https://tse1.mm.bing.net/th/id/OIP.F6bBcKxqf-ZrRipTbK37qAHaE8?rs=1&pid=ImgDetMain&o=7&rm=3" alt="Stay in style" />
                  </div>
                </div>
              </aside>

              <!-- RIGHT: Form -->
              <section class="form-pane">
                <div class="form-header text-center mb-3">
                  <div class="logo-badge mx-auto mb-2">H</div>
                  <h3 class="fw-bold mb-1">Create account</h3>
                  <p class="text-muted mb-0 small">Sign up to get started</p>
                </div>

                <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

                  <div class="row">
                    <!-- Full name -->
                    <div class="col-12 mb-2">
                      <label class="form-label fw-semibold small">Full Name</label>
                      <input
                        type="text"
                        class="form-control"
                        formControlName="fullName"
                        placeholder="Your full name"
                        [class.is-invalid]="isInvalid('fullName')"
                      />
                      <div class="text-danger small mt-1" *ngIf="isInvalid('fullName')">
                        Full name is required.
                      </div>
                    </div>

                    <!-- Email -->
                    <div class="col-12 mb-2">
                      <label class="form-label fw-semibold small">Email</label>
                      <input
                        type="email"
                        class="form-control"
                        formControlName="email"
                        placeholder="you@email.com"
                        [class.is-invalid]="isInvalid('email')"
                        autocomplete="email"
                      />
                      <div class="text-danger small mt-1" *ngIf="isInvalid('email')">
                        Please enter a valid email address.
                      </div>
                    </div>

                    <!-- Phone -->
                    <div class="col-12 mb-2">
                      <label class="form-label fw-semibold small">Phone</label>
                      <div class="input-group">
                        <span class="input-group-text country-chip">🇮🇳 +91</span>
                        <input
                          type="text"
                          class="form-control"
                          formControlName="phone"
                          placeholder="10-digit mobile"
                          inputmode="numeric"
                          maxlength="10"
                          [class.is-invalid]="isInvalid('phone')"
                          autocomplete="tel-national"
                        />
                      </div>
                      <div class="text-danger small mt-1" *ngIf="isInvalid('phone')">
                        Enter a valid mobile number (10 digits, starting with 6–9).
                      </div>
                    </div>

                    <!-- Password -->
                    <div class="col-12 mb-2">
                      <label class="form-label fw-semibold small">Password</label>
                      <input
                        type="password"
                        class="form-control"
                        formControlName="password"
                        placeholder="********"
                        [class.is-invalid]="isInvalid('password')"
                        autocomplete="new-password"
                      />
                      <!-- Live rule checklist -->
                      <ul class="pwd-rules small mt-2">
                        <li [class.ok]="pwdMinLen()" [class.bad]="!pwdMinLen()">
                          <span class="dot"></span> At least <b>8</b> characters
                        </li>
                        <li [class.ok]="pwdHasUpper()" [class.bad]="!pwdHasUpper()">
                          <span class="dot"></span> At least <b>1 uppercase</b> letter (A–Z)
                        </li>
                        <li [class.ok]="pwdHasNumber()" [class.bad]="!pwdHasNumber()">
                          <span class="dot"></span> At least <b>1 number</b> (0–9)
                        </li>
                        <!-- 🔹 ADDED: special character rule -->
                        <li [class.ok]="pwdHasSpecial()" [class.bad]="!pwdHasSpecial()">
                          <span class="dot"></span> At least <b>1 special</b> character (!&#64;#$…)
                        </li>
                      </ul>
                    </div>

                    <!-- Confirm password -->
                    <div class="col-12 mb-2">
                      <label class="form-label fw-semibold small">Confirm Password</label>
                      <input
                        type="password"
                        class="form-control"
                        formControlName="confirmPassword"
                        placeholder="********"
                        [class.is-invalid]="isInvalid('confirmPassword') || form.errors?.['mismatch']"
                        autocomplete="new-password"
                      />
                      <div
                        class="text-danger small mt-1"
                        *ngIf="form.errors?.['mismatch'] && (form.controls.confirmPassword.touched || form.controls.password.touched)"
                      >
                        Passwords do not match.
                      </div>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-app w-100 mt-2" [disabled]="form.invalid || loading">
                    <span *ngIf="!loading">Create Account</span>
                    <span *ngIf="loading" class="d-inline-flex align-items-center gap-2">
                      <span class="spinner-border spinner-border-sm"></span>
                      Creating...
                    </span>
                  </button>

                  <!-- Divider -->
                  <div class="divider my-3">
                    <span>or</span>
                  </div>

                  <div class="text-center mt-3">
                    <span class="text-muted small">Already have an account?</span>
                    <a routerLink="/auth/login" class="small fw-semibold text-decoration-none ms-1">Login</a>
                  </div>
                </form>

                <div class="text-center mt-3 small text-muted">
                  © 2026 Hotel Booking System
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* --- Layout shell --- */
    .auth-wrapper {
      position: relative;
      min-height: 100vh;
      display: grid;
      align-items: center;
      overflow: hidden;
      background: var(--app-bg);
    }

    /* --- Background layers --- */
    .auth-bg-media { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
    .auth-bg-media .bg-overlay {
      position: absolute; inset: 0;
      background: rgba(2, 8, 23, 0.25);
      backdrop-filter: blur(2px);
    }
    .auth-bg-media .bg-gradient {
      position: absolute; inset: 0;
      background:
        radial-gradient(650px 300px at 15% 20%, rgba(79, 70, 229, 0.30), transparent 60%),
        radial-gradient(700px 320px at 85% 25%, rgba(6, 182, 212, 0.28), transparent 60%),
        radial-gradient(600px 520px at 50% 85%, rgba(34, 197, 94, 0.18), transparent 60%);
      mix-blend-mode: screen;
    }
    .blob { position: absolute; border-radius: 50%; filter: blur(45px); opacity: 0.45; animation: float 14s ease-in-out infinite; }
    .blob.b1 { width: 420px; height: 420px; background: #8b5cf680; left: -120px; top: 20%; }
    .blob.b2 { width: 360px; height: 360px; background: #06b6d470; right: -100px; bottom: 10%; animation-delay: 3s; }
    @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }

    /* --- Card grid --- */
    .auth-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      min-height: 560px;
      border-radius: 20px;
      overflow: hidden;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(12px);
    }

    /* LEFT pane (promo) */
    .promo-pane {
      background-image: url("https://img.freepik.com/premium-photo/black-white-themed-hotel-room-bedroom-interior-hotel-concept_176841-35016.jpg");
      background-size: cover;
      background-position: center;
      min-height: 100%;
      color: #fff;
      position: relative;
    }
    .promo-content { color: #fff; padding: 28px; height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 18px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-badge {
      width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
      font-weight: 800; color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 8px 22px rgba(79, 70, 229, 0.35);
    }
    .promo-title { margin: 4px 0 6px; font-weight: 700; }
    .promo-title span {
      background: linear-gradient(135deg, #a5b4fc, #67e8f9);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .benefits { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 14px; }
    .benefits li {
      display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: center;
      padding: 10px 12px; border-radius: 12px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    }
    .promo-sub {
  color: #b3f0ff !important;  /* attractive soft cyan */
  font-weight: 500;
}
    .benefits .ic {
      width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #06b6d4); box-shadow: 0 10px 24px rgba(2,8,23,0.25);
    }
    .b-h { font-weight: 600; }
    .b-s { font-size: 12px; opacity: 0.85; }
    .promo-image { align-self: end; overflow: hidden; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); }
    .promo-image img { width: 100%; display: block; object-fit: cover; height: 160px; transform: scale(1.02); }

    /* RIGHT pane (form) */
    .form-pane { background: var(--app-card); padding: 26px 24px; display: flex; flex-direction: column; justify-content: flex-start; }
    .logo-badge {
      width: 50px; height: 50px; border-radius: 16px; display: grid; place-items: center;
      font-size: 18px; font-weight: 800; color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
    }

    /* Inputs */
    .form-control {
      padding: 10px 12px;
      font-size: 0.95rem;
      border-radius: 10px;
      border: 1px solid var(--app-border);
      background: #fff;
      transition: box-shadow .2s ease, border-color .2s ease, transform .04s ease;
    }
    .form-control:focus {
      border-color: rgba(79, 70, 229, 0.55);
      box-shadow: 0 0 0 0.25rem rgba(79, 70, 229, 0.12);
    }
    .form-control.is-invalid {
      border-color: rgba(239,68,68,0.6);
      box-shadow: 0 0 0 0.25rem rgba(239,68,68,0.12);
    }

    .input-group .country-chip {
      background: linear-gradient(135deg, #eef2ff, #ecfeff);
      border: 1px solid var(--app-border);
      border-right: none;
      font-weight: 600;
    }

    /* Password rules checklist */
    .pwd-rules { list-style: none; margin: 0; padding-left: 0; display: grid; gap: 6px; }
    .pwd-rules li { display: flex; align-items: center; gap: 8px; color: rgba(15,23,42,0.7); }
    .pwd-rules .dot {
      width: 8px; height: 8px; border-radius: 999px; display: inline-block;
      background: rgba(15,23,42,0.25);
      box-shadow: 0 0 0 4px rgba(15,23,42,0.08);
    }
    .pwd-rules li.ok { color: rgba(15,23,42,0.95); }
    .pwd-rules li.ok .dot { background: var(--app-success); box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }
    .pwd-rules li.bad { color: rgba(15,23,42,0.55); }

    /* Divider */
    .divider { position: relative; text-align: center; }
    .divider::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--app-border); }
    .divider span { position: relative; background: var(--app-card); padding: 0 10px; font-size: 12px; color: #6b7280; }

    /* Primary CTA override */
    .btn-app { border-radius: 12px; box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25); }

    /* Responsive */
    @media (max-width: 992px) {
      .auth-grid { grid-template-columns: 1fr; }
      .promo-image img { height: 140px; }
    }
    @media (max-width: 576px) {
      .form-pane { padding: 20px 16px; }
      .promo-content { padding: 22px; }
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
    // Indian mobile: 10 digits, starts with 6–9
    phone: ['', [Validators.required, Validators.pattern(IN_INDIAN_MOBILE)]],
    password: ['', [Validators.required, Validators.pattern(PWD_RULE)]], // 🔸 UPDATED pattern
    confirmPassword: ['', [Validators.required]]
  }, { validators: matchValidator('password', 'confirmPassword') });

  // --- UI helpers ---
  isInvalid(ctrl: RegisterControlName) {
    const c = this.form.controls[ctrl];
    return !!(c && c.touched && c.invalid);
  }

  private pwdVal(): string {
    return this.form.controls.password.value ?? '';
  }
  pwdMinLen()   { return this.pwdVal().length >= 8; }
  pwdHasUpper() { return /[A-Z]/.test(this.pwdVal()); }
  pwdHasNumber(){ return /\d/.test(this.pwdVal()); }
  // 🔹 ADDED: special char detector to drive the checklist
  pwdHasSpecial(){ return /[!@#$%^&*()_\-+=[\]{}|;:'",.<>/?`~]/.test(this.pwdVal()); }

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
