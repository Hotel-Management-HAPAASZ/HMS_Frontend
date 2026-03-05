import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl, ValidatorFn, AbstractControl } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { BookingApiService } from '../../../core/services/booking-api.service';
import { RoomService } from '../../../core/services/room.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentApiService, PaymentResponse } from '../../../core/services/payment-api.service';
import { ToastService } from '../../../core/services/toast.service';

/* ───────────── Custom validators ───────────── */
const cardNameValidator: ValidatorFn = (control: AbstractControl) => {
  const v = (control.value ?? '').trim();
  if (!v) return { required: true };
  if (!/^[A-Za-z ]{3,}$/.test(v)) return { cardName: true };
  return null;
};

const expiryFutureValidator: ValidatorFn = (control: AbstractControl) => {
  const raw = (control.value ?? '').trim();
  if (!raw) return { required: true };
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(raw);
  if (!m) return { pattern: true };
  const mm = parseInt(m[1], 10);
  const yy = 2000 + parseInt(m[2], 10);
  const now = new Date();
  const nowYM = now.getFullYear() * 100 + (now.getMonth() + 1);
  const expYM = yy * 100 + mm;
  if (expYM < nowYM) return { expired: true };
  return null;
};
/* ───────────────────────────────────────────── */

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  providers: [DatePipe],
  template: `
  <div class="pay-bg">
    <div class="container-fluid p-0">

      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Payments</div>
            <h2 class="fw-bold mb-1 title">Pay Bill</h2>
            <p class="text-muted mb-0">
              Review the booking summary and complete payment.
            </p>
          </div>

          <div class="hero-badge" *ngIf="booking() as b">
            <span class="badge-dot"></span>
            <span class="text-muted small">Status:</span>
            <span class="small fw-semibold">{{ b.status }}</span>
          </div>
        </div>
      </div>

      <!-- Missing / invalid booking -->
      <div class="app-card p-3 p-md-4" *ngIf="!bookingId()">
        <div class="empty-title">No booking selected</div>
        <div class="text-muted small">Open this page with a valid booking ID.</div>
      </div>
      <div class="app-card p-3 p-md-4" *ngIf="bookingId() && !booking()">
        <div class="empty-title">Booking not found</div>
        <div class="text-muted small">The booking ID in the URL does not match any records.</div>
      </div>

      <div class="row g-3 g-md-4" *ngIf="booking() as b">
        <!-- LEFT -->
        <div class="col-12 col-lg-5">
          <div class="app-card p-3 p-md-4 h-100">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <div class="section-title">Booking Summary</div>
                <div class="text-muted small">Verify details before paying.</div>
              </div>
              <span class="status-pill"
                    [class.paid]="b.status === 'PAID'"
                    [class.unpaid]="b.status !== 'PAID'">
                {{ b.status === 'PAID' ? 'Paid' : 'Payment Due' }}
              </span>
            </div>

            <div class="mt-3 info-grid">
              <div class="info-row">
                <div class="info-k">Booking ID</div>
                <div class="info-v mono">{{ b.bookingId || b.id }}</div>
              </div>

              <div class="info-row">
                <div class="info-k">Room</div>
                <div class="info-v">{{ roomName() || '—' }}</div>
              </div>

              <div class="info-row" *ngIf="b.checkIn">
                <div class="info-k">Check-in</div>
                <div class="info-v">{{ formatDate(b.checkIn) }}</div>
              </div>
              <div class="info-row" *ngIf="b.checkOut">
                <div class="info-k">Check-out</div>
                <div class="info-v">{{ formatDate(b.checkOut) }}</div>
              </div>

              <div class="info-row">
                <div class="info-k">Amount</div>
                <div class="info-v amount">₹{{ b.totalAmount }}</div>
              </div>
            </div>

            <div class="divider my-3"></div>
            <div class="text-muted small">
              <b>Note:</b> Keep your contact details accurate for any booking communication.
            </div>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="col-12 col-lg-7">
          <div class="app-card p-3 p-md-4">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="section-title">Payment Details</div>
                <div class="text-muted small">Enter payer info and select a payment method.</div>
              </div>
              <div class="total-pill">
                Total: <span class="fw-bold">₹{{ b.totalAmount }}</span>
              </div>
            </div>

            <form class="mt-3" [formGroup]="form" (ngSubmit)="pay()">
              <div class="subhead">Payer Information</div>
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Full Name</mat-label>
                    <input matInput formControlName="payerName">
                    <mat-error *ngIf="form.controls.payerName.touched && form.controls.payerName.hasError('required')">
                      Name is required
                    </mat-error>
                    <mat-error *ngIf="form.controls.payerName.touched && form.controls.payerName.hasError('minlength')">
                      Minimum 3 characters
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="payerEmail">
                    <mat-error *ngIf="form.controls.payerEmail.touched && form.controls.payerEmail.hasError('required')">
                      Email is required
                    </mat-error>
                    <mat-error *ngIf="form.controls.payerEmail.touched && form.controls.payerEmail.hasError('email')">
                      Enter a valid email
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Mobile Number</mat-label>
                    <input matInput formControlName="payerPhone" placeholder="10-digit number" inputmode="numeric" maxlength="10">
                    <mat-error *ngIf="form.controls.payerPhone.touched && form.controls.payerPhone.hasError('required')">
                      Mobile number is required
                    </mat-error>
                    <mat-error *ngIf="form.controls.payerPhone.touched && form.controls.payerPhone.hasError('pattern')">
                      Enter a valid 10-digit mobile number
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="col-12 col-md-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Payment Method</mat-label>
                    <mat-select formControlName="method" [disabled]="awaitingOtp() || paying()">
                      <mat-option value="UPI">UPI</mat-option>
                      <mat-option value="CARD">Card</mat-option>
                      <mat-option value="CASH">Cash (at reception)</mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.controls.method.touched && form.controls.method.hasError('required')">
                      Select a payment method
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>

              <!-- UPI -->
              <div class="mt-2" *ngIf="form.value.method === 'UPI'">
                <div class="subhead">UPI Details</div>
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>UPI ID</mat-label>
                  <input matInput formControlName="upiId" placeholder="yourname@bank">
                  <mat-error *ngIf="form.controls.upiId.touched && form.controls.upiId.hasError('required')">
                    UPI ID is required
                  </mat-error>
                  <mat-error *ngIf="form.controls.upiId.touched && form.controls.upiId.hasError('pattern')">
                    Enter a valid UPI ID (e.g., name bank)
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- CARD -->
              <div class="mt-2" *ngIf="form.value.method === 'CARD'">
                <div class="subhead">Card Details</div>
                <div class="row g-2">
                  <div class="col-12">
                    <mat-form-field appearance="outline" class="w-100">
                      <mat-label>Card Number</mat-label>
                      <input matInput formControlName="cardNumber" placeholder="1234567890123456" inputmode="numeric" maxlength="16">
                      <mat-error *ngIf="form.controls.cardNumber.touched && form.controls.cardNumber.hasError('required')">
                        Card number is required
                      </mat-error>
                      <mat-error *ngIf="form.controls.cardNumber.touched && form.controls.cardNumber.hasError('pattern')">
                        Enter a valid 16-digit card number
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="col-12 col-md-6">
                    <mat-form-field appearance="outline" class="w-100">
                      <mat-label>Name on Card</mat-label>
                      <input matInput formControlName="cardName" placeholder="First Last">
                      <mat-error *ngIf="form.controls.cardName.touched && form.controls.cardName.hasError('required')">
                        Name on card is required
                      </mat-error>
                      <mat-error *ngIf="form.controls.cardName.touched && form.controls.cardName.hasError('cardName')">
                        Letters and spaces only (min 3 chars)
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="col-6 col-md-3">
                    <mat-form-field appearance="outline" class="w-100">
                      <mat-label>Expiry (MM/YY)</mat-label>
                      <input matInput formControlName="expiry" placeholder="08/29" inputmode="numeric" maxlength="5">
                      <mat-error *ngIf="form.controls.expiry.touched && form.controls.expiry.hasError('required')">
                        Expiry is required
                      </mat-error>
                      <mat-error *ngIf="form.controls.expiry.touched && form.controls.expiry.hasError('pattern')">
                        Use MM/YY format
                      </mat-error>
                      <mat-error *ngIf="form.controls.expiry.touched && form.controls.expiry.hasError('expired')">
                        Expiry date must be in the future
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="col-6 col-md-3">
                    <mat-form-field appearance="outline" class="w-100">
                      <mat-label>CVV</mat-label>
                      <input matInput formControlName="cvv" type="password" placeholder="123" inputmode="numeric" maxlength="3">
                      <mat-error *ngIf="form.controls.cvv.touched && form.controls.cvv.hasError('required')">
                        CVV is required
                      </mat-error>
                      <mat-error *ngIf="form.controls.cvv.touched && form.controls.cvv.hasError('pattern')">
                        CVV must be 3 digits
                      </mat-error>
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <!-- CASH -->
              <div class="mt-2" *ngIf="form.value.method === 'CASH'">
                <div class="cash-note">
                  Please pay at the reception during check-in. You will receive the receipt at that time.
                </div>
              </div>

              <div class="mt-2">
                <mat-checkbox formControlName="acceptTerms">
                  I confirm the above details are correct.
                </mat-checkbox>
                <div class="err small"
                     *ngIf="form.controls.acceptTerms.touched && form.controls.acceptTerms.hasError('requiredTrue')">
                  You must confirm before proceeding
                </div>
              </div>

              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button mat-raised-button class="btn-app"
                        type="submit"
                        [disabled]="b.status === 'PAID' || paying() || awaitingOtp()">
                  {{ b.status === 'PAID'
                      ? 'Already Paid'
                      : (paying() ? 'Processing...' :
                          (form.value.method === 'CASH' ? 'Proceed (Cash at Check-in)' :
                           form.value.method === 'CARD' ? 'Proceed (Card)' :
                           'Proceed')) }}
                </button>
              </div>

              <div class="mt-2 small text-muted" *ngIf="b.status !== 'PAID'">
                After successful payment, your booking will be confirmed.
              </div>
            </form>

            <!-- OTP SECTION -->
            <div class="mt-4" *ngIf="awaitingOtp()">
              <div class="subhead">Enter OTP</div>
              <div class="text-muted small mb-2">
                An OTP has been sent to your contact. Enter it below to complete the payment.
              </div>

              <div class="row g-2 align-items-end">
                <div class="col-8 col-sm-6 col-md-4">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>OTP</mat-label>
                    <input matInput [formControl]="otpControl" placeholder="4–6 digit OTP" inputmode="numeric" maxlength="6">
                    <mat-error *ngIf="otpControl.touched && otpControl.hasError('required')">OTP is required</mat-error>
                    <mat-error *ngIf="otpControl.touched && otpControl.hasError('pattern')">Enter a valid 4–6 digit OTP</mat-error>
                  </mat-form-field>
                </div>
                <div class="col-auto">
                  <button mat-raised-button color="primary"
                          (click)="verifyOtp()"
                          [disabled]="paying() || otpControl.invalid">
                    {{ paying() ? 'Verifying...' : 'Verify OTP' }}
                  </button>
                </div>
                <div class="col-auto">
                  <button mat-stroked-button (click)="cancelOtp()" [disabled]="paying()">Cancel</button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <div class="text-center mt-4 small text-muted">© 2026 Hotel Booking System</div>
    </div>
  </div>
  `,
  styles: [`
    .pay-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      min-height: 100%;
      border-radius: 18px;
    }
    .hero{ background:#fff !important; border:1px solid var(--app-border); border-radius:18px; box-shadow:0 10px 25px rgba(2,8,23,0.08); overflow:hidden; }
    .kicker{ font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(15,23,42,0.55); margin-bottom:6px; }
    .hero-badge{ display:inline-flex; align-items:center; gap:8px; padding:10px 12px; border-radius:999px; border:1px solid rgba(15,23,42,0.08); background:rgba(15,23,42,0.02); }
    .badge-dot{ width:8px; height:8px; border-radius:999px; background:var(--app-secondary); box-shadow:0 0 0 4px rgba(6,182,212,0.12); }
    .section-title{ font-weight:900; font-size:16px; margin-bottom:2px; }
    .total-pill{ border:1px solid rgba(15,23,42,0.08); background:rgba(15,23,42,0.02); padding:8px 12px; border-radius:999px; font-size:13px; }
    .info-grid{ display:grid; gap:10px; }
    .info-row{ display:flex; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid rgba(15,23,42,0.08); background:rgba(255,255,255,0.7); border-radius:14px; }
    .info-k{ font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:rgba(15,23,42,0.55); }
    .info-v{ font-weight:800; color:rgba(15,23,42,0.90); }
    .mono{ font-family: ui-monospace, Menlo, Consolas, monospace; }
    .amount{ font-size:18px; font-weight:900; }
    .status-pill{ font-size:12px; font-weight:900; padding:6px 10px; border-radius:999px; border:1px solid rgba(15,23,42,0.08); background:rgba(15,23,42,0.02); }
    .status-pill.paid{ border-color:rgba(34,197,94,0.25); background:rgba(34,197,94,0.12); }
    .status-pill.unpaid{ border-color:rgba(245,158,11,0.25); background:rgba(245,158,11,0.12); }
    .divider{ height:1px; background:rgba(15,23,42,0.08); border-radius:999px; }
    .subhead{ margin:12px 0 8px; font-size:12px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:rgba(15,23,42,0.60); }
    .cash-note{ padding:12px 14px; border-radius:14px; border:1px solid rgba(6,182,212,0.22); background:rgba(6,182,212,0.08); }
    .err{ color:var(--app-danger); margin-top:6px; }
    .empty-title{ font-weight:900; font-size:16px; margin-bottom:6px; }
    .btn-app{ background: var(--app-primary); color:#fff; }
  `]
})
export class PayBillComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rooms = inject(RoomService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private datePipe = inject(DatePipe);
  private bookingApi = inject(BookingApiService);
  private paymentApi = inject(PaymentApiService);
  private toast = inject(ToastService);

  paying = signal(false);
  awaitingOtp = signal(false);
  currentPayment = signal<PaymentResponse | null>(null);

  bookingSignal = signal<any | null>(null);
  bookingId = computed(() => this.route.snapshot.queryParamMap.get('bookingId') ?? '');
  booking = computed(() => this.bookingSignal());

  roomName = computed(() => {
    const b = this.booking();
    if (!b) return '';
    const roomId = (b as any).roomId ?? (b as any)?.rooms?.[0]?.roomId;
    if (!roomId) return '';
    return this.rooms.byId(String(roomId))?.name ?? `Room #${roomId}`;
  });

  form = this.fb.nonNullable.group({
    payerName: ['', [Validators.required, Validators.minLength(3)]],
    payerEmail: ['', [Validators.required, Validators.email]],
    payerPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    method: ['', [Validators.required]],
    // Conditional:
    upiId: [''],
    cardNumber: [''],
    cardName: [''],
    expiry: [''],
    cvv: [''],
    acceptTerms: [false, [Validators.requiredTrue]]
  });

  otpControl = new FormControl('', [Validators.required, Validators.pattern(/^\d{4,6}$/)]);

  ngOnInit(): void {
    // Load booking
    const idStr = this.bookingId();
    const id = Number(idStr);
    if (Number.isFinite(id)) {
      this.bookingApi.getOne(id).subscribe({
        next: (b) => {
          this.bookingSignal.set(b);
          const u = this.auth.user();
          if (u && !this.form.dirty) {
            this.form.patchValue({
              payerName: (u as any)?.fullName ?? '',
              payerEmail: (u as any)?.email ?? '',
              payerPhone: (u as any)?.phone ?? ''
            }, { emitEvent: false });
          }
        },
        error: () => this.bookingSignal.set(null)
      });
    } else {
      this.bookingSignal.set(null);
    }

    // Initial validators based on method
    this.applyMethodValidators(this.form.controls.method.value as any);

    // Update validators on method change
    this.form.controls.method.valueChanges.subscribe(method => {
      this.applyMethodValidators(method as any);
    });
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return this.datePipe.transform(d, 'mediumDate') ?? '—';
  }

  /* ───────────── Conditional validation helpers ───────────── */
  private applyMethodValidators(method: 'CASH' | 'CARD' | 'UPI' | '' | null) {
    this.form.controls.upiId.clearValidators();
    this.form.controls.cardNumber.clearValidators();
    this.form.controls.cardName.clearValidators();
    this.form.controls.expiry.clearValidators();
    this.form.controls.cvv.clearValidators();

    if (method === 'UPI') {
      this.form.controls.upiId.setValidators([
        Validators.required,
        Validators.pattern(/^[\w.\-]{2,}@[A-Za-z]{2,}$/)
      ]);
    }
    if (method === 'CARD') {
      this.form.controls.cardNumber.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      this.form.controls.cardName.setValidators([cardNameValidator]);
      this.form.controls.expiry.setValidators([expiryFutureValidator]);
      this.form.controls.cvv.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
    }

    this.form.controls.upiId.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cardNumber.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cardName.updateValueAndValidity({ emitEvent: false });
    this.form.controls.expiry.updateValueAndValidity({ emitEvent: false });
    this.form.controls.cvv.updateValueAndValidity({ emitEvent: false });
  }

  private isValidFor(method: 'CASH' | 'CARD' | 'UPI'): boolean {
    const baseControls = ['payerName', 'payerEmail', 'payerPhone', 'method', 'acceptTerms'] as const;
    const baseOk = baseControls.every(k => (this.form.controls as any)[k].valid);
    if (!baseOk) return false;
    if (method === 'CASH') return true;
    if (method === 'UPI') return this.form.controls.upiId.valid;
    if (method === 'CARD') {
      const cardControls = ['cardNumber', 'cardName', 'expiry', 'cvv'] as const;
      return cardControls.every(k => (this.form.controls as any)[k].valid);
    }
    return false;
  }

  private touchRelevant(method: 'CASH' | 'CARD' | 'UPI') {
    const touch = (k: string) => (this.form.controls as any)[k]?.markAsTouched();
    ['payerName','payerEmail','payerPhone','method','acceptTerms'].forEach(touch);
    if (method === 'UPI') touch('upiId');
    if (method === 'CARD') ['cardNumber','cardName','expiry','cvv'].forEach(touch);
  }
  /* ────────────────────────────────────────────────────────── */

  /* ───────────── Submit ───────────── */
  pay() {
    const b = this.booking() as any;
    if (!b) { this.toast.showError('Booking not found. Please verify your booking reference.'); return; }
    if (b.status === 'PAID') { this.toast.showSuccess('This booking has already been paid in full.'); return; }

    const method = this.form.value.method as 'CASH' | 'CARD' | 'UPI';
    if (!method) { this.form.controls.method.markAsTouched(); this.toast.showError('Please select a payment method to proceed.'); return; }

    this.touchRelevant(method);
    if (!this.isValidFor(method)) { this.toast.showError('Please fix the highlighted errors in the form before proceeding.'); return; }

    const bookingId = Number(b.bookingId ?? b.id);

    if (method === 'CASH') {
      // No payment API call; show intermediate screen
      this.router.navigate(['/customer/payment-result'], {
        queryParams: { mode: 'cash', bookingId }
      });
      return;
    }

    if (method === 'UPI') {
      this.toast.showSuccess('UPI payment details have been captured successfully.');
      return;
    }

    // CARD → initiate → OTP
    const payload = {
      bookingId,
      paymentMethod: 'CARD',
      cardNumber: this.form.value.cardNumber!,
      cardHolderName: this.form.value.cardName!,
      expiry: this.form.value.expiry!,
      cvv: this.form.value.cvv!
    };

    this.paying.set(true);
    this.paymentApi.initiatePayment(payload).subscribe({
      next: (resp) => {
        this.currentPayment.set(resp);
        this.awaitingOtp.set(true);
        this.otpControl.reset();
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? err?.message ?? 'We were unable to initiate the card payment. Please try again later.';
        this.toast.showError(errorMsg);
      },
      complete: () => this.paying.set(false)
    });
  }

  verifyOtp() {
    const payment = this.currentPayment();
    if (!payment) { this.toast.showError('There is no active payment to verify.'); return; }
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid) return;

    const req = { paymentId: payment.paymentId, otp: this.otpControl.value as string };

    this.paying.set(true);
    this.paymentApi.verifyPayment(req).subscribe({
      next: (resp) => {
        // Optional: refresh booking
        const id = Number(this.bookingId());
        if (Number.isFinite(id)) {
          this.bookingApi.getOne(id).subscribe({ next: (b) => this.bookingSignal.set(b) });
        }
        // Navigate to success screen with 3s buffer
        this.router.navigate(['/customer/payment-result'], {
          queryParams: { mode: 'card', bookingId: this.bookingId(), paymentId: resp.paymentId, delay: 1 }
        });
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? err?.message ?? 'OTP verification failed. Please ensure you entered the correct code.';
        this.toast.showError(errorMsg);
      },
      complete: () => this.paying.set(false)
    });
  }

  cancelOtp() {
    this.awaitingOtp.set(false);
    this.currentPayment.set(null);
    this.otpControl.reset();
  }
}


