import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroupDirective } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../../core/services/auth.service';
import { NewComplaintService } from '../../../core/services/new-complaint.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

interface ActiveBooking {
  bookingId: number;
  roomTypes: string[];
  roomNumbers: string[];
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  bookingStatus: string;
}

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

        <!-- NO ACTIVE BOOKING — Block complaint form -->
        <div *ngIf="!loadingBookings() && activeBookings().length === 0 && !createdReference" class="no-booking-card">
          <div class="d-flex align-items-start gap-3">
            <div class="no-booking-ico">🏨</div>
            <div>
              <h5 class="fw-bold mb-1">No active stay found</h5>
              <p class="text-muted mb-2">
                You can only raise complaints during your stay at the hotel — after check-in and before check-out.
              </p>
              <div class="hint-list">
                <div class="hint-item">
                  <mat-icon class="hint-icon">info_outline</mat-icon>
                  <span>Make sure you have checked in at the reception</span>
                </div>
                <div class="hint-item">
                  <mat-icon class="hint-icon">calendar_today</mat-icon>
                  <span>Your booking must be for today's date</span>
                </div>
                <div class="hint-item">
                  <mat-icon class="hint-icon">refresh</mat-icon>
                  <span>If you just checked in, try refreshing the page</span>
                </div>
              </div>
              <button mat-stroked-button class="mt-2" (click)="loadActiveBookings()">
                <mat-icon class="me-1" style="font-size:16px;width:16px;height:16px;">refresh</mat-icon>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loadingBookings()" class="text-center py-4 text-muted">
          Loading your active bookings...
        </div>

        <!-- Success banner -->
        <div *ngIf="createdReference" class="success-banner mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <mat-icon class="text-success">check_circle</mat-icon>
              <div>
                <div class="fw-semibold">Complaint registered successfully!</div>
                <div class="small text-muted">Reference: <code>{{ createdReference }}</code></div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button mat-stroked-button (click)="copyId()">
                <mat-icon style="font-size:14px;width:14px;height:14px;" class="me-1">content_copy</mat-icon>
                Copy ID
              </button>
            </div>
          </div>
        </div>

        <!-- FORM (only shown when active bookings exist) -->
        <form *ngIf="activeBookings().length > 0"
              [formGroup]="form" (ngSubmit)="submit(formDirective)" #formDirective="ngForm" class="grid gap-3">

          <!-- Active Booking Selector (replaces raw booking ID) -->
          <div class="active-booking-info mb-2">
            <div class="d-flex align-items-center gap-2 mb-2">
              <mat-icon class="text-success" style="font-size:18px;width:18px;height:18px;">check_circle</mat-icon>
              <span class="fw-bold small">Active Stay Detected</span>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-12">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Select Booking</mat-label>
                <mat-select formControlName="bookingId" required>
                  <mat-option *ngFor="let b of activeBookings()" [value]="b.bookingId">
                    Room {{ b.roomNumbers?.join(', ') || '—' }}
                    ({{ b.roomTypes?.join(', ') || 'Room' }})
                    · {{ b.checkIn | date:'d MMM' }} – {{ b.checkOut | date:'d MMM' }}
                    · Booking #{{ b.bookingId }}
                  </mat-option>
                </mat-select>
                <mat-error>Please select the booking related to your complaint</mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Category & Priority -->
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
                  <mat-option *ngFor="let p of priorities" [value]="p.value">
                    {{ p.label }}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.priority.touched && form.controls.priority.invalid">
                  Priority is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Contact & Title -->
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Contact Preference</mat-label>
                <mat-select formControlName="contactPreference" required>
                  <mat-option value="EMAIL">📧 Email</mat-option>
                  <mat-option value="CALL">📞 Phone Call</mat-option>
                </mat-select>
                <mat-error *ngIf="form.controls.contactPreference.touched && form.controls.contactPreference.invalid">
                  Please choose a contact preference
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Title</mat-label>
                <input matInput formControlName="title" minlength="10" maxlength="100" placeholder="Short summary of the issue">
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

    /* No booking card */
    .no-booking-card{
      border: 1px dashed rgba(245,158,11,0.35);
      background: rgba(245,158,11,0.04);
      border-radius: 16px;
      padding: 20px;
    }
    .no-booking-ico{
      width: 52px; height: 52px; border-radius: 14px;
      display: grid; place-items: center; font-size: 26px;
      background: rgba(245,158,11,0.10);
      border: 1px solid rgba(245,158,11,0.20);
      flex: 0 0 52px;
    }
    .hint-list{ display: flex; flex-direction: column; gap: 6px; }
    .hint-item{
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: rgba(15,23,42,0.65);
    }
    .hint-icon{ font-size: 16px !important; width: 16px !important; height: 16px !important; color: rgba(79,70,229,0.7); }

    /* Active booking info */
    .active-booking-info{
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(34,197,94,0.20);
      background: rgba(34,197,94,0.05);
    }

    /* Success */
    .success-banner{
      border: 1px solid rgba(34,197,94,0.25);
      background: rgba(34,197,94,0.08);
      border-radius: 12px;
      padding: 12px 14px;
    }
  `]
})
export class RegisterComplaintComponent implements OnInit {
  submitting = false;
  createdReference: string | null = null;

  // Active bookings from backend
  activeBookings = signal<ActiveBooking[]>([]);
  loadingBookings = signal(false);

  // Fixed categories — each maps to a UNIQUE backend enum value
  categories = [
    { label: '🛏️ Room Issue (Housekeeping / Maintenance)', value: 'ROOM_ISSUE' },
    { label: '🍽️ Service Issue (Food / Reservation)', value: 'SERVICE_ISSUE' },
    { label: '💳 Billing Issue', value: 'BILLING_ISSUE' },
    { label: '📋 Other', value: 'OTHER' }
  ] as const;

  // Priorities with friendly labels
  priorities = [
    { label: '🟢 Low — Minor inconvenience', value: 'LOW' },
    { label: '🟡 Medium — Affects comfort', value: 'MEDIUM' },
    { label: '🟠 High — Urgent attention needed', value: 'HIGH' },
    { label: '🔴 Urgent — Immediate action required', value: 'URGENT' }
  ] as const;

  form = this.fb.group({
    bookingId: [null as number | null, Validators.required],
    category: ['', Validators.required],
    priority: ['', Validators.required],
    contactPreference: ['EMAIL', Validators.required],
    title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private complaints: NewComplaintService,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadActiveBookings();
  }

  loadActiveBookings() {
    const u = this.auth.user();
    if (!u) return;

    this.loadingBookings.set(true);
    this.http.get<ActiveBooking[]>(`http://localhost:8080/api/bookings/user/${u.id}/active`)
      .subscribe({
        next: (bookings) => {
          this.activeBookings.set(bookings);
          // Auto-select if only one booking
          if (bookings.length === 1) {
            this.form.patchValue({ bookingId: bookings[0].bookingId });
          }
          this.loadingBookings.set(false);
        },
        error: () => {
          this.activeBookings.set([]);
          this.loadingBookings.set(false);
        }
      });
  }

  reset(formDirective?: FormGroupDirective) {
    if (formDirective) formDirective.resetForm();
    this.form.reset({
      bookingId: this.activeBookings().length === 1 ? this.activeBookings()[0].bookingId : null,
      category: '',
      priority: '',
      contactPreference: 'EMAIL',
      title: '',
      description: ''
    });
  }

  copyId() {
    if (!this.createdReference) return;
    navigator.clipboard?.writeText(this.createdReference).then(() => {
      this.snack.open('Complaint ID copied', 'OK', { duration: 2000 });
    }).catch(() => {});
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

      this.createdReference = created.referenceNumber;
      const ref = this.snack.open(`Complaint created • Ref: ${created.referenceNumber}`, 'Copy ID', { duration: 6000 });
      ref.onAction().subscribe(() => this.copyId());

      this.reset(formDirective);
      setTimeout(() => { this.createdReference = null; }, 120000);

    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Failed to create complaint';
      this.snack.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.submitting = false;
    }
  }
}