import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { InvoiceService, InvoiceResponse } from '../../../core/services/invoice.service';
import { lastValueFrom } from 'rxjs';
import { generateInvoicePdf, triggerDownload } from '../../../shared/invoice-pdf';

/** Render-friendly view model */
type UiInvoice = Partial<{
  invoiceNo: string;
  status: 'PAID' | 'UNPAID' | 'REFUNDED';
  issuedAt: string | Date;
  dueAt: string | Date;
  customerName: string;
  email: string;
  phone: string;
  customerId: string;
  billingAddress: string;
  bookingId: number | string;
  paymentMethod: string;
  transactionId: string;
  gstin: string;
  roomName: string;
  fromDate: string | Date;
  toDate: string | Date;
  nights: number;
  guests: number;
  currency: string;
  subtotal: number;
  taxes: number;
  fees: number;
  discount: number;
  amount: number;
  notes: string;
  terms: string;
}>;

@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
  <div class="invoice-wrap">
    <div class="app-card p-3 p-md-4 invoice-card" *ngIf="inv; else unavailable">
      <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 header">
        <div>
          <div class="kicker">Billing</div>
          <h2 class="fw-bold m-0 title">Invoice</h2>
          <div class="text-muted small mt-1">
            <span class="me-2">Invoice No:</span>
            <span class="fw-semibold">{{ inv?.invoiceNo || '—' }}</span>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <span class="status-chip" [class.paid]="inv?.status === 'PAID'"
                                    [class.unpaid]="inv?.status !== 'PAID'">
            {{ inv?.status || 'PAID' }}
          </span>
          <button mat-raised-button class="btn-app" (click)="download()">Download PDF</button>
          <button mat-stroked-button class="btn-app" (click)="print()">Print</button>
        </div>
      </div>

      <hr class="sep"/>

      <div class="row g-3 meta">
        <div class="col-12 col-md-6">
          <div class="meta-card">
            <div class="meta-label">Bill To</div>
            <div class="meta-value fw-semibold">
              {{ inv?.customerName || '—' }}
              <ng-container *ngIf="inv?.email"> ({{ inv?.email }})</ng-container>
            </div>
            <div class="text-muted small" *ngIf="inv?.phone">Phone: {{ inv?.phone }}</div>
            <div class="text-muted small" *ngIf="inv?.customerId">Customer ID: {{ inv?.customerId }}</div>
            <div class="text-muted small" *ngIf="inv?.billingAddress">
              {{ inv?.billingAddress }}
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <div class="meta-card">
            <div class="meta-label">Invoice Meta</div>
            <div class="meta-grid">
              <div>Issued</div>
              <div class="text-end">{{ inv?.issuedAt | date:'medium' }}</div>

              <div *ngIf="inv?.dueAt">Due</div>
              <div class="text-end" *ngIf="inv?.dueAt">{{ inv?.dueAt | date:'mediumDate' }}</div>

              <div>Booking ID</div>
              <div class="text-end">{{ inv?.bookingId || bookingId() || '—' }}</div>

              <div *ngIf="inv?.paymentMethod">Payment</div>
              <div class="text-end" *ngIf="inv?.paymentMethod">{{ inv?.paymentMethod }}</div>

              <div *ngIf="inv?.transactionId">Txn ID</div>
              <div class="text-end" *ngIf="inv?.transactionId">{{ inv?.transactionId }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12">
          <div class="meta-card">
            <div class="meta-label">Stay Details</div>
            <div class="meta-grid">
              <div>Room</div>
              <div class="text-end">{{ inv?.roomName || '—' }}</div>

              <div>From</div>
              <div class="text-end">{{ inv?.fromDate | date:'mediumDate' }}</div>

              <div>To</div>
              <div class="text-end">{{ inv?.toDate | date:'mediumDate' }}</div>

              <div>Nights</div>
              <div class="text-end">{{ inv?.nights ?? '—' }}</div>

              <div *ngIf="inv?.guests != null">Guests</div>
              <div class="text-end" *ngIf="inv?.guests != null">{{ inv?.guests }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-lg-7">
          <div class="note-card" *ngIf="inv?.notes || inv?.terms">
            <div class="meta-label mb-1">Notes</div>
            <div class="text-muted small" *ngIf="inv?.notes">{{ inv?.notes }}</div>
            <div class="text-muted small" *ngIf="inv?.terms">Terms: {{ inv?.terms }}</div>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="total-card">
            <div class="total-row" *ngIf="inv?.subtotal != null">
              <span>Subtotal</span>
              <span>{{ inv?.subtotal | currency:(inv?.currency || 'INR'):'symbol-narrow' }}</span>
            </div>

            <div class="total-row" *ngIf="inv?.taxes != null">
              <span>Taxes</span>
              <span>{{ inv?.taxes | currency:(inv?.currency || 'INR'):'symbol-narrow' }}</span>
            </div>

            <div class="total-row" *ngIf="inv?.fees != null">
              <span>Fees</span>
              <span>{{ inv?.fees | currency:(inv?.currency || 'INR'):'symbol-narrow' }}</span>
            </div>

            <div class="total-row" *ngIf="inv?.discount != null">
              <span>Discount</span>
              <span>-{{ inv?.discount | currency:(inv?.currency || 'INR'):'symbol-narrow' }}</span>
            </div>

            <div class="total-row grand">
              <span>Total Paid</span>
              <span class="fw-bold">
                {{ inv?.amount | currency:(inv?.currency || 'INR'):'symbol-narrow' }}
              </span>
            </div>

            <div class="text-muted x-small text-end" *ngIf="inv?.amount && inv?.currency">
              Includes all applicable taxes & fees
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #unavailable>
      <div class="app-card p-3 p-md-4 invoice-card empty">
        <h5 class="fw-bold mb-1">Invoice unavailable</h5>
        <div class="text-muted">
          {{ errorMsg() || 'Ensure the booking is PAID and a valid bookingId is present in the URL.' }}
        </div>
      </div>
    </ng-template>
  </div>
  `,
  styles: [`
    .invoice-card{
      border-radius: 18px;
      border: 1px solid var(--app-border);
      background: var(--app-card);
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
    }
    .header .title{ letter-spacing: -0.01em; }
    .kicker{
      display:inline-flex; align-items:center; gap:8px;
      font-size:12px; font-weight:800; letter-spacing:.08em;
      text-transform:uppercase; color:rgba(15,23,42,0.55);
    }
    .status-chip{
      display:inline-flex; align-items:center; gap:8px;
      padding:6px 10px; border-radius:999px;
      border:1px solid rgba(15,23,42,0.08);
      background:rgba(15,23,42,0.02);
      font-weight:700; color:rgba(15,23,42,0.7);
      text-transform:uppercase; font-size:12px;
    }
    .status-chip.paid{
      background: rgba(34,197,94,0.10);
      border-color: rgba(34,197,94,0.18);
      color: rgba(15,23,42,0.8);
    }
    .status-chip.unpaid{
      background: rgba(245,158,11,0.12);
      border-color: rgba(245,158,11,0.22);
      color: rgba(15,23,42,0.85);
    }
    .btn-app{
      background-color: var(--app-primary) !important;
      border-color: var(--app-primary) !important;
      color:#fff !important;
    }
    .sep{ border:none; border-top:1px solid var(--app-border); margin:12px 0 16px; }

    .meta-card{
      border:1px solid var(--app-border);
      border-radius:14px;
      padding:14px;
      background:rgba(255,255,255,0.7);
    }
    .meta-label{
      font-size:12px; font-weight:800; letter-spacing:.06em;
      text-transform:uppercase; color:rgba(15,23,42,0.55);
      margin-bottom:6px;
    }
    .meta-grid{
      display:grid;
      grid-template-columns: 1fr auto;
      gap:8px 14px;
      align-items:center;
      font-size:14px;
    }

    .total-card{ border:1px solid var(--app-border); border-radius:14px; padding:12px; background:#fff; }
    .total-row{ display:flex; align-items:center; justify-content:space-between; padding:8px 4px; color:rgba(15,23,42,0.85); }
    .total-row.grand{
      margin-top:6px; border-top:1px dashed rgba(15,23,42,0.15); padding-top:12px;
      font-size:16px; font-weight:900; color:rgba(15,23,42,0.92);
    }
    .note-card{ border:1px dashed rgba(15,23,42,0.18); border-radius:14px; padding:12px; background:rgba(255,255,255,0.02); }
    .x-small{ font-size:11px; }

    @media print {
      :root{ --app-bg:#fff; }
      body{ background:#fff !important; }
      app-sidebar, app-topbar, mat-sidenav, .sidebar, .topbar, .dash-bg { display:none !important; }
      .invoice-card{ box-shadow:none !important; border:none !important; padding:0 !important; }
      .btn-app, .status-chip{ display:none !important; }
      .meta-card, .total-card{ border-color: rgba(0,0,0,0.2) !important; }
      .sep{ border-top-color: rgba(0,0,0,0.15) !important; }
      @page { size: A4; margin: 16mm; }
    }
  `]
})
export class InvoiceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invoices = inject(InvoiceService);

  // store any backend error to show in the empty template
  private _errorMsg = signal<string | null>(null);
  errorMsg = computed(() => this._errorMsg());

  // the booking id discovery
  bookingId = computed(() => {
    // 1) query ?bookingId=...
    const q = this.route.snapshot.queryParamMap.get('bookingId');
    if (q) return q;

    // 2) path param /customer/invoice/:bookingId
    const p = this.route.snapshot.paramMap.get('bookingId');
    if (p) return p;

    // 3) navigation extras state
    const s = history.state?.bookingId;
    if (s) return String(s);

    // 4) last remembered
    const last = localStorage.getItem('lastBookingId');
    if (last) return last;

    return '';
  });

  // render-friendly VM
  invoice = signal<UiInvoice | null>(null);

  // raw API response for PDF
  raw = signal<InvoiceResponse | null>(null);

  get inv(): UiInvoice | null {
    return this.invoice();
  }

  async ngOnInit() {
    const id = this.bookingId();
    if (!id) {
      this._errorMsg.set('Missing bookingId.'); // will trigger “Invoice unavailable”
      return;
    }

    try {
      localStorage.setItem('lastBookingId', String(id)); // remember for future
      const data: InvoiceResponse = await lastValueFrom(this.invoices.getInvoice(id));
      this.raw.set(data);
      this.invoice.set(mapToUiInvoice(data));

      // 🔽 Auto-download immediately
      await this.download();
    } catch (e: any) {
      console.error('Failed to load invoice', e);
      this._errorMsg.set(e?.error?.message ?? e?.message ?? 'Unable to fetch invoice.');
      this.invoice.set(null);
      this.raw.set(null);
    }
  }

  print() {
    window.print();
  }

  async download() {
    const src = this.raw();
    if (!src) { alert('Invoice not loaded yet.'); return; }

    try {
      const blob = await generateInvoicePdf({
        invoiceNumber: src.invoiceNumber,
        bookingId: src.bookingId,
        hotelName: src.hotelName,
        hotelAddress: src.hotelAddress,
        hotelEmail: src.hotelEmail,
        hotelSupportNumber: src.hotelSupportNumber,
        customerName: src.customerName,
        customerEmail: src.customerEmail,
        customerMobile: src.customerMobile,
        checkInDate: src.checkInDate,
        checkOutDate: src.checkOutDate,
        rooms: src.rooms,
        baseAmount: src.baseAmount,
        taxAmount: src.taxAmount,
        serviceCharges: src.serviceCharges,
        totalAmount: src.totalAmount,
        paymentMethod: src.paymentMethod,
        transactionId: src.transactionId
      });
      const fileName = `Invoice_${src.invoiceNumber ?? src.bookingId}.pdf`;
      triggerDownload(blob, fileName);
    } catch (err) {
      console.error('[Invoice] PDF generation failed', err);
      alert('Failed to generate invoice PDF. Please try again.');
    }
  }
}

/** Mapper */
function mapToUiInvoice(inv: InvoiceResponse): UiInvoice {
  const nights = diffNights(inv.checkInDate, inv.checkOutDate);
  const roomName = (inv.roomTypes && inv.roomTypes.length)
    ? inv.roomTypes.join(', ')
    : (inv.rooms && inv.rooms.length ? inv.rooms.map(r => r.roomType).filter(Boolean).join(', ') : undefined);

  const guests = inv.numberOfGuests ?? ((inv.adults ?? 0) + (inv.children ?? 0));

  return {
    invoiceNo: inv.invoiceNumber ?? undefined,
    status: inv.paidAt ? 'PAID' : 'UNPAID',
    issuedAt: inv.paidAt ?? undefined,
    customerName: inv.customerName ?? undefined,
    email: inv.customerEmail ?? undefined,
    phone: inv.customerMobile ?? undefined,
    bookingId: inv.bookingId ?? undefined,
    paymentMethod: inv.paymentMethod ?? undefined,
    transactionId: inv.transactionId ?? undefined,
    roomName,
    fromDate: inv.checkInDate ?? undefined,
    toDate: inv.checkOutDate ?? undefined,
    nights: nights ?? undefined,
    guests: guests ?? undefined,
    currency: 'INR',
    subtotal: inv.baseAmount ?? undefined,
    taxes: inv.taxAmount ?? undefined,
    fees: inv.serviceCharges ?? undefined,
    discount: undefined,
    amount: inv.totalAmount ?? undefined,
    notes: undefined,
    terms: undefined,
  };
}

function diffNights(from?: string, to?: string): number | undefined {
  if (!from || !to) return undefined;
  const d1 = new Date(from);
  const d2 = new Date(to);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return undefined;
  const ms = d2.getTime() - d1.getTime();
  return ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : 0;
}
