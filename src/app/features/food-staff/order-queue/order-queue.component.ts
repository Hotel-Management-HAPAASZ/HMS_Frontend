import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { FoodApiService, FoodOrder } from '../../../core/services/food-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule, DatePipe],
  template: `
  <div class="container py-3">
    <div class="app-card p-3 p-md-4 mb-3">
      <h2 class="fw-bold mb-1">Order Queue</h2>
      <div class="text-muted small">Manage pending food orders and update their status.</div>
    </div>

    <div class="app-card p-3 p-md-4" *ngIf="loading()">
      Loading orders...
    </div>

    <div class="text-muted small" *ngIf="!loading() && orders().length === 0">
      No pending orders.
    </div>

    <div class="row g-3" *ngIf="!loading() && orders().length">
      <div class="col-12 col-lg-6" *ngFor="let order of orders()">
        <div class="order-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-bold">Order #{{ order.orderId }}</div>
              <div class="text-muted small" *ngIf="order.roomNumbers?.length">
                Room: <b>{{ order.roomNumbers?.join(', ') }}</b>
              </div>
              <div class="text-muted small">{{ order.createdAt | date:'short' }}</div>
            </div>
            <mat-chip-set>
              <mat-chip [class]="'status-' + order.status.toLowerCase().replace('_', '-')">
                {{ order.status }}
              </mat-chip>
            </mat-chip-set>
          </div>

          <div class="order-items mb-2">
            <div class="item-row" *ngFor="let item of order.items">
              <span>{{ item.name }} × {{ item.quantity }}</span>
              <span class="text-muted">₹{{ item.lineTotal }}</span>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-bold">Total: ₹{{ order.totalAmount }}</div>
            <div class="text-muted small" *ngIf="order.expectedDeliveryAt">
              ETA: {{ order.expectedDeliveryAt | date:'short' }}
            </div>
          </div>

          <div class="d-flex gap-2 flex-wrap">
            <button mat-raised-button color="primary" size="small"
                    *ngIf="order.status === 'NEW'"
                    (click)="updateStatus(order.orderId, 'PREPARING')">
              Start Preparing
            </button>
            <button mat-raised-button color="accent" size="small"
                    *ngIf="order.status === 'PREPARING'"
                    (click)="updateStatus(order.orderId, 'ON_THE_WAY')">
              Mark On The Way
            </button>
            <button mat-raised-button color="primary" size="small"
                    *ngIf="order.status === 'ON_THE_WAY'"
                    (click)="updateStatus(order.orderId, 'DELIVERED')">
              Mark Delivered
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .order-card {
      padding: 16px;
      border: 1px solid rgba(15,23,42,0.08);
      border-radius: 14px;
      background: #fff;
    }
    .order-items {
      padding: 12px;
      background: rgba(15,23,42,0.02);
      border-radius: 8px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    mat-chip {
      font-size: 11px;
      font-weight: 700;
    }
    .status-new { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .status-preparing { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .status-on-the-way { background: rgba(139,92,246,0.15); color: #8b5cf6; }
    .status-delivered { background: rgba(34,197,94,0.15); color: #22c55e; }
  `]
})
export class OrderQueueComponent implements OnInit {
  private api = inject(FoodApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  orders = signal<FoodOrder[]>([]);

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.api.getPendingOrders().subscribe({
      next: (res) => this.orders.set(res ?? []),
      error: () => {
        this.orders.set([]);
        this.toast.showError('Failed to load orders');
      },
      complete: () => this.loading.set(false)
    });
  }

  updateStatus(orderId: number, status: string) {
    this.api.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        this.toast.showSuccess(`Order status updated to ${status}`);
        this.reload();
      },
      error: (err) => {
        this.toast.showError(err?.error?.message || 'Failed to update order status');
      }
    });
  }
}

