import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FoodApiService, FoodOrder } from '../../../core/services/food-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatButtonModule, MatIconModule, DatePipe, RouterLink],
  template: `
  <div class="container py-3">
    <div class="app-card p-3 p-md-4 mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="fw-bold mb-1">My Food Orders</h2>
          <div class="text-muted small">View your past and current food orders.</div>
        </div>
        <button mat-stroked-button color="primary" (click)="refresh()">
          <mat-icon style="margin-right: 4px; font-size: 18px; width: 18px; height: 18px;">refresh</mat-icon>
          Refresh
        </button>
      </div>
    </div>

    <div class="app-card p-3 p-md-4" *ngIf="loading()">
      Loading orders...
    </div>

    <div class="text-muted small" *ngIf="!loading() && orders().length === 0">
      No orders yet. <a routerLink="/customer/food">Order food now</a>.
    </div>

    <div class="row g-3" *ngIf="!loading() && orders().length">
      <div class="col-12" *ngFor="let order of orders()">
        <div class="order-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-bold">Order #{{ order.orderId }}</div>
              <div class="text-muted small" *ngIf="order.roomNumbers?.length">
                Room: <b>{{ order.roomNumbers?.join(', ') }}</b>
              </div>
              <div class="text-muted small">{{ order.createdAt | date:'medium' }}</div>
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

          <div class="d-flex justify-content-between align-items-center">
            <div class="fw-bold">Total: ₹{{ order.totalAmount }}</div>
            <div class="text-muted small" *ngIf="order.expectedDeliveryAt">
              Expected: {{ order.expectedDeliveryAt | date:'short' }}
            </div>
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
    .status-awaiting-payment { background: rgba(239,68,68,0.15); color: #ef4444; }
  `]
})
export class FoodHistoryComponent implements OnInit {
  private api = inject(FoodApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(true);
  orders = signal<FoodOrder[]>([]);

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user?.id) {
      this.toast.showError('User not found');
      return;
    }
    this.loadOrders(Number(user.id));
  }

  refresh() {
    const user = this.auth.user();
    if (user?.id) {
      this.loadOrders(Number(user.id));
    }
  }

  loadOrders(userId: number) {
    this.loading.set(true);
    this.api.myOrders(userId).subscribe({
      next: (res) => this.orders.set(res ?? []),
      error: () => {
        this.orders.set([]);
        this.toast.showError('Failed to load orders');
      },
      complete: () => this.loading.set(false)
    });
  }
}

