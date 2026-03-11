// src/app/features/customer/update-profile/update-profile.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { UserService, UpdateUserRequest } from '../../../core/services/user.service';
// ✅ Import the User type from models (or from the re-export in user.service if you prefer)
// import type { User } from '../../../core/services/user.service';
import type { User } from '../../../core/models/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-update-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="page-bg">
      <div class="container-fluid p-0">
        <div class="app-card p-3 p-md-4 profile-card">
          <div class="mb-3">
            <div class="kicker">Customer Portal</div>
            <h2 class="fw-bold mb-1 title">Update Profile</h2>
            <p class="text-muted mb-0">
              Keep your details updated for faster check-in and booking communication.
            </p>
          </div>

          <mat-divider class="my-3"></mat-divider>

          <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-3">

            <!-- CONTACT -->
            <div class="section-block">
              <div class="section-title">Contact Details</div>

              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Full Name</mat-label>
                    <input matInput formControlName="fullName" autocomplete="name" />
                    <mat-error *ngIf="hasError('fullName','pattern')">Only letters and spaces allowed</mat-error>
                  </mat-form-field>
                </div>

                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="email" autocomplete="email" />
                    <mat-error *ngIf="hasError('email','email')">Enter a valid email</mat-error>
                  </mat-form-field>
                </div>

                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Phone</mat-label>
                    <input matInput formControlName="phone" autocomplete="tel" inputmode="numeric" />
                    <mat-hint>Optional. Indian mobile number (e.g. 98XXXXXXXX)</mat-hint>
                    <mat-error *ngIf="hasError('phone','pattern')">Enter a valid Indian mobile number starting with 6, 7, 8 or 9</mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-end mt-2">
              <button mat-raised-button color="primary" class="btn-app" type="submit" [disabled]="form.invalid || loading">
                {{ loading ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-bg{
      padding: 0px;
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      border-radius: 18px;
    }
    .profile-card{
      border-radius: 18px;
      border: 1px solid var(--app-border);
      background: #fff;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
    }
    .kicker{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .title{ letter-spacing: -0.01em; }
    .section-block{ margin-top: 6px; }
    .section-title{
      display: block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
      margin: 10px 0 14px;
      padding-left: 2px;
    }
    .w-100{ width: 100%; }
    ::ng-deep .mat-mdc-form-field-hint-wrapper{ padding-top: 2px; }
  `]
})
export class UpdateProfileComponent {
  // Use functional inject to avoid DI token issues
  private auth = inject(AuthService);
  private users = inject(UserService);
  private snack = inject(MatSnackBar);
  private fb = inject(NonNullableFormBuilder);

  loading = false;

  form = this.fb.group({
    // Optional validators: allow empty values
    fullName: this.fb.control('', [Validators.pattern(/^$|^[a-zA-Z][a-zA-Z ]+$/)]),
    email: this.fb.control('', [Validators.email]),
    phone: this.fb.control('', [Validators.pattern(/^$|^[6-9]\d{9}$/)])
  });

  ngOnInit() {
    const u: any = this.auth.user?.();
    if (!u) return;

    // Fall back to stored session to pick up phone if signal doesn't have it yet
    let phone = u.phone ?? '';
    if (!phone) {
      try {
        const raw = localStorage.getItem('app_session_v1');
        if (raw) {
          const stored = JSON.parse(raw);
          phone = stored?.user?.phone ?? '';
        }
      } catch {}
    }

    this.form.patchValue({
      fullName: u.fullName ?? u.userName ?? '',
      email: u.email ?? '',
      phone
    });
  }

  hasError(ctrl: string, err: string) {
    const c = this.form.get(ctrl);
    return !!c && c.touched && c.hasError(err);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const sessionUser: any = this.auth.user?.();
    if (!sessionUser) {
      this.snack.open('No session user found. Please login again.', 'Dismiss', { duration: 3000 });
      return;
    }

    let userId = sessionUser.id;
    // Allow UUIDs (strings) for mock users or numeric strings for DB users
    if (!userId || userId === 'undefined' || userId === 'null') {
      this.snack.open(`Invalid user id: "${userId}". Cannot update profile.`, 'Dismiss', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();

    // Build payload with only present values (no undefined required)
    const payload: UpdateUserRequest = {};
    if (v.fullName) payload.userName = v.fullName;
    if (v.email) payload.email = v.email;
    if (v.phone) payload.phone = v.phone;
    // Add role if you allow role editing

    this.loading = true;
    this.users.updateProfile(userId, payload).subscribe({
      next: (updated: User) => {
        // Update session with backend response
        (this.auth as any)._user?.set?.(updated);
        try {
          localStorage.setItem('app_session_v1', JSON.stringify(updated));
        } catch {}

        this.snack.open('Profile updated successfully!', 'OK', { duration: 2000 });
        this.loading = false;
      },
      // ✅ Type the error to avoid TS7006
      error: (err: any) => {
        console.error('Update failed', err);
        const msg = err?.error?.message || err?.message || 'Failed to update profile';
        this.snack.open(msg, 'Dismiss', { duration: 3500 });
        this.loading = false;
      }
    });
  }
}

