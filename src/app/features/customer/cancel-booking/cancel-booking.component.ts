import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';

type CancelReason =
  | 'CHANGE_OF_PLANS'
  | 'FOUND_BETTER_PRICE'
  | 'DATE_CHANGE'
  | 'BOOKED_BY_MISTAKE'
  | 'PAYMENT_ISSUE'
  | 'OTHER';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule
  ],
  template: `
    <div class="cancel-bg">
      <div class="container-fluid p-0">

        <!-- HERO HEADER -->
        <div class="app-card p-3 p-md-4 mb-4 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Customer Portal</div>
              <h2 class="fw-bold mb-1 title">Cancel Booking</h2>
              <p class="text-muted mb-0">
                Review your reservation details and confirm cancellation.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Add a reason to help us improve service</span>
            </div>
          </div>
        </div>

        <!-- NOT FOUND -->
        <div *ngIf="!booking()" class="app-card p-4 empty">
          <div class="empty-ico">🔍</div>
          <div class="fw-bold">Booking not found</div>
          <div class="text-muted small">Please return to Booking History and try again.</div>

          <div class="mt-3">
            <button mat-raised-button class="btn-app" (click)="back()">Back to History</button>
          </div>
        </div>

        <!-- MAIN CARD -->
        <div *ngIf="booking() as b" class="app-card p-3 p-md-4">

          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
            <div>
              <h5 class="fw-bold mb-1">Cancellation Details</h5>
              <div class="text-muted small">
                Please verify the reservation and provide a cancellation reason.
              </div>
            </div>

            <!-- Top chip only -->
            <div class="right-top">
              <mat-chip class="status-chip" [ngClass]="statusClass(b.status)">
                {{ b.status || '—' }}
              </mat-chip>
            </div>
          </div>

          <mat-divider class="mb-3"></mat-divider>

          <!-- Summary -->
          <div class="summary app-card p-3 mb-3">
            <div class="row-wrap">

              <!-- LEFT -->
              <div class="left">
                <div class="head">
                  <div class="title-ico">🏨</div>
                  <div class="min-w-0">
                    <div class="summary-title text-truncate">
                      {{ roomName() || '—' }}
                    </div>

                    <div class="meta text-muted small mt-1">
                      <span class="me-2">
                        <mat-icon class="meta-ico">event</mat-icon>
                        Dates: {{ b.fromDate | date:'mediumDate' }} → {{ b.toDate | date:'mediumDate' }}
                      </span>

                      <span class="me-2">
                        <mat-icon class="meta-ico">nights_stay</mat-icon>
                        Nights: {{ nights() }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="note mt-2">
                  <div class="callout">
                    <mat-icon class="callout-ico">info</mat-icon>
                    <div class="callout-text">
                      Cancellation policies vary by room and date. Refunds (if applicable) will be processed
                      according to hotel policy.
                    </div>
                  </div>
                </div>
              </div>

              <!-- MIDDLE -->
              <div class="mid">
                <div class="mid-stat">
                  <div class="mid-label text-muted small">Current Status</div>
                  <div class="mid-value fw-bold">{{ b.status || '—' }}</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Form -->
          <div class="form-grid">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Cancellation reason</mat-label>
              <mat-select [value]="reason()" (selectionChange)="setReason($event.value)">
                <mat-option value="CHANGE_OF_PLANS">Change of plans</mat-option>
                <mat-option value="FOUND_BETTER_PRICE">Found a better price</mat-option>
                <mat-option value="DATE_CHANGE">Need to change dates</mat-option>
                <mat-option value="BOOKED_BY_MISTAKE">Booked by mistake</mat-option>
                <mat-option value="PAYMENT_ISSUE">Payment issue</mat-option>
                <mat-option value="OTHER">Other</mat-option>
              </mat-select>

              <mat-hint *ngIf="!showErrors()">Required</mat-hint>
              <mat-hint class="text-danger" *ngIf="showErrors() && !reason()">
                Please select a reason.
              </mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Additional note (optional)</mat-label>
              <input
                matInput
                [value]="note()"
                (input)="setNote($any($event.target).value)"
                placeholder="Optional…"
                maxlength="200"
              />
              <mat-hint align="end">{{ (note() || '').length }}/200</mat-hint>
            </mat-form-field>
          </div>

          <!-- Acknowledgement -->
          <div class="ack mt-2">
            <mat-checkbox [checked]="ack()" (change)="ack.set($event.checked)">
              I understand that refunds (if applicable) follow the hotel cancellation policy.
            </mat-checkbox>

            <div class="text-danger small mt-1" *ngIf="showErrors() && !ack()">
              Please acknowledge the policy to continue.
            </div>
          </div>

          <mat-divider class="my-3"></mat-divider>

          <!-- Actions -->
          <div class="actions d-flex flex-column flex-sm-row gap-2 justify-content-end">
            <button
              mat-raised-button
              color="warn"
              (click)="confirm()"
              [disabled]="disableConfirm(b)"
            >
              Confirm Cancellation
            </button>

            <button mat-stroked-button (click)="back()">Back</button>
          </div>

          <!-- ✅ FIXED: no String(...) in template -->
          <div class="text-muted small mt-3" *ngIf="upper(b.status) !== 'CANCELLED'">
            After cancellation, you can view the updated status in Booking History.
          </div>

          <div class="text-muted small mt-2" *ngIf="upper(b.status) === 'CANCELLED'">
            This booking is already cancelled.
          </div>

        </div>

        <div class="text-center mt-4 small text-muted">
          © 2026 Hotel Booking System
        </div>

      </div>
    </div>
  `,
  styles: [`
    .cancel-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding: 0px;
      border-radius: 18px;
    }

    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      position: relative;
      overflow: hidden;
    }
    .hero::before, .hero::after{ content: none !important; display: none !important; }

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

    .hero-badge{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-dot{
      width: 8px; height: 8px; border-radius: 999px;
      background: var(--app-secondary);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }

    .right-top{
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .summary{
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.06);
    }

    .row-wrap{
      display: flex;
      gap: 14px;
      align-items: stretch;
      justify-content: space-between;
    }

    .left{ min-width: 0; flex: 1 1 auto; }
    .head{ display: flex; gap: 10px; align-items: flex-start; }

    .title-ico{
      width: 40px; height: 40px; border-radius: 14px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex: 0 0 40px;
    }

    .summary-title{
      font-weight: 900;
      color: rgba(15,23,42,0.92);
      line-height: 1.15;
    }

    .meta-ico{
      font-size: 16px;
      width: 16px; height: 16px;
      vertical-align: -3px;
      margin-right: 4px;
      opacity: .75;
    }

    .callout{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      border: 1px dashed rgba(15,23,42,0.14);
      background: rgba(255,255,255,0.65);
      border-radius: 14px;
      padding: 10px 12px;
      margin-left: 50px;
    }
    .callout-ico{ font-size: 18px; opacity: .75; margin-top: 1px; }
    .callout-text{ font-size: 13px; color: rgba(15,23,42,0.72); line-height: 1.35; }

    .mid{
      flex: 0 0 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mid-stat{
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.7);
      border-radius: 14px;
      padding: 10px 14px;
      width: 100%;
      text-align: center;
    }
    .mid-value{
      color: rgba(15,23,42,0.92);
      letter-spacing: 0.02em;
    }

    .form-grid{
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    @media (min-width: 992px){
      .form-grid{
        grid-template-columns: 1fr 1fr;
        align-items: start;
      }
    }

    .ack{ padding-left: 2px; }

    .status-chip{
      font-weight: 900;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
    }
    .st-cancelled{
      background: rgba(239, 68, 68, 0.12) !important;
      border-color: rgba(239, 68, 68, 0.26) !important;
      color: rgba(127, 29, 29, 0.95) !important;
    }
    .st-active{
      background: rgba(34, 197, 94, 0.12) !important;
      border-color: rgba(34, 197, 94, 0.26) !important;
      color: rgba(11, 92, 42, 0.95) !important;
    }
    .st-default{
      background: rgba(79, 70, 229, 0.10) !important;
      border-color: rgba(79, 70, 229, 0.22) !important;
      color: rgba(31, 27, 153, 0.95) !important;
    }

    .empty{
      text-align: center;
      border-radius: 16px;
      background: rgba(255,255,255,0.7);
      border: 1px dashed rgba(15,23,42,0.14);
    }
    .empty-ico{ font-size: 28px; margin-bottom: 8px; }

    @media (max-width: 640px){
      .row-wrap{ flex-direction: column; }
      .mid{ flex: 0 0 auto; width: 100%; }
      .callout{ margin-left: 0; }
    }
  `]
})
export class CancelBookingComponent {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookings: BookingService,
    private rooms: RoomService
  ) {}

  bookingId = computed(() => this.route.snapshot.queryParamMap.get('bookingId') ?? '');
  booking = computed(() => this.bookings.byId(this.bookingId()));

 roomName = computed(() => {
  const b = this.booking();
  if (!b) return '';

  if (b.roomId == null) return ''; // 👈 FIX

  return this.rooms.byId(b.roomId)?.name ?? '';
});

  nights = computed(() => {
    const b = this.booking();
    if (!b) return 0;
    const from = new Date(b.fromDate);
    const to = new Date(b.toDate);
    const diff = to.getTime() - from.getTime();
    const n = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  reason = signal<CancelReason | ''>('');
  note = signal('');
  ack = signal(false);

  attempted = signal(false);
  showErrors = computed(() => this.attempted());

  /** ✅ Template-safe uppercase helper */
  upper(v: any): string {
    return String(v ?? '').toUpperCase().trim();
  }

  setReason(v: CancelReason) {
    this.reason.set(v ?? '');
  }

  setNote(v: string) {
    const cleaned = String(v ?? '').trim().slice(0, 200);
    this.note.set(cleaned);
  }

  disableConfirm(b: any): boolean {
    if (!b) return true;
    if (this.upper(b.status) === 'CANCELLED') return true;
    if (!this.reason()) return true;
    if (!this.ack()) return true;
    return false;
  }

  statusClass(status: any) {
    const s = this.upper(status);
    if (s === 'CANCELLED') return 'st-cancelled';
    if (s === 'CONFIRMED' || s === 'ACTIVE') return 'st-active';
    return 'st-default';
  }

 confirm() {
  this.attempted.set(true);

  const b = this.booking();
  if (!b) return;

  if (this.upper(b.status) === 'CANCELLED') return;
  if (!this.reason() || !this.ack()) return;

  this.bookings.cancelBooking(b.id).subscribe({
    next: () => {
      this.bookings.markCancelledLocally(b.id); // update signals
      this.router.navigateByUrl('/customer/history');
    },
    error: (e) => {
      console.error('Cancel booking failed', e);
    }
  });
}

  back() {
    this.router.navigateByUrl('/customer/history');
  }
}