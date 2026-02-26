import { Component, ViewChild, AfterViewInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormGroup,
  FormControl,
  AbstractControl,
  ValidatorFn,
  ValidationErrors
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';

import { ApiUserService, BackendUser, CreateUserRequest } from '../../../core/services/api-user.service';

// Only CUSTOMER role is supported for customers now
type RoleFilter = '' | 'CUSTOMER';
type StatusFilter = '' | 'ACTIVE' | 'INACTIVE';

// UI-only row shape (do NOT extend your core User model that needs password)
type CustomerRow = {
  id: string | number;
  fullName: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER';
  active: boolean;
  createdAt?: string | number | Date;
};

@Component({
  standalone: true,
  selector: 'app-manage-customers',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Admin Portal</div>
            <h2 class="fw-bold mb-1 title">Manage Customers</h2>
            <p class="text-muted mb-0">
              Add, search and manage customer accounts with validations and status controls.
            </p>
          </div>

          <!-- <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">Total:</span>
            <span class="small fw-semibold">{{ totalCustomers() }}</span>
          </div> -->
        </div>
      </div>

      <!-- FILTERS -->
      <div class="app-card p-3 p-md-4 mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="fw-bold mb-0">Quick Filters</h5>
          <span class="badge text-bg-light border pill-badge">Validated</span>
        </div>

        <form class="row g-3 align-items-end" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="col-12 col-md-5">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Search (name/email/phone)</mat-label>
              <input matInput formControlName="query" placeholder="Type to search…" />
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All</mat-option>
                <mat-option value="ACTIVE">Active</mat-option>
                <mat-option value="INACTIVE">Inactive</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                <mat-option value="">All</mat-option>
                <mat-option value="CUSTOMER">Customer</mat-option>
                <!-- No GUEST option -->
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-1 d-grid">
            <button mat-stroked-button class="apply-btn" type="submit">Apply</button>
          </div>
        </form>

        <!-- <div class="text-muted small mt-2">
          Showing {{ dataSource.filteredData.length }} of {{ totalCustomers() }} customers.
        </div> -->
      </div>

      <!-- CARD: Add/Edit + Table -->
      <div class="app-card p-3 p-md-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">Customers</h5>
          <div class="d-flex gap-2">
            <button mat-stroked-button (click)="startAdd()" class="apply-btn">+ New customer</button>
            <button mat-stroked-button color="primary" (click)="reload()" class="apply-btn">Reload</button>
          </div>
        </div>

        <!-- ADD/EDIT FORM -->
        <div class="mb-3" *ngIf="showForm()">
          <div class="form-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="action-ico">👤</div>
                <div>
                  <div class="action-title">{{ editingId === null ? 'Add Customer' : 'Edit Customer' }}</div>
                  <div class="action-sub">Required fields are validated</div>
                </div>
              </div>
              <button type="button" mat-stroked-button (click)="cancelForm()" class="apply-btn">Close</button>
            </div>

            <form [formGroup]="customerForm" (ngSubmit)="save()" class="row g-3">
              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="fullName" required />
                  <mat-error *ngIf="customerForm.controls.fullName.hasError('required')">Name is required</mat-error>
                  <mat-error *ngIf="customerForm.controls.fullName.hasError('minlength')">Min 3 characters</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" required />
                  <mat-error *ngIf="customerForm.controls.email.hasError('required')">Email is required</mat-error>
                  <mat-error *ngIf="customerForm.controls.email.hasError('email')">Invalid email</mat-error>
                  <mat-error *ngIf="customerForm.controls.email.hasError('duplicate')">Email already exists</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" placeholder="+91XXXXXXXXXX" />
                  <mat-error *ngIf="customerForm.controls.phone.hasError('pattern')">
                    Use a valid phone number (E.164, e.g. +911234567890)
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Role</mat-label>
                  <!-- Fix: bind booleans explicitly to satisfy strict template checking -->
                  <mat-select formControlName="role" [required]="true" [disabled]="true">
                    <mat-option value="CUSTOMER">Customer</mat-option>
                  </mat-select>
                  <mat-error *ngIf="customerForm.controls.role.hasError('required')">Role is required</mat-error>
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>ID Proof (optional)</mat-label>
                  <input matInput formControlName="idProof" placeholder="Aadhaar / Passport / DL no." />
                </mat-form-field>
              </div>

              <div class="col-12 col-md-3 d-flex align-items-center">
                <mat-slide-toggle color="primary" formControlName="active">Active</mat-slide-toggle>
              </div>

              <div class="col-12 col-md-3 d-grid">
                <button mat-raised-button color="primary" class="btn-app" type="submit" [disabled]="customerForm.invalid">
                  {{ editingId === null ? 'Create' : 'Save changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- TABLE -->
        <div class="table-wrap">
          <table mat-table [dataSource]="dataSource" matSort class="w-100">

            <!-- Name -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let u">
                <div class="name-cell">
                  <div class="avatar">{{ initials(u.fullName) }}</div>
                  <div>
                    <div class="fw-semibold">{{ u.fullName || '—' }}</div>
                    <div class="text-muted small">{{ u.email || '—' }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Phone -->
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Phone</th>
              <td mat-cell *matCellDef="let u">{{ displayPhone(u) }}</td>
            </ng-container>

            <!-- Role -->
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
              <td mat-cell *matCellDef="let u">
                <mat-chip-set>
                  <!-- Only CUSTOMER now -->
                  <mat-chip class="chip-indigo">
                    {{ roleText(u) | uppercase }}
                  </mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Created -->
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Created</th>
              <td mat-cell *matCellDef="let u">{{ displayCreated(u) }}</td>
            </ng-container>

            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let u">
                <span class="status-dot" [ngClass]="u.active ? 'on' : 'off'"></span>
                <span class="small fw-semibold" [ngClass]="u.active ? 'text-on' : 'text-off'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let u" class="actions">
                <button mat-stroked-button class="apply-btn" (click)="toggleActive(u)">
                  {{ u.active ? 'Deactivate' : 'Activate' }}
                </button>
                <button mat-stroked-button (click)="startEdit(u)">Edit</button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>

          <mat-paginator [pageSize]="10" [pageSizeOptions]="[5,10,25,50]" showFirstLastButtons></mat-paginator>
        </div>
      </div>

      <div class="text-center mt-4 small text-muted">
        © 2026 Hotel Booking System
      </div>
    </div>
  </div>
  `,
  styles: [`
    .dash-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding-bottom: 16px;
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
    .hero::before, .hero::after{ content:none !important; display:none !important; }

    .kicker{
      display:inline-flex; align-items:center; gap:8px;
      font-size:12px; font-weight:800;
      letter-spacing:.08em; text-transform:uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .title{ letter-spacing:-0.01em; }
    .hero-badge{
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 12px;
      border-radius:999px;
      border:1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space:nowrap;
    }
    .badge-dot{
      width:8px; height:8px; border-radius:999px;
      background: var(--app-secondary);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }
    .pill-badge{
      border-radius:999px;
      padding:6px 10px;
      font-weight:700;
      color: rgba(15,23,42,0.7);
    }
    .apply-btn{
      border-color: rgba(79,70,229,0.35) !important;
      color: var(--app-primary) !important;
      border-radius: 999px !important;
      height: 40px;
    }
    .form-card{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      background: #fff;
      padding: 12px;
    }
    .action-ico{
      width:42px; height:42px; border-radius:14px;
      display:grid; place-items:center;
      font-size:18px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex:0 0 42px;
    }
    .action-title{ font-weight:900; line-height:1.1; }
    .action-sub{ font-size:12px; color: rgba(15,23,42,0.60); margin-top:3px; }

    .table-wrap{
      border: 1px solid var(--app-border);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }
    table{ border-collapse: separate; border-spacing: 0; }
    th.mat-mdc-header-cell{
      background: rgba(15,23,42,0.02);
      color: rgba(15,23,42,0.70);
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      font-size: 12px;
    }
    .mat-mdc-header-row, .mat-mdc-row{
      border-bottom: 1px solid var(--app-border);
    }
    td.mat-mdc-cell, th.mat-mdc-header-cell{
      padding: 14px 16px;
    }
    .name-cell{ display:flex; align-items:center; gap:10px; }
    .avatar{
      width:34px; height:34px; border-radius:10px;
      display:grid; place-items:center;
      font-size:12px; font-weight:800;
      color:#222;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.10));
      border: 1px solid rgba(79,70,229,0.16);
      flex:0 0 34px;
    }
    .actions{ display:flex; gap:8px; }

    .status-dot{
      width:10px; height:10px; border-radius:999px; display:inline-block; margin-right:6px;
      box-shadow: 0 0 0 4px rgba(34,197,94,0.12);
    }
    .status-dot.on{ background: var(--app-success); }
    .status-dot.off{
      background: rgba(15,23,42,0.35);
      box-shadow: 0 0 0 4px rgba(15,23,42,0.08);
    }
    .text-on{ color: rgba(34,197,94,0.95); }
    .text-off{ color: rgba(15,23,42,0.55); }

    .chip-indigo{ background: rgba(79,70,229,0.10); color:#312e81; font-weight:700; }

    .btn-app{
      background-color: var(--app-primary) !important;
      border-color: var(--app-primary) !important;
      color: #fff !important;
    }
    .btn-app:hover{ filter: brightness(0.95); color:#fff !important; }
  `]
})
export class ManageCustomersComponent implements AfterViewInit {
  private api = inject(ApiUserService);
  private fb = inject(NonNullableFormBuilder);

  cols: string[] = ['name', 'phone', 'role', 'created', 'status', 'actions'];
  dataSource = new MatTableDataSource<CustomerRow>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  showForm = signal(false);
  editingId: string | number | null = null;

  // Filters
  filterForm: FormGroup<{
    query: FormControl<string>;
    status: FormControl<StatusFilter>;
    role: FormControl<RoleFilter>;
  }>;

  // Add/Edit form
  customerForm: FormGroup<{
    fullName: FormControl<string>;
    email: FormControl<string>;
    phone: FormControl<string>;
    role: FormControl<'CUSTOMER'>;        // narrowed
    idProof: FormControl<string>;
    active: FormControl<boolean>;
  }>;

  totalCustomers = computed(() => this.dataSource.data.length);

  constructor() {
    // Filters
    this.filterForm = this.fb.group({
      query: this.fb.control(''),
      status: this.fb.control('' as StatusFilter),
      role: this.fb.control('' as RoleFilter)  // only '' or 'CUSTOMER'
    });

    // Add/Edit form
    this.customerForm = this.fb.group({
      fullName: this.fb.control('', [Validators.required, Validators.minLength(3)]),
      email: this.fb.control('', [Validators.required, Validators.email, this.duplicateEmailValidator()]),
      phone: this.fb.control('', [Validators.pattern(/^\+?[0-9]{7,15}$/)]),
      role: this.fb.control<'CUSTOMER'>('CUSTOMER', [Validators.required]),
      idProof: this.fb.control(''),
      active: this.fb.control(true)
    });

    this.reload();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Client-side combined filter
    this.dataSource.filterPredicate = (u: CustomerRow, filterJson: string) => {
      const f = JSON.parse(filterJson) as { query: string; status: StatusFilter; role: RoleFilter };
      const q = (f.query || '').toLowerCase().trim();

      const matchesQuery =
        !q ||
        (u.fullName ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        String(u.phone ?? '').toLowerCase().includes(q);

      const role = 'CUSTOMER' as const; // fixed
      const status = u.active ? 'ACTIVE' : 'INACTIVE';

      const matchesRole = !f.role || role === f.role;
      const matchesStatus = !f.status || status === f.status;

      return matchesQuery && matchesRole && matchesStatus;
    };
  }

  // ---------- Data Ops ----------
  private mapBackend(u: BackendUser): CustomerRow {
    // Force any backend role to CUSTOMER for this screen
    const normalizedRole = 'CUSTOMER' as const;

    return {
      id: u.id,
      fullName: u.userName ?? '',
      email: u.email,
      phone: u.phoneNumber ?? '',
      role: normalizedRole,
      active: u.active ?? ((u.accountStatus ?? u.status) === 'ACTIVE'),
      createdAt: (u as any).createdAt ?? undefined
    };
  }

  async reload() {
    try {
      // Load a big page and filter on client (keeps your MatTableDataSource behavior)
      const page = await this.api.listUsers({ page: 0, size: 500, sort: 'userName,asc',role:"CUSTOMER" });
      // Map everything to CUSTOMER (ignores backend "GUEST")
      console.log(page);
      const rows = page.content.map(u => this.mapBackend(u));
      this.dataSource.data = rows;
      this.applyFilters();
    } catch (e) {
      console.error('[ManageCustomers] load failed', e);
      this.dataSource.data = [];
    }
  }

  applyFilters() {
    const f = this.filterForm.getRawValue();
    this.dataSource.filter = JSON.stringify({
      query: f.query,
      status: f.status,
      role: f.role
    });
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  resetFilters() {
    this.filterForm.reset({ query: '', status: '' as StatusFilter, role: '' as RoleFilter });
    this.applyFilters();
  }

  startAdd() {
    this.editingId = null;
    this.customerForm.reset({
      fullName: '',
      email: '',
      phone: '',
      role: 'CUSTOMER',   // fixed
      idProof: '',
      active: true
    });
    this.showForm.set(true);
  }

  startEdit(u: CustomerRow) {
    this.editingId = u.id;
    this.customerForm.reset({
      fullName: u.fullName ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: 'CUSTOMER',   // fixed
      idProof: '',
      active: !!u.active
    });
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId = null;
  }

  async save() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const v = this.customerForm.getRawValue();

    if (this.editingId === null) {
      // CREATE
      const body: CreateUserRequest = {
        userName: v.fullName.trim(),
        email: v.email.trim(),
        role: 'CUSTOMER',                 // fixed
        phone: v.phone?.trim() || undefined
      };
      try {
        const created = await this.api.createUser(body);
        const row = this.mapBackend(created);
        this.dataSource.data = [row, ...this.dataSource.data];
        this.cancelForm();
        this.applyFilters();
      } catch (e) {
        console.error('[ManageCustomers] create failed', e);
      }
    } else {
      // UPDATE
      const patch = {
        userName: v.fullName.trim(),
        email: v.email.trim(),
        role: 'CUSTOMER',                // fixed
        phone: v.phone?.trim() || undefined,
        active: v.active
      };
      try {
        const updated = await this.api.updateUser(this.editingId, patch);
        const row = this.mapBackend(updated);
        this.dataSource.data = this.dataSource.data.map(u =>
          (this.getId(u) === this.editingId ? row : u)
        );
        this.cancelForm();
        this.applyFilters();
      } catch (e) {
        console.error('[ManageCustomers] update failed', e);
      }
    }
  }

  async toggleActive(u: CustomerRow) {
    const id = this.getId(u);
    const next = !u.active;
    try {
      await this.api.setActive(id, next);
      // apply locally for snappy UX
      this.dataSource.data = this.dataSource.data.map(x =>
        (this.getId(x) === id ? { ...x, active: next } : x)
      );
      this.applyFilters();
    } catch (e) {
      console.error('[ManageCustomers] toggle active failed', e);
    }
  }

  // ---------- validators ----------
  private duplicateEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = String(control.value ?? '').trim().toLowerCase();
      if (!email) return null;
      const exists = this.dataSource.data.some(u =>
        (u.email || '').toLowerCase() === email && this.getId(u) !== this.editingId
      );
      return exists ? { duplicate: true } : null;
    };
  }

  // ---------- display helpers ----------
  displayPhone(u: CustomerRow): string {
    return u.phone && String(u.phone).trim() !== '' ? String(u.phone) : '—';
  }

  displayCreated(u: CustomerRow): string {
    const d = this.toDate(u.createdAt);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }

  roleText(u: CustomerRow): string {
    return 'CUSTOMER';
  }

  initials(name?: string) {
    const n = (name || '').trim();
    if (!n) return 'CU';
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || '').join('');
  }

  // ---------- low-level helpers ----------
  private getId(u: any) {
    return u?.id ?? u?._id ?? u?.userId ?? u?.uid ?? null;
  }
  private toDate(v: any): Date | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
    if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; }
    if (typeof v === 'string') {
      const maybeNum = Number(v);
      if (Number.isFinite(maybeNum) && v.trim() !== '') {
        const d = new Date(maybeNum); if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(v); return isNaN(d.getTime()) ? undefined : d;
  }
}