import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { generateInvoicePdf, triggerDownload } from '../../../shared/invoice-pdf';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
  <div class="wrap">
  <div class="payment-card">

    <!-- SUCCESS BADGE -->
    <div class="success-badge">
      <div class="tick">✓</div>
    </div>

    <!-- TITLE -->
    <h1 class="heading">Payment Successful</h1>
    <p class="subheading">
      Your payment has been processed securely.  
      Thank you for choosing our service!
    </p>

    <!-- DETAILS -->
    <div class="details-box">
      <div class="detail">
        <span class="label">Booking ID</span>
        <span class="value">{{ bookingId() }}</span>
      </div>

      <div class="detail" *ngIf="paymentId()">
        <span class="label">Payment ID</span>
        <span class="value">{{ paymentId() }}</span>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="actions">
      <button mat-raised-button color="primary" class="btn-main" (click)="downloadInvoice()">
        Download Invoice
      </button>

      <button mat-stroked-button class="btn-secondary" (click)="goMyBookings()">
        View My Bookings
      </button>
    </div>

  </div>
</div>
  `,
  styles: [`
    /* ===== Center Layout ===== */
.wrap {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--app-bg);
  padding: 32px;
}

/* ===== Main Card ===== */
.payment-card {
  width: 100%;
  max-width: 550px;
  text-align: center;
  padding: 48px 36px;
  border-radius: 22px;

  background: linear-gradient(145deg, #ffffff, #f3f6ff);
  border: 1px solid var(--app-border);
  box-shadow:
    0 12px 32px rgba(2, 8, 23, 0.08),
    0 4px 12px rgba(2, 8, 23, 0.04);

  animation: fadeIn 0.6s ease;
}

/* Smooth entrance */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== Success Badge ===== */
.success-badge {
  width: 95px;
  height: 95px;
  border-radius: 50%;
  margin: 0 auto 20px;

  background: radial-gradient(
    circle at 40% 40%,
    rgba(34, 197, 94, 0.20),
    rgba(34, 197, 94, 0.10)
  );

  border: 2px solid rgba(34, 197, 94, 0.40);
  display: flex;
  justify-content: center;
  align-items: center;

  animation: popIn 0.5s ease;
}

@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.tick {
  color: var(--app-success);
  font-size: 46px;
  font-weight: 900;
}

/* ===== Text Styles ===== */
.heading {
  font-size: 28px;
  font-weight: 900;
  margin: 10px 0 8px;
  color: var(--app-text);
}

.subheading {
  color: rgba(15,23,42,0.7);
  font-size: 15px;
  margin-bottom: 28px;
}

/* ===== Details Box ===== */
.details-box {
  background: rgba(255,255,255,0.6);
  border-radius: 16px;
  padding: 18px 14px;
  border: 1px solid var(--app-border);
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.04);
  margin-bottom: 30px;
}

.detail {
  display: flex;
  justify-content: space-between;
  padding: 10px 8px;
  font-size: 15px;
}

.label {
  color: rgba(15,23,42,0.6);
  font-weight: 600;
}

.value {
  font-weight: 800;
  color: var(--app-text);
}

/* ===== Actions ===== */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.btn-main {
  border-radius: 10px !important;
  padding: 10px 22px !important;
  font-weight: 600;
}

.btn-secondary {
  border-radius: 10px !important;
  padding: 10px 22px !important;
  border-color: var(--app-primary) !important;
  color: var(--app-primary) !important;
}

.btn-secondary:hover {
  background: rgba(79,70,229,0.08);
}

/* ===== Mobile ===== */
@media (max-width: 480px) {
  .payment-card {
    padding: 32px 20px;
  }

  .heading {
    font-size: 24px;
  }

  .success-badge {
    width: 82px;
    height: 82px;
  }

  .tick {
    font-size: 36px;
  }
}
  `]
})
export class PaymentResultComponent {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  bookingId = computed(() => this.route.snapshot.queryParamMap.get('bookingId') ?? '');
  paymentId = computed(() => this.route.snapshot.queryParamMap.get('paymentId') ?? '');

  async downloadInvoice() {
  const bookingId = this.bookingId();
  if (!bookingId) {
    this.toast.showError('Unable to download invoice: Missing booking ID.');
    return;
  }

  try {
    // FULL URL → works ALWAYS (no proxy needed)
    const url = `http://localhost:8080/api/invoices/booking/${bookingId}`;

    console.log("[Invoice] Calling:", url);

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json(); // This will NOW work

    // Generate PDF
    const blob = await generateInvoicePdf(data);

    // Filename
    const fileName = data?.invoiceNumber
      ? `Invoice_${data.invoiceNumber}.pdf`
      : `Invoice_Booking_${bookingId}.pdf`;

    // Auto download
    triggerDownload(blob, fileName);

  } catch (err) {
    console.error("Invoice download failed:", err);
    this.toast.showError('Invoice download failed. Please try again later.');
  }
}


  goMyBookings() {
    this.router.navigateByUrl('/customer/history');
  }
}

