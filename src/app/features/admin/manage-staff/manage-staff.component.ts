import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  NonNullableFormBuilder,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ApiUserService, BackendUser, CreateUserWithStaffRequest } from '../../../core/services/api-user.service';

/** TYPE DEFINITIONS */
type Department = 'BILLING' | 'HOME_SERVICE' | 'OTHER';
const DEPARTMENTS: Department[] = ['BILLING', 'HOME_SERVICE', 'OTHER'];

type StaffRole = 'STAFF' | 'ADMIN';
const STAFF_ROLES: StaffRole[] = ['STAFF', 'ADMIN'];

/** UI ROW */
type StaffRow = {
  id: string | number;
  fullName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  phone?: string;
  designation?: string; // department (kept in data model; not displayed in table)
};

/** VALIDATORS */
function phoneINValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return { required: true };
  const normalized = raw.replace(/[\s()-]/g, '');
  const noCountry = normalized.replace(/^(\+?91|0)/, '');
  const re = /^[6-9]\d{9}$/;
  return re.test(noCountry) ? null : { phoneIN: true };
}

function notFutureDate(control: AbstractControl): ValidationErrors | null {
  const v = control.value as Date | null;
  if (!v) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const given = new Date(v); given.setHours(0, 0, 0, 0);
  return given.getTime() <= today.getTime() ? null : { futureDate: true };
}

@Component({
  standalone: true,
  selector: 'app-manage-staff',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  template: `
  <div class="dash-bg">
    <div class="container-fluid p-0">

      <!-- HERO -->
      <div class="app-card p-3 p-md-4 mb-4 hero">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <div class="kicker">Admin Portal</div>
            <h2 class="fw-bold mb-1 title">Manage Staff</h2>
            <p class="text-muted mb-0">
              Add, search and manage staff accounts with validations and status controls.
            </p>
          </div>

          <div class="hero-badge">
            <span class="badge-dot"></span>
            <span class="text-muted small">Total:</span>
            <span class="small fw-semibold">{{ rows().length }}</span>
          </div>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="app-card p-3 p-md-4 mb-4">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="fw-bold mb-0">Quick Filters</h5>
          <span class="badge text-bg-light border pill-badge">Interactive</span>
        </div>

        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-5">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Search (name/email/phone)</mat-label>
              <input matInput #q [value]="search()" (input)="search.set(q.value)" placeholder="Type to search…" />
              <button *ngIf="search()" matSuffix mat-icon-button aria-label="Clear" (click)="search.set('')">
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Role</mat-label>
              <mat-select [value]="roleFilter()" (selectionChange)="roleFilter.set($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-6 col-md-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Status</mat-label>
              <mat-select [value]="statusFilter()" (selectionChange)="statusFilter.set($event.value)">
                <mat-option value="">All</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="inactive">Inactive</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="col-12 col-md-1 d-grid">
            <button mat-stroked-button class="apply-btn"
                    (click)="clearFilters"
                    [disabled]="!search() && !roleFilter() && !statusFilter()">
              Clear
            </button>
          </div>
        </div>

        <div class="text-muted small mt-2">
          Showing {{ filteredRows().length }} of {{ rows().length }} staff.
        </div>
      </div>

      <!-- MAIN CARD -->
      <div class="app-card p-3 p-md-4">

        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">Staff</h5>
          <div class="d-flex gap-2">
            <button mat-stroked-button (click)="toggleAddForm()" class="apply-btn">
              <mat-icon>{{ showAddForm() ? 'expand_less' : 'add' }}</mat-icon>
              {{ showAddForm() ? 'Close' : 'New staff' }}
            </button>
            <button mat-stroked-button color="primary" (click)="refresh()" class="apply-btn">Reload</button>
          </div>
        </div>

        <!-- ADD/EDIT FORM -->
        <div class="mb-3" *ngIf="showAddForm()">
          <div class="form-card">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="action-ico">👥</div>
                <div>
                  <div class="action-title">{{ editingId ? 'Edit Staff' : 'Add Staff' }}</div>
                  <div class="action-sub">Required fields are validated</div>
                </div>
              </div>
              <button type="button" mat-stroked-button (click)="toggleAddForm()" class="apply-btn">Close</button>
            </div>

            <form [formGroup]="staffForm" (ngSubmit)="submitStaff()" class="row g-3">

              <!-- FULL NAME -->
              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="fullName" required />
                  <mat-error *ngIf="staffForm.controls.fullName.hasError('required')">Name is required</mat-error>
                  <mat-error *ngIf="staffForm.controls.fullName.hasError('minlength')">Min 3 characters</mat-error>
                </mat-form-field>
              </div>

              <!-- EMAIL -->
              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" required />
                  <mat-error *ngIf="staffForm.controls.email.hasError('required')">Email is required</mat-error>
                  <mat-error *ngIf="staffForm.controls.email.hasError('email')">Enter a valid email</mat-error>
                </mat-form-field>
              </div>

              <!-- PHONE -->
              <div class="col-12 col-md-4">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Phone (India)</mat-label>
                  <input matInput formControlName="phone" required placeholder="+91 9XXXXXXXXX" />
                  <mat-error *ngIf="staffForm.controls.phone.hasError('required')">Phone is required</mat-error>
                  <mat-error *ngIf="staffForm.controls.phone.hasError('phoneIN')">Enter a valid Indian mobile</mat-error>
                </mat-form-field>
              </div>

              <!-- ROLE -->
            
<!-- ROLE (UI only shows STAFF) -->
<div class="col-12 col-md-3">
  <mat-form-field appearance="outline" class="w-100">
    <mat-label>Role</mat-label>
    <mat-select formControlName="role" required>
      <mat-option value="STAFF">STAFF</mat-option>
    </mat-select>
    <mat-error *ngIf="staffForm.controls.role.hasError('required')">Role is required</mat-error>
  </mat-form-field>
</div>

              <!-- DEPARTMENT (kept in form; not shown in table) -->
              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Department</mat-label>

                  <mat-select formControlName="designation"
                              *ngIf="staffForm.controls.role.value === 'STAFF'; else adminDept">
                    <mat-option *ngFor="let d of departments" [value]="d">{{ d }}</mat-option>
                  </mat-select>

                  <ng-template #adminDept>
                    <input matInput value="N/A (Admin)" disabled />
                  </ng-template>

                  <mat-error *ngIf="staffForm.controls.designation.hasError('required') && staffForm.controls.role.value === 'STAFF'">
                    Department is required for Staff
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- JOINING DATE -->
              <div class="col-12 col-md-3">
                <mat-form-field appearance="outline" class="w-100">
                  <mat-label>Joining date (optional)</mat-label>
                  <input matInput [matDatepicker]="dpJoin" formControlName="joiningDate" />
                  <mat-datepicker-toggle matSuffix [for]="dpJoin"></mat-datepicker-toggle>
                  <mat-datepicker #dpJoin></mat-datepicker>
                  <mat-error *ngIf="staffForm.controls.joiningDate.hasError('futureDate')">
                    Joining date can't be in the future
                  </mat-error>
                </mat-form-field>
              </div>

              <!-- ACTIVE -->
              <div class="col-12 col-md-3 d-flex align-items-center">
                <mat-slide-toggle color="primary" formControlName="active">Active</mat-slide-toggle>
              </div>

              <div class="col-12 d-flex justify-content-end gap-2">
                <button mat-stroked-button type="button" (click)="resetForm()">Reset</button>
                <button mat-raised-button color="primary" class="btn-app" type="submit"
                        [disabled]="staffForm.invalid">
                  Save
                </button>
              </div>

            </form>
          </div>
        </div>

        <!-- TABLE -->
        <div class="table-wrap">
          <table mat-table [dataSource]="filteredRows()" class="w-100">

            <!-- NAME -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
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

            <!-- PHONE -->
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let u">{{ phoneOf(u) }}</td>
            </ng-container>

            <!-- ROLE -->
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let u">
                <span class="role-chip" [class.admin]="isAdmin(u)">{{ roleLabel(u) }}</span>
              </td>
            </ng-container>

            <!-- STATUS -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let u">
                <span class="status-dot" [ngClass]="u.active ? 'on' : 'off'"></span>
                <span class="small fw-semibold" [ngClass]="u.active ? 'text-on' : 'text-off'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>

            <!-- ACTIONS -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let u" class="actions">
                <button mat-stroked-button class="apply-btn"
                        (click)="toggle(u)"
                        [matTooltip]="u.active ? 'Deactivate user' : 'Activate user'">
                  {{ u.active ? 'Deactivate' : 'Activate' }}
                </button>
                <button mat-stroked-button (click)="edit(u)">Edit</button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>

          <div class="empty" *ngIf="!filteredRows().length">
            <div class="stat-icon indigo">👥</div>
            <div class="fw-bold mt-2">No staff found</div>
            <div class="text-muted small">Adjust filters or add staff to get started.</div>
          </div>
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
    th{
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
      padding: 14px 16px !important;
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

    .role-chip{
      display:inline-flex; align-items:center; gap:6px;
      padding:4px 8px; border-radius:999px;
      background: rgba(6,182,212,0.10);
      border:1px solid rgba(6,182,212,0.18);
      font-size: 12px; font-weight: 700; color: rgba(15,23,42,0.80);
    }
    .role-chip.admin{
      background: rgba(79,70,229,0.10);
      border-color: rgba(79,70,229,0.18);
    }

    .btn-app{
      background-color: var(--app-primary) !important;
      border-color: var(--app-primary) !important;
      color: #fff !important;
    }
    .btn-app:hover{ filter: brightness(0.95); color:#fff !important; }
  `]
})
export class ManageStaffComponent {
  private fb = inject(NonNullableFormBuilder);
  private apiUsers = inject(ApiUserService);

  departments = DEPARTMENTS;
  editingId: string | number | null = null;

  cols = ['name', 'phone', 'role', 'status', 'actions'] as const;
  roles: StaffRole[] = ['STAFF', 'ADMIN'];

  private _rows = signal<StaffRow[]>([]);
  rows = computed(() => this._rows());

  // Filters
  search = signal<string>('');
  roleFilter = signal<string>('');
  statusFilter = signal<string>('');

  // Form
  staffForm: FormGroup<{
    fullName: FormControl<string>;
    email: FormControl<string>;
    phone: FormControl<string>;
    role: FormControl<StaffRole | ''>;
    designation: FormControl<Department | ''>;
    joiningDate: FormControl<Date | null>;
    active: FormControl<boolean>;
  }>;

  showAddForm = signal<boolean>(false);

  constructor() {
    this.staffForm = this.fb.group({
      fullName: this.fb.control('', [Validators.required, Validators.minLength(3)]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      phone: this.fb.control('', [phoneINValidator]),
      // default empty, but UI only exposes STAFF for creation
      role: this.fb.control<StaffRole | ''>('', [Validators.required]),
      designation: this.fb.control<Department | ''>(''),
      joiningDate: this.fb.control<Date | null>(null, [notFutureDate]),
      active: this.fb.control(true)
    });

    // Toggle department control based on role; make required only for STAFF
    this.staffForm.controls.role.valueChanges.subscribe(r => {
      const ctrl = this.staffForm.controls.designation;
      if (r === 'ADMIN') {
        ctrl.clearValidators();
        ctrl.setValue('' as '', { emitEvent: false });
        ctrl.disable({ emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
        ctrl.setValidators([Validators.required]);
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    });

    this.refresh();
  }

  // ---------------------------- UI ACTIONS ----------------------------
  toggleAddForm() {
    this.showAddForm.update(v => !v);
    // When opening create form, make sure role is reset and designation enabled state is correct
    if (this.showAddForm() && this.editingId === null) {
      this.staffForm.controls.role.setValue('' as any);
      const ctrl = this.staffForm.controls.designation;
      ctrl.enable({ emitEvent: false });
      ctrl.setValidators([Validators.required]);
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }

  resetForm() {
    this.editingId = null;
    this.staffForm.reset({
      fullName: '',
      email: '',
      phone: '',
      role: '' as any,
      designation: '',
      joiningDate: null,
      active: true
    });
  }

  clearFilters() {
    this.search.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
  }

  // ---------------------------- MAPPERS ----------------------------
  private mapBackendToUI(u: BackendUser): StaffRow {
    return {
      id: u.id,
      fullName: u.userName ?? '',
      email: u.email,
      role: ((u.role as StaffRole) || 'STAFF'),
      active: u.active ?? ((u.accountStatus ?? u.status) === 'ACTIVE'),
      phone: u.phoneNumber ?? '',
      designation: (u as any).departmentName ?? ''
    };
  }

  // ---------------------------- LOAD STAFF ----------------------------
  async refresh() {
    try {
      const page = await this.apiUsers.listUsers({
        size: 200,
        sort: 'userName,asc'
      });

      // Only STAFF shown in the table — Admins are not listed
      const staff = page.content
        .filter(u => ['STAFF'].includes(String(u.role).toUpperCase()))
        .map(u => this.mapBackendToUI(u));
      this._rows.set(staff);
    } catch (err) {
      console.error('[ManageStaff] Failed to load staff:', err);
      this._rows.set([]);
    }
  }

  // ---------------------------- CREATE / UPDATE STAFF ----------------------------
  async submitStaff() {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const v = this.staffForm.getRawValue();

    if (this.editingId === null) {
      // -------- CREATE STAFF (Admin creation is blocked) --------
      if (v.role === 'ADMIN') {
        console.error('[ManageStaff] Creating ADMIN is not allowed.');
        return;
      }

      const body: CreateUserWithStaffRequest = {
        user: {
          userName: v.fullName.trim(),
          email: v.email.trim(),
          role: 'STAFF',                  // Force STAFF on create (defense-in-depth)
          phone: v.phone?.trim()
        },
        departmentName: v.designation as string // required for Staff
      };

      try {
        const created = await this.apiUsers.createStaff(body);
        this._rows.set([this.mapBackendToUI(created), ...this._rows()]);
        this.resetForm();
        this.showAddForm.set(false);
      } catch (err) {
        console.error('[ManageStaff] CREATE failed:', err);
      }
    } else {
      // -------- UPDATE STAFF --------
      const patch = {
        userName: v.fullName.trim(),
        email: v.email.trim(),
        role: v.role, // if Admin is edited in future flow, backend can decide policy
        phone: v.phone?.trim(),
        active: v.active,
        departmentName: v.role === 'ADMIN' ? '' : (v.designation as string)
      };

      try {
        const updated = await this.apiUsers.updateUser(this.editingId, patch);
        const mapped = this.mapBackendToUI(updated);
        const updatedRows = this._rows().map(row =>
          row.id === this.editingId ? mapped : row
        );
        this._rows.set(updatedRows);
        this.resetForm();
        this.showAddForm.set(false);
      } catch (err) {
        console.error('[ManageStaff] UPDATE failed:', err);
      }
    }
  }

  // ---------------------------- ACTIVATE / DEACTIVATE ----------------------------
  async toggle(u: StaffRow) {
    try {
      await this.apiUsers.setActive(u.id, !u.active);
      await this.refresh();
    } catch (err) {
      console.error('[ManageStaff] Failed to toggle active:', err);
    }
  }

  // ---------------------------- EDIT STAFF ----------------------------
  edit(u: StaffRow) {
    this.editingId = u.id;
    this.showAddForm.set(true);

    const isAdmin = u.role === 'ADMIN';
    if (isAdmin) {
      // If ever Admin is loaded here in future, disable department & keep it blank
      this.staffForm.controls.designation.disable({ emitEvent: false });
      this.staffForm.controls.designation.setValue('' as '', { emitEvent: false });
    } else {
      this.staffForm.controls.designation.enable({ emitEvent: false });
    }

    this.staffForm.patchValue({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      designation: isAdmin ? '' : (u.designation as any),
      joiningDate: null,
      active: u.active
    });
  }

  // ---------------------------- FILTERED ROWS ----------------------------
  filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rf = (this.roleFilter() || '').toUpperCase();
    const sf = this.statusFilter();

    return this.rows()
      .filter(u => {
        const role = String(u.role).toUpperCase();

        if (q) {
          const hay = `${u.fullName} ${u.email} ${u.phone}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (rf && role !== rf) return false;
        if (sf === 'active' && !u.active) return false;
        if (sf === 'inactive' && u.active) return false;

        return true;
      })
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  });

  // ---------------------------- HELPERS ----------------------------
  phoneOf(u: StaffRow) {
    return u.phone && u.phone.trim() !== '' ? u.phone : '—';
  }

  roleLabel(u: StaffRow) {
    return String(u.role || 'STAFF').toUpperCase();
  }

  isAdmin(u: StaffRow) {
    return u.role === 'ADMIN';
  }

  initials(name?: string) {
    const n = (name || '').trim();
    if (!n) return 'ST';
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() || '').join('');
  }
}