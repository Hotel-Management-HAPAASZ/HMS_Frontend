import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { generateInvoicePdf, triggerDownload } from '../../../shared/invoice-pdf';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
  <div class="wrap">

    <mat-card class="panel">

      <!-- ICON -->
      <div class="icon success">✅</div>

      <!-- TITLE -->
      <h2 class="title">Payment Successful</h2>
      <p class="msg">Your payment has been confirmed. Thank you!</p>

      <!-- BOOKING INFO -->
      <div class="info">
        <div>Booking ID: <b>{{ bookingId() }}</b></div>
        <div *ngIf="paymentId()">Payment ID: <b>{{ paymentId() }}</b></div>
      </div>

      <!-- BUTTONS -->
      <div class="actions">
        <button mat-raised-button color="primary" (click)="downloadInvoice()">
          Download Invoice
        </button>

        <button mat-stroked-button (click)="goMyBookings()">
          Go to My Bookings
        </button>
      </div>

    </mat-card>
  </div>
  `,
  styles: [`
    .wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: var(--app-bg);
      padding: 24px;
    }
    .panel { max-width: 600px; text-align: center; padding: 32px 28px; }
    .icon { font-size: 56px; margin-bottom: 6px; }
    .icon.success { color: #16a34a; }
    .title { margin: 10px 0 6px; font-weight: 900; }
    .msg { color: rgba(15,23,42,.75); margin-bottom: 12px; }
    .info { margin: 12px 0; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .actions { margin-top: 16px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class PaymentResultComponent {

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  bookingId = computed(() => this.route.snapshot.queryParamMap.get('bookingId') ?? '');
  paymentId = computed(() => this.route.snapshot.queryParamMap.get('paymentId') ?? '');

  async downloadInvoice() {
  const bookingId = this.bookingId();
  if (!bookingId) {
    alert("Missing bookingId");
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
    alert("Invoice download failed. Check console.");
  }
}


  goMyBookings() {
    this.router.navigateByUrl('/customer/history');
  }
}
