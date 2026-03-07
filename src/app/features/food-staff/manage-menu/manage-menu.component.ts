import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FoodApiService, FoodMenuItem } from '../../../core/services/food-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
  <div class="container py-3">
    <div class="row g-3">
      <div class="col-12 col-lg-5">
        <mat-card class="p-3">
          <h3 class="fw-bold mb-2">Add / Update Menu Item</h3>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Category</mat-label>
              <input matInput formControlName="category">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Price</mat-label>
              <input matInput type="number" min="0" formControlName="price">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Description</mat-label>
              <input matInput formControlName="description">
            </mat-form-field>

            <div class="d-flex gap-2">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Save</button>
              <button mat-stroked-button type="button" (click)="reset()">Clear</button>
            </div>
          </form>
        </mat-card>
      </div>

      <div class="col-12 col-lg-7">
        <mat-card class="p-3">
          <h3 class="fw-bold mb-2">Current Menu</h3>
          <div class="text-muted small" *ngIf="loading()">Loading...</div>
          <div class="text-muted small" *ngIf="!loading() && items().length === 0">No items yet.</div>

          <div class="list" *ngIf="items().length">
            <div class="row-item" *ngFor="let it of items()">
              <div>
                <div class="fw-semibold">{{ it.name }}</div>
                <div class="text-muted small">{{ it.category }} • ₹{{ it.price }}</div>
              </div>
              <div class="d-flex gap-2">
                <button mat-stroked-button (click)="edit(it)">Edit</button>
                <button mat-stroked-button color="warn" (click)="delete(it.id)">Delete</button>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .list{ display:grid; gap:10px; }
    .row-item{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px; border:1px solid rgba(15,23,42,0.08); border-radius:14px; }
  `]
})
export class ManageMenuComponent implements OnInit {
  private api = inject(FoodApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  items = signal<FoodMenuItem[]>([]);
  editingId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['Main', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.api.getMenu().subscribe({
      next: (res) => this.items.set(res ?? []),
      error: () => this.items.set([]),
      complete: () => this.loading.set(false)
    });
  }

  edit(it: FoodMenuItem) {
    this.editingId.set(it.id);
    this.form.patchValue({
      name: it.name,
      category: it.category || 'Main',
      price: it.price,
      description: it.description || ''
    });
  }

  reset() {
    this.editingId.set(null);
    this.form.reset({ name: '', category: 'Main', price: 0, description: '' });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: FoodMenuItem = {
      id: this.editingId() ?? 0,
      name: this.form.value.name!,
      category: this.form.value.category!,
      price: this.form.value.price!,
      description: this.form.value.description || '',
      available: true
    };

    const obs = this.editingId()
      ? this.api.updateMenuItem(this.editingId()!, payload)
      : this.api.createMenuItem(payload);

    obs.subscribe({
      next: () => {
        this.toast.showSuccess(`Menu item ${this.editingId() ? 'updated' : 'created'} successfully`);
        this.reset();
        this.reload();
      },
      error: (err) => {
        this.toast.showError(err?.error?.message || 'Failed to save menu item');
      }
    });
  }

  delete(id: number) {
    if (!confirm('Delete this menu item?')) return;
    this.api.deleteMenuItem(id).subscribe({
      next: () => {
        this.toast.showSuccess('Menu item deleted');
        this.reload();
      },
      error: (err) => {
        this.toast.showError(err?.error?.message || 'Failed to delete menu item');
      }
    });
  }
}


