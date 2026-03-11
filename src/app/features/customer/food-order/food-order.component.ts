import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { FoodApiService, FoodMenuItem, FoodPaymentResponse, CheckedInBooking } from '../../../core/services/food-api.service';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, catchError, of } from 'rxjs';
import { AbstractControl, ValidatorFn } from '@angular/forms';

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
    RouterLink
  ],
  template: `
  <div class="container py-3">
    <div class="app-card p-3 p-md-4 mb-3">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div class="kicker">Room Service</div>
          <h2 class="fw-bold mb-1">Order Food (Pay Now)</h2>
          <div class="text-muted small">Menu → choose quantities → pay now (OTP) → ETA ~10 minutes.</div>
        </div>
        <div class="total-pill">
          Total: <span class="fw-bold">₹{{ total() }}</span>
        </div>
      </div>
    </div>

    <!-- Warning if not checked in -->
    <div class="app-card p-3 p-md-4 mb-3 alert-warning-box" *ngIf="checkedInBookings().length === 0 && !checkingStatus()">
      <div class="d-flex align-items-center gap-2">
        <span class="warning-icon">⚠️</span>
        <div>
          <div class="fw-bold">You must be checked in to order food</div>
          <div class="text-muted small">Please check in at the front desk before placing a food order.</div>
        </div>
      </div>
    </div>

    <!-- Room Selector (if multiple checked-in rooms) -->
    <div class="app-card p-3 p-md-4 mb-3" *ngIf="checkedInBookings().length > 1 && !checkingStatus()">
      <div class="d-flex align-items-center gap-3">
        <div class="fw-bold">Select Room:</div>
        <mat-form-field appearance="outline" class="room-select">
          <mat-label>Room</mat-label>
          <mat-select [value]="selectedBookingId()" (selectionChange)="selectedBookingId.set($event.value)">
            <mat-option *ngFor="let booking of checkedInBookings()" [value]="booking.bookingId">
              Room {{ booking.roomNumbers.join(', ') }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>

    <!-- Auto-selected room info (if only one) -->
    <div class="app-card p-3 p-md-4 mb-3 info-box" *ngIf="checkedInBookings().length === 1 && !checkingStatus()">
      <div class="d-flex align-items-center gap-2">
        <span class="info-icon">📍</span>
        <div>
          <div class="fw-bold">Ordering for Room {{ checkedInBookings()[0].roomNumbers.join(', ') }}</div>
        </div>
      </div>
    </div>

    <div class="app-card p-3 p-md-4 mb-3" *ngIf="loading() || checkingStatus()">
      {{ checkingStatus() ? 'Checking your booking status...' : 'Loading menu...' }}
    </div>

    <div class="row g-3" *ngIf="!loading() && !checkingStatus()">
      <div class="col-12 col-lg-8">
        <div class="app-card p-3 p-md-4">
          <div class="section-title mb-3">Menu</div>

          <div *ngIf="menu().length === 0" class="text-muted small">
            No menu items found.
          </div>

          <div class="menu-grid" *ngIf="menu().length">
            <div class="food-card" *ngFor="let item of menu(); let i = index" [class.unavailable]="!item.available">
              <!-- Food Image -->
              <div class="food-img-wrap">
                <img *ngIf="item.imageUrl" [src]="item.imageUrl" [alt]="item.name" class="food-img" loading="lazy">
                <div *ngIf="!item.imageUrl" class="food-img food-img-placeholder">
                  <span>🍽️</span>
                </div>
                <span class="cat-badge">{{ item.category || 'Food' }}</span>
                <div class="unavail-overlay" *ngIf="!item.available">Unavailable</div>
              </div>

              <!-- Food Info -->
              <div class="food-info">
                <div class="food-name">{{ item.name }}</div>
                <div class="food-desc" *ngIf="item.description">{{ item.description }}</div>
                <div class="food-bottom">
                  <div class="food-price">₹{{ item.price }}</div>
                  <div class="qty-stepper" *ngIf="item.available">
                    <button class="qty-btn" (click)="decrement(i)" [disabled]="paying() || awaitingOtp() || checkedInBookings().length === 0 || qtyAt(i).value <= 0">−</button>
                    <span class="qty-val">{{ qtyAt(i).value || 0 }}</span>
                    <button class="qty-btn qty-btn-add" (click)="increment(i)" [disabled]="paying() || awaitingOtp() || checkedInBookings().length === 0">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button mat-raised-button color="primary" class="mt-3 w-100 place-order-btn"
                  (click)="placeOrder()"
                  [disabled]="paying() || awaitingOtp() || total() <= 0 || checkedInBookings().length === 0 || (checkedInBookings().length > 1 && !selectedBookingId())">
            {{ paying() ? 'Processing...' : 'Pay Now — ₹' + total() }}
          </button>
          <div class="text-muted small mt-2 text-center">
            Demo OTP is <b>111111</b>.
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="app-card p-3 p-md-4">
          <div class="section-title mb-2">Payment</div>

          <div *ngIf="!awaitingOtp() && !successMessage()" [formGroup]="form">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Payment Method</mat-label>
              <mat-select formControlName="method" [disabled]="paying()">
                <mat-option value="UPI">UPI</mat-option>
                <mat-option value="CARD">Card</mat-option>
                <mat-option value="CASH">Room Charge</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- UPI -->
            <div class="mt-2" *ngIf="form.value.method === 'UPI'">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>UPI ID</mat-label>
                <input matInput formControlName="upiId" placeholder="yourname@bank">
              </mat-form-field>
            </div>

            <!-- CARD -->
            <div class="mt-2" *ngIf="form.value.method === 'CARD'">
              <div class="row g-2">
                <div class="col-12">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Card Number</mat-label>
                    <input matInput formControlName="cardNumber" placeholder="1234567890123456" inputmode="numeric" maxlength="16">
                  </mat-form-field>
                </div>
                <div class="col-12">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Name on Card</mat-label>
                    <input matInput formControlName="cardName" placeholder="First Last">
                  </mat-form-field>
                </div>
                <div class="col-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Expiry</mat-label>
                    <input matInput formControlName="expiry" placeholder="08/29" inputmode="numeric" maxlength="5">
                  </mat-form-field>
                </div>
                <div class="col-6">
                  <mat-form-field appearance="outline" class="w-100">
                    <mat-label>CVV</mat-label>
                    <input matInput formControlName="cvv" type="password" placeholder="123" inputmode="numeric" maxlength="3">
                  </mat-form-field>
                </div>
              </div>
            </div>

            <div class="text-muted small mt-2 mb-3">After you click “Pay Now”, you’ll be asked for OTP if paying via Card.</div>
          </div>

          <div *ngIf="awaitingOtp()">
            <div class="text-muted small mb-2">Enter OTP to complete payment.</div>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>OTP</mat-label>
              <input matInput [formControl]="otpControl" maxlength="6" inputmode="numeric" placeholder="111111">
            </mat-form-field>
            <div class="d-flex gap-2">
              <button mat-raised-button color="primary"
                      (click)="verifyOtp()"
                      [disabled]="paying() || otpControl.invalid">
                {{ paying() ? 'Verifying...' : 'Verify OTP' }}
              </button>
              <button mat-stroked-button (click)="cancelOtp()" [disabled]="paying()">Cancel</button>
            </div>
          </div>

          <div *ngIf="successMessage()" class="success-box">
            <div class="fw-bold mb-1">Order Confirmed</div>
            <div class="small">{{ successMessage() }}</div>
            <div class="small mt-1" *ngIf="lastOrderId()">Order ID: {{ lastOrderId() }}</div>
            <button mat-stroked-button color="primary" class="mt-3 w-100" routerLink="/customer/food-history">
              Track Order
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .kicker{ font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(15,23,42,0.55); margin-bottom:6px; }
    .section-title{ font-weight:900; font-size:18px; }
    .total-pill{ border:1px solid rgba(15,23,42,0.08); background:rgba(15,23,42,0.02); padding:8px 16px; border-radius:999px; font-size:14px; white-space:nowrap; }

    /* Image card grid */
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) {
      .menu-grid { grid-template-columns: 1fr; }
    }

    .food-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      transition: box-shadow 0.2s ease, transform 0.15s ease;
    }
    .food-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.10);
      transform: translateY(-2px);
    }
    .food-card.unavailable { opacity: 0.55; pointer-events: none; }

    .food-img-wrap {
      position: relative;
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: #f0f2f5;
    }
    .food-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .food-img-placeholder {
      display: flex; align-items: center; justify-content: center;
      font-size: 48px; background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    }
    .cat-badge {
      position: absolute; top: 10px; left: 10px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
      background: rgba(255,255,255,0.92); color: #333;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .unavail-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55); color: white; font-weight: 800; font-size: 14px;
      letter-spacing: 1px; text-transform: uppercase;
    }

    .food-info { padding: 14px 16px; }
    .food-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #1a1a2e; }
    .food-desc { font-size: 12.5px; color: #6b7280; line-height: 1.4; margin-bottom: 10px; }
    .food-bottom {
      display: flex; align-items: center; justify-content: space-between;
    }
    .food-price { font-weight: 800; font-size: 16px; color: #0f172a; }

    /* Quantity stepper */
    .qty-stepper {
      display: flex; align-items: center; gap: 0;
      border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px; overflow: hidden;
    }
    .qty-btn {
      width: 34px; height: 34px; border: none; background: transparent;
      font-size: 18px; font-weight: 700; cursor: pointer; color: #555;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .qty-btn:hover:not(:disabled) { background: rgba(0,0,0,0.06); }
    .qty-btn:disabled { opacity: 0.3; cursor: default; }
    .qty-btn-add { color: #3f51b5; }
    .qty-val {
      width: 32px; text-align: center; font-weight: 700; font-size: 14px;
      user-select: none;
    }

    .place-order-btn {
      border-radius: 12px; height: 48px; font-size: 15px; font-weight: 700;
      letter-spacing: 0.3px;
    }

    .badge-unavail{ display:inline-block; margin-top:6px; font-size:12px; font-weight:800; padding:4px 8px; border-radius:999px; background:rgba(239,68,68,0.12); color:rgba(185,28,28,1); }
    .success-box{ padding:12px 14px; border-radius:14px; border:1px solid rgba(34,197,94,0.25); background:rgba(34,197,94,0.10); }
    .alert-warning-box{ border:1px solid rgba(245,158,11,0.35); background:rgba(245,158,11,0.10); }
    .info-box{ border:1px solid rgba(59,130,246,0.35); background:rgba(59,130,246,0.10); }
    .warning-icon{ font-size:24px; }
    .info-icon{ font-size:24px; }
    .room-select{ min-width:200px; }
  `]
})
export class FoodOrderComponent implements OnInit {
  private foodApi = inject(FoodApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private bookingApi = inject(BookingApiService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  paying = signal(false);
  awaitingOtp = signal(false);
  checkingStatus = signal(true);
  checkedInBookings = signal<CheckedInBooking[]>([]);
  selectedBookingId = signal<number | null>(null);
  menu = signal<FoodMenuItem[]>([]);

  currentPayment = signal<FoodPaymentResponse | null>(null);
  lastOrderId = signal<number | null>(null);
  successMessage = signal<string>('');

  form = this.fb.group({
    quantities: this.fb.array<FormControl<number>>([]),
    method: ['CARD', [Validators.required]],
    upiId: [''],
    cardNumber: [''],
    cardName: [''],
    expiry: [''],
    cvv: ['']
  });

  otpControl = this.fb.control('', [Validators.required, Validators.pattern(/^\d{4,6}$/)]);

  quantitiesArray = computed(() => this.form.controls.quantities as FormArray<FormControl<number>>);

  // Reactive signal that tracks form value changes
  formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.value)),
    { initialValue: this.form.value }
  );

  total = computed(() => {
    const menu = this.menu();
    const formVal = this.formValues();
    const qs = (formVal?.quantities as any[]) ?? [];
    let sum = 0;
    for (let i = 0; i < menu.length && i < qs.length; i++) {
      const q = Number(qs[i] ?? 0);
      if (!Number.isFinite(q) || q <= 0) continue;
      sum += q * (menu[i].price ?? 0);
    }
    return Math.round(sum * 100) / 100;
  });

  ngOnInit(): void {
    // Load checked-in bookings
    const user = this.auth.user();
    if (user?.id) {
      this.checkingStatus.set(true);
      this.foodApi.getCheckedInBookings(Number(user.id)).subscribe({
        next: (bookings) => {
          this.checkedInBookings.set(bookings ?? []);
          // Auto-select if only one booking
          if (bookings.length === 1) {
            this.selectedBookingId.set(bookings[0].bookingId);
          }
          this.checkingStatus.set(false);
        },
        error: (err) => {
          const msg =
            (err as any)?.error?.message ||
            (err as any)?.message ||
            'Failed to load your checked-in room(s). Please try again.';
          this.toast.showError(msg);
          this.checkedInBookings.set([]);
          this.checkingStatus.set(false);
        }
      });
    } else {
      this.checkingStatus.set(false);
    }

    // Load menu
    this.foodApi.getMenu().subscribe({
      next: (items) => {
        // Ensure each item has an image (fallback for older DB data without imageUrl)
        const enriched = (items ?? []).map(item => ({
          ...item,
          imageUrl: item.imageUrl || this.fallbackImage(item.name)
        }));
        this.menu.set(enriched);
        const fa = this.form.controls.quantities as FormArray<FormControl<number>>;
        fa.clear();
        enriched.forEach(() => fa.push(this.fb.nonNullable.control(0)));
      },
      error: (err) => {
        this.toast.showError(err?.error?.message || 'Failed to load menu');
        this.menu.set([]);
      },
      complete: () => this.loading.set(false)
    });

    this.applyMethodValidators(this.form.controls.method.value as any);
    this.form.controls.method.valueChanges.subscribe(method => {
      this.applyMethodValidators(method as any);
    });
  }

  applyMethodValidators(method: 'CASH' | 'CARD' | 'UPI' | '' | null) {
    this.form.controls.upiId.clearValidators();
    this.form.controls.cardNumber.clearValidators();
    this.form.controls.cardName.clearValidators();
    this.form.controls.expiry.clearValidators();
    this.form.controls.cvv.clearValidators();

    if (method === 'UPI') {
      this.form.controls.upiId.setValidators([Validators.required, Validators.pattern(/^[\w.\-]{2,}@[A-Za-z]{2,}$/)]);
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

  isValidFor(method: 'CASH' | 'CARD' | 'UPI'): boolean {
    if (method === 'CASH') return true;
    if (method === 'UPI') return this.form.controls.upiId.valid;
    if (method === 'CARD') {
      const cardControls = ['cardNumber', 'cardName', 'expiry', 'cvv'] as const;
      return cardControls.every(k => (this.form.controls as any)[k].valid);
    }
    return false;
  }

  touchRelevant(method: 'CASH' | 'CARD' | 'UPI') {
    const touch = (k: string) => (this.form.controls as any)[k]?.markAsTouched();
    touch('method');
    if (method === 'UPI') touch('upiId');
    if (method === 'CARD') ['cardNumber','cardName','expiry','cvv'].forEach(touch);
  }

  qtyAt(i: number) {
    return (this.form.controls.quantities as FormArray<FormControl<number>>).at(i);
  }

  increment(i: number) {
    const ctrl = this.qtyAt(i);
    ctrl.setValue((ctrl.value || 0) + 1);
  }

  decrement(i: number) {
    const ctrl = this.qtyAt(i);
    const val = ctrl.value || 0;
    if (val > 0) ctrl.setValue(val - 1);
  }

  private fallbackImage(name: string): string {
    const map: Record<string, string> = {
      'Margherita Pizza': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
      'Chicken Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
      'Caesar Salad': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
      'Chocolate Brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
      'French Fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
      'Grilled Chicken': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop',
      'Vegetable Soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
      'Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
      'Garlic Bread': 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&h=300&fit=crop',
      'Pasta Carbonara': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop',
      'Fresh Orange Juice': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
      'Cappuccino': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
    };
    return map[name] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop';
  }

  placeOrder() {
    const user = this.auth.user();
    if (!user?.id) {
      this.toast.showError('Please log in again.');
      return;
    }

    const items: { foodItemId: number; quantity: number }[] = [];
    const menu = this.menu();
    const qs = (this.form.controls.quantities as FormArray).value as any[];
    for (let i = 0; i < menu.length; i++) {
      const q = Number(qs[i] ?? 0);
      if (Number.isFinite(q) && q > 0) {
        items.push({ foodItemId: menu[i].id, quantity: q });
      }
    }
    if (!items.length) {
      this.toast.showError('Please select at least one item.');
      return;
    }

    // Determine bookingId
    const bookingId = this.selectedBookingId() ||
                      (this.checkedInBookings().length === 1 ? this.checkedInBookings()[0].bookingId : null);

    if (!bookingId && this.checkedInBookings().length > 1) {
      this.toast.showError('Please select a room to order for.');
      return;
    }

    this.successMessage.set('');
    this.lastOrderId.set(null);
    this.paying.set(true);

    const method = this.form.value.method as 'CASH' | 'CARD' | 'UPI';
    if (!method) { this.form.controls.method.markAsTouched(); this.toast.showError('Select payment method'); return; }
    this.touchRelevant(method);
    if (!this.isValidFor(method)) { this.toast.showError('Check payment details'); return; }

    const orderRequest: any = {
      userId: Number(user.id),
      items,
      paymentMethod: method,
      cardNumber: this.form.value.cardNumber ?? '',
      cardHolderName: this.form.value.cardName ?? '',
      expiry: this.form.value.expiry ?? '',
      cvv: this.form.value.cvv ?? ''
    };
    if (bookingId) {
      orderRequest.bookingId = bookingId;
    }

    this.foodApi.createOrder(orderRequest).subscribe({
      next: (resp) => {
        if (method === 'CARD') {
          this.currentPayment.set(resp);
          this.awaitingOtp.set(true);
          this.otpControl.reset();
        } else {
          this.successMessage.set('Payment method accepted. Your food will arrive in ~10 minutes.');
          this.lastOrderId.set(resp.orderId);
          (this.form.controls.quantities as FormArray).controls.forEach(c => c.setValue(0));
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to create order';
        this.toast.showError(msg);
      },
      complete: () => this.paying.set(false)
    });
  }

  verifyOtp() {
    const payment = this.currentPayment();
    if (!payment?.paymentId) {
      this.toast.showError('No active payment.');
      return;
    }
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid) return;

    this.paying.set(true);
    this.foodApi.verifyPayment({ paymentId: payment.paymentId, otp: String(this.otpControl.value) }).subscribe({
      next: (resp) => {
        if (resp.paymentStatus === 'SUCCESS') {
          this.awaitingOtp.set(false);
          this.currentPayment.set(null);
          this.lastOrderId.set(resp.orderId);
          this.successMessage.set('Payment successful. Your food will arrive in ~10 minutes.');
          // reset quantities
          (this.form.controls.quantities as FormArray).controls.forEach(c => c.setValue(0));
        } else {
          this.toast.showError(resp.message || 'OTP verification failed');
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'OTP verification failed';
        this.toast.showError(msg);
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


