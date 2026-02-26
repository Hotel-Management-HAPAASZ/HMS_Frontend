import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { NewComplaintService } from '../../../core/services/new-complaint.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { Subscription } from 'rxjs';

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
        <div *ngIf="createdId" class="success-banner mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <mat-icon>confirmation_number</mat-icon>
              <div>
                <div class="fw-semibold">Complaint created successfully</div>
                <div class="small text-muted">ID: <code>{{ createdId }}</code></div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button mat-stroked-button (click)="copyId()">Copy ID</button>
              <!-- <button mat-stroked-button color="primary" (click)="goToTrack()">Track</button> -->
            </div>
          </div>
        </div>
        <!-- /success banner -->

        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-3">

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
                <mat-label>Preferred Contact Method</mat-label>
                <mat-select formControlName="contactMethod" required>
                  <mat-option value="Email">Email</mat-option>
                  <mat-option value="Phone">Phone</mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.contactMethod.touched && form.controls.contactMethod.invalid">
                  Please choose a contact method
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <!-- Conditionally required -->
              <mat-form-field appearance="outline" class="w-100" *ngIf="form.value.contactMethod === 'Email'">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" placeholder="name@example.com">
                <mat-error *ngIf="form.controls.email.touched && form.controls.email.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="form.controls.email.touched && form.controls.email.hasError('email')">
                  Enter a valid email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-100" *ngIf="form.value.contactMethod === 'Phone'">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" placeholder="10-digit number">
                <mat-error *ngIf="form.controls.phone.touched && form.controls.phone.hasError('required')">
                  Phone is required
                </mat-error>
                <mat-error *ngIf="form.controls.phone.touched && form.controls.phone.hasError('pattern')">
                  Enter a valid phone number (10 digits)
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Booking ID + Subject -->
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
                <mat-label>Subject</mat-label>
                <input matInput formControlName="subject" maxlength="80" placeholder="Short summary">
                <mat-hint align="end">{{ form.controls.subject.value?.length || 0 }}/80</mat-hint>
                <mat-error *ngIf="form.controls.subject.touched && form.controls.subject.hasError('required')">
                  Subject is required
                </mat-error>
                <mat-error *ngIf="form.controls.subject.touched && form.controls.subject.hasError('minlength')">
                  Subject must be at least 5 characters
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Description -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Description</mat-label>
            <textarea matInput rows="5" formControlName="message"
              placeholder="Explain what happened, when, and any relevant details..."
              maxlength="1000"></textarea>
            <mat-hint align="end">{{ form.controls.message.value?.length || 0 }}/1000</mat-hint>
            <mat-error *ngIf="form.controls.message.touched && form.controls.message.hasError('required')">
              Description is required
            </mat-error>
            <mat-error *ngIf="form.controls.message.touched && form.controls.message.hasError('minlength')">
              Please enter at least 20 characters
            </mat-error>
          </mat-form-field>

          <!-- Actions -->
          <div class="d-flex flex-column flex-sm-row gap-2 justify-content-end mt-1">
            <button type="button" mat-stroked-button class="btn-soft" (click)="reset()">
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
export class RegisterComplaintComponent implements OnDestroy {
  submitting = false;

  // NEW: show ID banner
  createdId: string | null = null;

  categories = [
    { label: 'Housekeeping', value: 'ROOM_ISSUE' },
    { label: 'Maintenance', value: 'ROOM_ISSUE' },
    { label: 'Billing', value: 'BILLING_ISSUE' },
    { label: 'Food & Beverage', value: 'SERVICE_ISSUE' },
    { label: 'Reservation', value: 'SERVICE_ISSUE' },
    { label: 'Other', value: 'OTHER' }
  ] as const;
  priorities = ['Low', 'Medium', 'High', 'Urgent'];

  private sub?: Subscription;

  form = this.fb.group({
    category: ['', Validators.required],
    priority: ['', Validators.required],
    contactMethod: ['Email', Validators.required],

    email: ['', [Validators.email]],
    phone: [''],

    bookingId: [null as unknown as number, [Validators.required, Validators.pattern(/^\d+$/)]],

    subject: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(80)]],
    message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private complaints: NewComplaintService,
    private snack: MatSnackBar
  ) {
    this.applyContactValidators(this.form.value.contactMethod || 'Email');
    this.sub = this.form.controls.contactMethod.valueChanges.subscribe(method => {
      this.applyContactValidators(method || 'Email');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private applyContactValidators(method: 'Email' | 'Phone' | string) {
    const emailCtrl = this.form.controls.email;
    const phoneCtrl = this.form.controls.phone;

    if (method === 'Phone') {
      phoneCtrl.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
      emailCtrl.setValidators([Validators.email]);
      emailCtrl.setValue(emailCtrl.value || '');
      emailCtrl.updateValueAndValidity({ emitEvent: false });
    } else {
      emailCtrl.setValidators([Validators.required, Validators.email]);
      phoneCtrl.setValidators([]);
      phoneCtrl.setValue(phoneCtrl.value || '');
      phoneCtrl.updateValueAndValidity({ emitEvent: false });
    }

    emailCtrl.updateValueAndValidity({ emitEvent: false });
    phoneCtrl.updateValueAndValidity({ emitEvent: false });
  }

  reset() {
    this.form.reset({
      category: '',
      priority: '',
      contactMethod: 'Email',
      email: '',
      phone: '',
      bookingId: null,
      subject: '',
      message: ''
    });
    this.applyContactValidators('Email');
  }

  // NEW: copy to clipboard
  copyId() {
    if (!this.createdId) return;
    navigator.clipboard?.writeText(this.createdId).then(() => {
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

  async submit() {
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

    // Build subject and message with meta-info
    const subject = `[${v.category} | ${v.priority}] ${v.subject}`;
    const meta =
`Category: ${v.category}
Priority: ${v.priority}
Contact Method: ${v.contactMethod}
Email: ${v.email || '—'}
Phone: ${v.phone || '—'}
Booking ID: ${v.bookingId}

--- Details ---
`;

    try {
      // If you want to store only the message (no meta), replace (meta + v.message) with just v.message
      const created = await this.complaints.create(
        Number(u.id),
        subject,
        meta + v.message,
        {
          category: v.category!,
          priority: v.priority! as any,
          bookingId: Number(v.bookingId),
          contactMethod: v.contactMethod as 'Email' | 'Phone',
          email: v.contactMethod === 'Email' ? v.email || '' : undefined,
          phone: v.contactMethod === 'Phone' ? v.phone || '' : undefined
        }
      );

      // NEW: show clear, copyable ID
      this.createdId = created.id;
      const ref = this.snack.open(`Complaint created • ID: ${created.id}`, 'Copy ID', { duration: 6000 });
      ref.onAction().subscribe(() => this.copyId());

      this.reset();

      // Keep the banner for a while
      setTimeout(() => { this.createdId = null; }, 120000); // auto-hide after 2 mins

    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Failed to create complaint';
      this.snack.open(msg, 'OK', { duration: 3000 });
    } finally {
      this.submitting = false;
    }
  }
}