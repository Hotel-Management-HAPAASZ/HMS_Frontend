import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';

import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';

type TimeFilter = 'ALL' | 'CURRENT' | 'PAST';

/* ---------------- Confirm Cancel Dialog (standalone) ---------------- */
@Component({
  standalone: true,
  selector: 'app-confirm-cancel-dialog',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-3" style="min-width: 320px;">
      <h3 class="m-0 mb-2" style="font-weight:800; letter-spacing:-.01em;">Cancel booking?</h3>
      <div class="text-muted" style="font-size:13px;">
        Are you sure you want to cancel this booking? Refund (if eligible) will be issued to the same payment source.
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button mat-stroked-button (click)="close(false)">
          <mat-icon class="me-1">close</mat-icon>
          No
        </button>
        <button mat-raised-button color="warn" (click)="close(true)">
          <mat-icon class="me-1">check</mat-icon>
          Yes, cancel
        </button>
      </div>
    </div>
  `
})
export class ConfirmCancelDialogComponent {
  private ref = inject(MatDialogRef<ConfirmCancelDialogComponent>);
  close(result: boolean) { this.ref.close(result); }
}

/* ------------------------ Main Component ------------------------ */
@Component({
  standalone: true,
  selector: 'app-booking-history',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    ConfirmCancelDialogComponent
  ],
  template: `
  <div class="history-bg">
    <div class="container-fluid p-0">

      <!-- Card -->
      <div class="app-card p-3 p-md-4 history-card">

        <!-- Header -->
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-3">
          <div>
            <div class="kicker">Customer Portal</div>
            <h2 class="fw-bold mb-1 title">Booking History</h2>
            <p class="text-muted mb-0 subtitle">
              Review reservations, manage bookings, and download invoices.
            </p>
          </div>

          <div class="d-flex gap-2 align-items-center">
            <button mat-stroked-button class="btn-soft" (click)="resetFilters()">
              <mat-icon class="me-1">refresh</mat-icon>
              Reset Filters
            </button>
          </div>
        </div>

        <!-- Summary -->
        <div class="row g-2 g-md-3 mb-3">
          <div class="col-12 col-sm-6 col-xl-3">
            <div class="mini app-mini">
              <div class="mini-label">Total</div>
              <div class="mini-value">{{ stats().total }}</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="mini app-mini confirmed">
              <div class="mini-label">Confirmed</div>
              <div class="mini-value">{{ stats().confirmed }}</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="mini app-mini current">
              <div class="mini-label">Current</div>
              <div class="mini-value">{{ stats().current }}</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="mini app-mini past">
              <div class="mini-label">Past</div>
              <div class="mini-value">{{ stats().past }}</div>
            </div>
          </div>
        </div>

        <mat-divider class="mb-3"></mat-divider>

        <!-- Filters (simplified) -->
        <div class="filters mb-2">
          <div class="row g-2 g-md-3 align-items-end">

            <div class="col-12 col-md-4">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Time</mat-label>
                <mat-select [formControl]="form.controls.time">
                  <mat-option value="ALL">All</mat-option>
                  <mat-option value="CURRENT">Current</mat-option>
                  <mat-option value="PAST">Past</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-12 col-md-4">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Sort by</mat-label>
                <mat-select [formControl]="form.controls.sortBy">
                  <mat-option value="CHECKIN_DESC">Check-in (newest)</mat-option>
                  <mat-option value="CHECKIN_ASC">Check-in (oldest)</mat-option>
                  <mat-option value="AMOUNT_DESC">Amount (high → low)</mat-option>
                  <mat-option value="AMOUNT_ASC">Amount (low → high)</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap mt-2" *ngIf="pagedRows().length > 0; else emptyState">
          <table mat-table [dataSource]="pagedRows()" class="w-100 history-table">

            <!-- ROOM -->
            <ng-container matColumnDef="room">
              <th mat-header-cell *matHeaderCellDef>Room</th>
              <td mat-cell *matCellDef="let b; let i = index">
                <span class="strong">{{ roomLabel(b, i) }}</span>
              </td>
            </ng-container>

            <!-- STAY -->
            <ng-container matColumnDef="dates">
              <th mat-header-cell *matHeaderCellDef>Stay</th>
              <td mat-cell *matCellDef="let b">
                <span class="strong">
                  {{ b.fromDate | date:'mediumDate' }} → {{ b.toDate | date:'mediumDate' }}
                </span>
                <span class="state-chip" [ngClass]="isPast(b) ? 'chip-past' : 'chip-current'">
                  {{ isPast(b) ? 'Past' : 'Current' }}
                </span>
              </td>
            </ng-container>

            <!-- AMOUNT -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="text-end">Amount</th>
              <td mat-cell *matCellDef="let b" class="text-end">
                <span class="strong">₹{{ b.totalAmount }}</span>
              </td>
            </ng-container>

            <!-- STATUS -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="col-status text-center">Status</th>
              <td mat-cell *matCellDef="let b" class="col-status text-center">
                <mat-chip class="status-chip"
                          [ngClass]="statusClass(b.status)"
                          selected>
                  <span class="dot"></span>
                  {{ b.status }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- ACTIONS -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="text-end">Actions</th>
              <td mat-cell *matCellDef="let b" class="text-end">
                <div class="actions">
                  <button
                    mat-stroked-button
                    class="btn-soft"
                    (click)="invoice(b.id)"
                    [disabled]="!canInvoice(b)"
                    matTooltip="Invoice is available only for confirmed/paid bookings"
                  >
                    <mat-icon class="me-1">receipt_long</mat-icon>
                    Invoice
                  </button>

                  <button
                    mat-stroked-button
                    class="btn-soft"
                    (click)="modify(b.id)"
                    [disabled]="!canModify(b)"
                    matTooltip="Cannot modify cancelled or past bookings"
                  >
                    <mat-icon class="me-1">edit</mat-icon>
                    Modify
                  </button>

                  <button
                    mat-stroked-button
                    color="warn"
                    (click)="cancel(b.id)"
                    [disabled]="!canCancel(b) || canceling() === ('' + b.id)"
                    matTooltip="Cannot cancel cancelled or past bookings"
                  >
                    <mat-icon class="me-1">close</mat-icon>
                    {{ canceling() === ('' + b.id) ? 'Cancelling...' : 'Cancel' }}
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; let i = index; columns: cols;" class="row-hover"></tr>
          </table>

          <mat-paginator
            class="mt-2"
            [length]="filteredRows().length"
            [pageIndex]="page().pageIndex"
            [pageSize]="page().pageSize"
            [pageSizeOptions]="[5, 10, 25]"
            (page)="onPage($event)"
          ></mat-paginator>
        </div>

        <!-- Empty state -->
        <ng-template #emptyState>
          <div class="empty">
            <div class="empty-ico">📚</div>
            <div class="empty-title">No bookings found</div>
            <div class="empty-sub text-muted">
              Try changing filters, or make a new reservation from Search Rooms.
            </div>
            <div class="mt-3">
              <button mat-raised-button class="btn-primary" (click)="goSearch()">
                <mat-icon class="me-1">search</mat-icon>
                Search Rooms
              </button>
            </div>
          </div>
        </ng-template>

      </div>
    </div>
  </div>
  `,
  styles: [`
    .history-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding: 0;
      border-radius: 18px;
    }

    .history-card{
      border-radius: 18px;
      overflow: hidden;
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
    .subtitle{ max-width: 70ch; }

    /* Mini stats */
    .app-mini{
      border: 1px solid rgba(15,23,42,0.08);
      border-radius: 16px;
      padding: 12px 12px;
      background: rgba(255,255,255,0.8);
      box-shadow: 0 6px 18px rgba(2,8,23,0.06);
    }
    .mini-label{
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
    }
    .mini-value{
      font-size: 20px;
      font-weight: 900;
      margin-top: 4px;
      color: rgba(15,23,42,0.92);
    }
    .app-mini.confirmed{ border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.08); }
    .app-mini.current{ border-color: rgba(6,182,212,0.22); background: rgba(6,182,212,0.08); }
    .app-mini.past{ border-color: rgba(148,163,184,0.28); background: rgba(148,163,184,0.1); }

    /* Table wrap */
    .table-wrap{
      border: 1px solid rgba(15,23,42,0.08);
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
    }

    .history-table th{
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.60);
      background: rgba(15,23,42,0.02);
      padding-top: 12px;
      padding-bottom: 12px;
    }

    .history-table td{
      vertical-align: middle;
      padding-top: 12px;
      padding-bottom: 12px;
    }

    .history-table .col-status{ text-align: center !important; }
    .history-table th.col-status,
    .history-table td.col-status{
      width: 180px;
      white-space: nowrap;
    }

    .row-hover:hover{
      background: rgba(79,70,229,0.035);
    }

    .strong{ font-weight: 900; }

    /* Past/Current state chip beside dates */
    .state-chip{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 10px;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: .02em;
    }
    .chip-current{
      background: rgba(6,182,212,0.10);
      border-color: rgba(6,182,212,0.24);
      color: rgba(12, 110, 120, 0.95);
    }
    .chip-past{
      background: rgba(148,163,184,0.12);
      border-color: rgba(148,163,184,0.28);
      color: rgba(71,85,105,0.95);
    }

    /* Status chip */
    .status-chip{
      border-radius: 999px;
      font-weight: 900;
      letter-spacing: .02em;
      padding: 2px 10px;
      border: 1px solid transparent;
    }
    .status-chip .dot{
      width: 8px;
      height: 8px;
      border-radius: 999px;
      display: inline-block;
      margin-right: 8px;
      vertical-align: middle;
      background: rgba(15,23,42,0.25);
    }
    .chip-paid{
      background: rgba(34,197,94,0.10) !important;
      border-color: rgba(34,197,94,0.22) !important;
      color: rgba(21,128,61,1) !important;
    }
    .chip-paid .dot{ background: rgba(34,197,94,1) !important; }

    .chip-pending{
      background: rgba(245,158,11,0.12) !important;
      border-color: rgba(245,158,11,0.22) !important;
      color: rgba(161,98,7,1) !important;
    }
    .chip-pending .dot{ background: rgba(245,158,11,1) !important; }

    .chip-cancelled{
      background: rgba(239,68,68,0.10) !important;
      border-color: rgba(239,68,68,0.22) !important;
      color: rgba(185,28,28,1) !important;
    }
    .chip-cancelled .dot{ background: rgba(239,68,68,1) !important; }

    .chip-confirmed{
      background: rgba(99,102,241,0.12) !important;
      border-color: rgba(99,102,241,0.24) !important;
      color: rgba(67,56,202,1) !important;
    }
    .chip-confirmed .dot{ background: rgba(99,102,241,1) !important; }

    /* Actions */
    .actions{
      display: inline-flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .btn-soft{
      height: 36px;
      padding: 0 12px;
      border-radius: 12px !important;
      border-color: rgba(15,23,42,0.14) !important;
      background: rgba(255,255,255,0.75) !important;
    }
    .btn-soft:hover{
      border-color: rgba(79,70,229,0.22) !important;
      background: #fff !important;
    }
    .btn-primary{
      background: var(--app-primary) !important;
      color: #fff !important;
      border-radius: 12px !important;
    }

    /* Empty state */
    .empty{
      text-align: center;
      padding: 44px 16px;
      border: 1px dashed rgba(15,23,42,0.16);
      border-radius: 16px;
      background: rgba(255,255,255,0.75);
    }
    .empty-ico{ font-size: 34px; margin-bottom: 10px; }
    .empty-title{ font-weight: 900; font-size: 18px; margin-bottom: 6px; }
    .empty-sub{ max-width: 55ch; margin: 0 auto; font-size: 13px; }
  `]
})
export class BookingHistoryComponent {
  // Columns
  cols = ['room', 'dates', 'amount', 'status', 'actions'];

  // Pagination
  page = signal({ pageIndex: 0, pageSize: 5 });

  // Cancelling indicator (bookingId string)
  canceling = signal<string | null>(null);

  // Simplified filters (no search, no date-range, no min/max amount)
  form = new FormGroup({
    time: new FormControl<TimeFilter>('ALL', { nonNullable: true }),
    sortBy: new FormControl<'CHECKIN_DESC' | 'CHECKIN_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>(
      'CHECKIN_DESC', { nonNullable: true })
  });

  // Reactive form → signal
  formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  constructor(
    private auth: AuthService,
    private bookings: BookingService,
    private rooms: RoomService,
    private router: Router,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  // Pull rows for current user
  rows = computed(() => {
    const u = this.auth.user();
    if (!u) return [];
    const userId = Number((u as any).id);
    if (!Number.isFinite(userId)) return [];
    return (this.bookings.listByUser(userId) ?? []).slice();
  });

  // Helpers: Today (start of day)
  private todayStart(): number {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  // Past check based on checkout date
  isPast(b: any) {
    const co = b?.toDate ? new Date(b.toDate).getTime() : undefined;
    if (!co) return false;
    return co < this.todayStart();
  }

  // Summary stats
  stats = computed(() => {
    const all = this.rows();
    const confirmed = all.filter(b =>
      (String(b.status).toUpperCase() === 'PAID') ||
      (String(b.status).toUpperCase() === 'CONFIRMED')
    ).length;

    const past = all.filter(b => this.isPast(b)).length;
    const current = all.length - past;

    return {
      total: all.length,
      confirmed,
      current,
      past
    };
  });

  // Filtering + sorting
  filteredRows = computed(() => {
    const all = this.rows();
    const v = this.formValue();
    if (!all.length) return [];

    const time = (v.time ?? 'ALL') as TimeFilter;

    let out = all.filter(b => {
      const past = this.isPast(b);
      const matchesTime =
        time === 'ALL' ? true :
        time === 'PAST' ? past : !past;
      return matchesTime;
    });

    // Sorting (kept)
    const sort = v.sortBy ?? 'CHECKIN_DESC';
    out.sort((a, b) => {
      const aIn = a.fromDate ? new Date(a.fromDate).getTime() : 0;
      const bIn = b.fromDate ? new Date(b.fromDate).getTime() : 0;
      const aAmt = Number(a.totalAmount ?? 0);
      const bAmt = Number(b.totalAmount ?? 0);

      switch (sort) {
        case 'CHECKIN_ASC': return aIn - bIn;
        case 'CHECKIN_DESC': return bIn - aIn;
        case 'AMOUNT_ASC': return aAmt - bAmt;
        case 'AMOUNT_DESC': return bAmt - aAmt;
        default: return bIn - aIn;
      }
    });

    return out;
  });

  // Page slice
  pagedRows = computed(() => {
    const list = this.filteredRows();
    const { pageIndex, pageSize } = this.page();
    const start = pageIndex * pageSize;
    return list.slice(start, start + pageSize);
  });

  onPage(e: PageEvent) {
    this.page.set({ pageIndex: e.pageIndex, pageSize: e.pageSize });
  }

  resetFilters() {
    this.form.reset({
      time: 'ALL',
      sortBy: 'CHECKIN_DESC'
    });
    this.page.set({ pageIndex: 0, pageSize: this.page().pageSize });
  }

  // Room label with fallback: Room X if name not resolvable
  roomLabel(b: any, index: number) {
    const label = this.roomName(b?.roomId);
    return label || `Room ${index + 1}`;
  }

  // Accept string | number
  roomName(roomId: string | number) {
    const id = typeof roomId === 'number' ? String(roomId) : roomId;
    return this.rooms.byId(id)?.name ?? '';
  }

  // Status chip classes with background colors
  statusClass(status: string) {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID') return 'chip-paid';
    if (s === 'PENDING') return 'chip-pending';
    if (s === 'CANCELLED') return 'chip-cancelled';
    if (s === 'CONFIRMED') return 'chip-confirmed';
    return '';
  }

  // Actions logic
  canInvoice(b: any) {
    const s = String(b?.status || '').toUpperCase();
    return s === 'PAID' || s === 'CONFIRMED';
  }

  private lockPastBookings = true;

  private isPastOrToday(fromDate: any) {
    if (!fromDate) return false;
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    const today = this.todayStart();
    return d.getTime() <= today;
  }

  canModify(b: any) {
    if (!b) return false;
    const s = String(b.status || '').toUpperCase();
    if (s === 'CANCELLED') return false;
    if (this.lockPastBookings && this.isPast(b)) return false;
    return true;
  }

  canCancel(b: any) {
    if (!b) return false;
    const s = String(b.status || '').toUpperCase();
    if (s === 'CANCELLED') return false;
    if (this.lockPastBookings && this.isPast(b)) return false;
    return true;
  }

  invoice(id: string) {
    this.router.navigateByUrl(`/customer/invoice?bookingId=${id}`);
  }

  modify(id: string | number) {
  this.router.navigateByUrl(`/customer/modify?bookingId=${id}`, {
    state: { bookingId: id }
  } as any);
}

  // Updated: confirm -> call API; ensure at least 3s buffer before success toast
  cancel(id: string | number) {
    const idStr = String(id);

    const ref = this.dialog.open(ConfirmCancelDialogComponent, {
      disableClose: true
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.canceling.set(idStr);

      const start = Date.now();
      this.snack.open('Processing refund...', undefined, { duration: 3000 });

      this.bookings.cancelBooking(idStr).subscribe({
        next: (msg: any) => {
          const elapsed = Date.now() - start;
          const wait = Math.max(0, 3000 - elapsed);

          setTimeout(() => {
            // Optimistic update + optional refresh
            this.bookings.markCancelledLocally(idStr);

            const u = this.auth.user();
            if (u && (u as any).id != null) {
              const userId = Number((u as any).id);
              if (Number.isFinite(userId)) {
                this.bookings.loadForUser(userId);
              }
            }

            this.snack.open('Refund Completed', 'Close', { duration: 3500 });
            this.canceling.set(null);
          }, wait);
        },
        error: (err) => {
          console.error('[Cancel] failed', err);
          this.snack.open(
            err?.error ?? err?.message ?? 'Unable to cancel booking.',
            'Close',
            { duration: 4000 }
          );
          this.canceling.set(null);
        }
      });
    });
  }

  goSearch() {
    this.router.navigateByUrl(`/customer/search`);
  }
}

