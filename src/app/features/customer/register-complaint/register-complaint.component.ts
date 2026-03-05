import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroupDirective } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { NewComplaintService } from '../../../core/services/new-complaint.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';



@Component({
  standalone: true,
  selector: 'app-register-complaint',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,
    MatSelectModule, MatIconModule, MatDividerModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">
      <div class="app-card p-3 p-md-4 complaint-card">

        <!-- Header -->
        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
          <div>
            <div class="kicker">
              <span class="dot"></span>
              Customer Portal
            </div>
            <h2 class="fw-bold mb-1 title">Register Complaint</h2>
            <p class="text-muted mb-0 small">
              Please provide accurate details so our team can resolve this quickly.
            </p>
          </div>

          <div class="badge-pill">
            <mat-icon class="badge-ico" fontIcon="support_agent"></mat-icon>
            <span class="text-muted small">Avg response:</span>
            <span class="small fw-semibold">24–48 hrs</span>
          </div>
        </div>

        <mat-divider class="mb-3"></mat-divider>

        <!-- NEW: Success banner with Complaint ID -->
        <div *ngIf="createdReference" class="success-banner mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <mat-icon>confirmation_number</mat-icon>
              <div>
                <div class="fw-semibold">Complaint created successfully</div>
                <div class="small text-muted">Ref: <code>{{ createdReference }}</code></div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button mat-stroked-button (click)="copyId()">Copy ID</button>
              <!-- <button mat-stroked-button color="primary" (click)="goToTrack()">Track</button> -->
            </div>
          </div>
        </div>
        <!-- /success banner -->

        <form [formGroup]="form" (ngSubmit)="submit(formDirective)" #formDirective="ngForm" class="grid gap-3">

          <!-- Row 1 -->
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Category</mat-label>
                <mat-select formControlName="category" required>
                  <mat-option *ngFor="let c of categories" [value]="c.value">{{ c.label }}</mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.category.touched && form.controls.category.invalid">
                  Category is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Priority</mat-label>
                <mat-select formControlName="priority" required>
                  <mat-option *ngFor="let p of priorities" [value]="p">{{ p }}</mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.priority.touched && form.controls.priority.invalid">
                  Priority is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Row 2 -->
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Contact Preference</mat-label>
                <mat-select formControlName="contactPreference" required>
                  <mat-option value="EMAIL">Email</mat-option>
                  <mat-option value="CALL">Call</mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.contactPreference.touched && form.controls.contactPreference.invalid">
                  Please choose a contact preference
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Booking ID</mat-label>
                <input matInput formControlName="bookingId" placeholder="e.g. 1024">
                <mat-error *ngIf="form.controls.bookingId.touched && form.controls.bookingId.hasError('required')">
                  Booking ID is required
                </mat-error>
                <mat-error *ngIf="form.controls.bookingId.touched && form.controls.bookingId.hasError('pattern')">
                  Booking ID must be a number
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Title</mat-label>
                <input matInput formControlName="title" minlength="10" maxlength="100" placeholder="Short summary">
                <mat-hint align="end">{{ form.controls.title.value?.length || 0 }}/100</mat-hint>
                <mat-error *ngIf="form.controls.title.touched && form.controls.title.hasError('required')">
                  Title is required
                </mat-error>
                <mat-error *ngIf="form.controls.title.touched && form.controls.title.hasError('minlength')">
                  Title must be at least 10 characters
                </mat-error>
              </mat-form-field>
            </div>
          </div>


          <!-- Description -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Description</mat-label>
            <textarea matInput rows="5" formControlName="description"
              placeholder="Explain what happened, when, and any relevant details..."
              minlength="20" maxlength="500"></textarea>
            <mat-hint align="end">{{ form.controls.description.value?.length || 0 }}/500</mat-hint>
            <mat-error *ngIf="form.controls.description.touched && form.controls.description.hasError('required')">
              Description is required
            </mat-error>
            <mat-error *ngIf="form.controls.description.touched && form.controls.description.hasError('minlength')">
              Please enter at least 20 characters
            </mat-error>
            <!-- Show backend validation errors here if mapped -->
            <mat-error *ngIf="serverErrors['description']">{{ serverErrors['description'] }}</mat-error>
          </mat-form-field>

          <!-- Actions -->
          <div class="d-flex flex-column flex-sm-row gap-2 justify-content-end mt-1">
            <button type="button" mat-stroked-button class="btn-soft" (click)="reset(formDirective)">
              Cancel
            </button>

            <button type="submit" mat-raised-button color="primary" class="btn-app" [disabled]="form.invalid || submitting">
              <mat-icon class="me-1" fontIcon="send"></mat-icon>
              {{ submitting ? 'Submitting...' : 'Submit Complaint' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .dash-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding: 0px;
      border-radius: 18px;
    }
    .complaint-card{
      border-radius: 18px;
      border: 1px solid var(--app-border);
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      background: #fff;
      max-width: 1100px;
      margin: 0 auto;
    }
    .kicker{
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
      color: rgba(15,23,42,0.55); margin-bottom: 6px;
    }
    .dot{ width: 8px; height: 8px; border-radius: 999px; background: var(--app-secondary); box-shadow: 0 0 0 4px rgba(6,182,212,0.12); }
    .title{ letter-spacing: -0.01em; }
    .badge-pill{
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08); background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-ico{ color: var(--app-primary); font-size: 18px; width: 18px; height: 18px; }
    .btn-soft{ border-radius: 12px; }
    .w-100{ width: 100%; }

    /* NEW */
    .success-banner{
      border: 1px solid rgba(34,197,94,0.25);
      background: rgba(34,197,94,0.08);
      border-radius: 12px;
      padding: 10px 12px;
    }
  `]
})
export class RegisterComplaintComponent {
  submitting = false;

  // NEW: show ID banner
  // NEW: show ref banner
  createdReference: string | null = null;
  serverErrors: Record<string, string> = {};

  categories = [
    { label: 'Housekeeping', value: 'ROOM_ISSUE' },
    { label: 'Maintenance', value: 'ROOM_ISSUE' },
    { label: 'Billing', value: 'BILLING_ISSUE' },
    { label: 'Food & Beverage', value: 'SERVICE_ISSUE' },
    { label: 'Reservation', value: 'SERVICE_ISSUE' },
    { label: 'Other', value: 'OTHER' }
  ] as const;
  priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];



  form = this.fb.group({
    category: ['', Validators.required],
    priority: ['', Validators.required],
    contactPreference: ['EMAIL', Validators.required],

    bookingId: [null as unknown as number], // Now nullable, don't strictly require

    title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]]
  });

   constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private complaints: NewComplaintService,
    private snack: MatSnackBar
  ) {}

  reset(formDirective?: FormGroupDirective) {
    if (formDirective) {
      formDirective.resetForm();
    }
    this.form.reset({
      category: '',
      priority: '',
      contactPreference: 'EMAIL',
      bookingId: null as unknown as number,
      title: '',
      description: ''
    });
  }

  // NEW: copy to clipboard
  copyId() {
    if (!this.createdReference) return;
    navigator.clipboard?.writeText(this.createdReference).then(() => {
      this.snack.open('Complaint ID copied', 'OK', { duration: 2000 });
    }).catch(() => {});
  }

  // NEW: navigate to Track (adjust route if different)
  goToTrack() {
    // If you have a router injected, navigate:
    // this.router.navigate(['/customer/track']);
    // For now, just hint:
    this.snack.open('Go to Track page from sidebar to view status', 'OK', { duration: 2500 });
  }

  async submit(formDirective: FormGroupDirective) {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }

    const u = this.auth.user();
    if (!u) {
      this.snack.open('Please login again to submit a complaint.', 'OK', { duration: 2500 });
      return;
    }

    this.submitting = true;

    const v = this.form.value;

    try {
      const created = await this.complaints.create(
        Number(u.id),
        {
          category: v.category as 'ROOM_ISSUE' | 'SERVICE_ISSUE' | 'BILLING_ISSUE' | 'OTHER',
          priority: v.priority as any,
          bookingId: v.bookingId ? Number(v.bookingId) : undefined,
          contactPreference: v.contactPreference as 'CALL' | 'EMAIL',
          title: v.title!,
          description: v.description!
        }
      );

      // NEW: show clear, copyable ID
      this.createdReference = created.referenceNumber;
      const ref = this.snack.open(`Complaint created • ID: ${created.referenceNumber}`, 'Copy ID', { duration: 6000 });
      ref.onAction().subscribe(() => this.copyId());

      this.reset(formDirective);

      // Keep the banner for a while
      setTimeout(() => { this.createdReference = null; }, 120000); // auto-hide after 2 mins

    } catch (err: any) {
      if (err.status === 400 && err.error && typeof err.error === 'object') {
         this.serverErrors = err.error; // Display inline
         this.snack.open('Please fix the errors in the form.', 'OK', { duration: 3000 });
      } else {
         const msg = err?.error?.message || err?.message || 'Failed to create complaint';
         this.snack.open(msg, 'OK', { duration: 3000 });
      }
    } finally {
      this.submitting = false;
    }
  }
}