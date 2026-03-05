// app/manage-rooms/manage-rooms.component.ts
import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  FormControl,
  FormGroup
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RoomService } from '../../../core/services/room.service';
import { Room } from '../../../core/models/models';
import { AmenityDto, AmenityService } from '../../../core/services/amenity.service';
import { ToastService } from '../../../core/services/toast.service';

type RoomType = 'STANDARD' | 'DELUXE' | 'SUITE';

@Component({
  standalone: true,
  selector: 'app-manage-rooms',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatSlideToggleModule, MatIconModule, MatTooltipModule
  ],
  template: `
  <!-- ===== HERO / HEADER ===== -->
  <div class="app-card p-3 p-md-4 mb-4 hero-lite">
    <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
      <div>
        <div class="kicker">Inventory</div>
        <h2 class="fw-bold mb-1 title">Manage Rooms</h2>
        <p class="text-muted mb-0">
          Create, update and activate rooms with pricing, policies and amenities.
        </p>
      </div>

      <div class="hero-badge">
        <span class="badge-dot"></span>
        <span class="text-muted small">Active:</span>
        <span class="small fw-semibold">{{ activeCount }} / {{ rooms.length }}</span>
      </div>
    </div>
  </div>

  <!-- ===== ROOM FORM ===== -->
  <div class="app-card p-3 p-md-4 mb-4">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h5 class="fw-bold mb-0">Add / Edit Room</h5>
      <span class="badge text-bg-light border pill-badge">Validated</span>
    </div>
    <p class="text-muted small mb-3">Fill the mandatory fields and click <strong>Add Room</strong>.</p>

    <form [formGroup]="form" (ngSubmit)="add()" class="row g-3">

      <div class="col-12 col-md-3">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Room Number</mat-label>
          <input matInput formControlName="roomNumber" placeholder="e.g., 101, A-203">
          <mat-error *ngIf="fc.roomNumber.hasError('required')">
            Room number is required
          </mat-error>
          <mat-error *ngIf="fc.roomNumber.hasError('pattern')">
            Only letters, numbers and hyphens are allowed
          </mat-error>
          <mat-error *ngIf="fc.roomNumber.hasError('duplicate')">
            This room number already exists
          </mat-error>
        </mat-form-field>
      </div>

      <div class="col-6 col-md-2">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type" required>
            <mat-option value="STANDARD">STANDARD</mat-option>
            <mat-option value="DELUXE">DELUXE</mat-option>
            <mat-option value="SUITE">SUITE</mat-option>
          </mat-select>
          <mat-error *ngIf="fc.type.hasError('required')">Type is required</mat-error>
        </mat-form-field>
      </div>

      <div class="col-6 col-md-2">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Floor</mat-label>
          <input matInput type="number" formControlName="floor" placeholder="e.g., 1">
          <mat-error *ngIf="fc.floor.hasError('required')">Floor is required</mat-error>
          <mat-error *ngIf="fc.floor.hasError('min')">Min 0</mat-error>
          <mat-error *ngIf="fc.floor.hasError('max')">Too high</mat-error>
        </mat-form-field>
      </div>

      <div class="col-6 col-md-2">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Max Guests</mat-label>
          <input matInput type="number" formControlName="maxGuests">
          <mat-error *ngIf="fc.maxGuests.hasError('required')">Required</mat-error>
          <mat-error *ngIf="fc.maxGuests.hasError('min')">Min 1</mat-error>
          <mat-error *ngIf="fc.maxGuests.hasError('max')">Max 12</mat-error>

        </mat-form-field>
      </div>

      <div class="col-6 col-md-3">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Price / Night</mat-label>
          <span matPrefix>₹&nbsp;</span>
          <input matInput type="number" formControlName="pricePerNight" placeholder="e.g., 1800">
          <mat-error *ngIf="fc.pricePerNight.hasError('required')">Required</mat-error>
          <mat-error *ngIf="fc.pricePerNight.hasError('min')">Must be ≥ 1</mat-error>
          <mat-error *ngIf="fc.pricePerNight.hasError('max')">Too high</mat-error>
        </mat-form-field>
      </div>

      <div class="col-12 col-md-6">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Amenities</mat-label>
          <mat-select formControlName="amenities" multiple>
            <mat-option *ngFor="let a of amenityOptions" [value]="a">{{ a }}</mat-option>
          </mat-select>
          <mat-error *ngIf="fc.amenities.hasError('required')">Select at least one</mat-error>
          <mat-error *ngIf="fc.amenities.hasError('minlength')">Select at least one</mat-error>
        </mat-form-field>
      </div>

      <div class="col-12">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Description</mat-label>
          <textarea matInput rows="2" formControlName="description" placeholder="Short description (optional)"></textarea>
          <mat-hint align="end">{{ fc.description.value?.length || 0 }}/300</mat-hint>
          <mat-error *ngIf="fc.description.hasError('maxlength')">Max 300 characters</mat-error>
        </mat-form-field>
      </div>

      <div class="col-12 col-md-6 d-flex align-items-center gap-3">
        <!-- <mat-slide-toggle formControlName="refundable">Refundable</mat-slide-toggle>
        <mat-slide-toggle formControlName="cancellable">Cancellable</mat-slide-toggle> -->
        <mat-slide-toggle formControlName="active">Active</mat-slide-toggle>
      </div>

      <div class="col-12">
        <button mat-raised-button color="primary" class="btn-app" [disabled]="form.invalid">
          <mat-icon>add</mat-icon>
          &nbsp;Add Room
        </button>
      </div>
    </form>
  </div>

  <!-- ===== TABLE ===== -->
  <div class="app-card p-3 p-md-4">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h5 class="fw-bold mb-0">Rooms</h5>

      <div class="d-flex align-items-center gap-2">
        <button mat-raised-button color="accent" (click)="openFilePicker()">
          <mat-icon>upload</mat-icon>&nbsp; Bulk Upload
        </button>
        <input
          type="file"
          #fileInput
          accept=".csv"
          hidden
          (change)="onFileSelected($event)">
      </div>

      <span class="text-muted small">Showing {{ rooms.length }} total</span>
    </div>

    <table mat-table [dataSource]="rooms" class="w-100">

      <ng-container matColumnDef="roomNumber">
        <th mat-header-cell *matHeaderCellDef> No. </th>
        <td mat-cell *matCellDef="let r"> {{ r.roomNumber || '—' }} </td>
      </ng-container>

      <!-- Name column removed -->

      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef> Type </th>
        <td mat-cell *matCellDef="let r"> {{ r.type }} </td>
      </ng-container>

      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef> Price </th>
        <td mat-cell *matCellDef="let r">
          ₹{{ r.pricePerNight }}
          <span *ngIf="r?.discountPct" class="text-muted small">
            ({{ r?.discountPct }}% off)
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="guests">
        <th mat-header-cell *matHeaderCellDef> Guests </th>
        <td mat-cell *matCellDef="let r"> {{ r.maxGuests }} </td>
      </ng-container>

      <ng-container matColumnDef="floor">
        <th mat-header-cell *matHeaderCellDef> Floor </th>
        <td mat-cell *matCellDef="let r"> {{ r.floor ?? '—' }} </td>
      </ng-container>

      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef> Active </th>
        <td mat-cell *matCellDef="let r">
          <mat-slide-toggle [checked]="r.active" (change)="toggle(r)" color="primary"></mat-slide-toggle>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  </div>
  `,
  styles: [`
    .hero-lite{
      background:#fff !important;
      border:1px solid var(--app-border);
      border-radius:18px;
      box-shadow:0 10px 25px rgba(2, 8, 23, 0.08);
    }
    .kicker{
      display:inline-flex; gap:8px; align-items:center;
      font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom:6px;
    }
    .title{ letter-spacing:-0.01em; }
    .hero-badge{
      display:inline-flex; align-items:center; gap:8px;
      padding:10px 12px; border-radius:999px;
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
    table { border-spacing: 0; }
    th.mat-header-cell { font-weight: 800; color: rgba(15,23,42,0.60); }
  `]
})
export class ManageRoomsComponent {
  // Removed 'name' column, removed bedType from type column
  cols = ['roomNumber', 'type', 'price', 'guests', 'floor', 'active'];
  rooms: Room[] = [];
  amenityOptions: string[] = [];
  private amenityNameToId = new Map<string, number>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: NonNullableFormBuilder,
    private roomService: RoomService,
    private amenityService: AmenityService,
    private toast: ToastService
  ) {}

  // Strongly-typed controls (name, size, bedType removed)
  form: FormGroup<{
    roomNumber: FormControl<string>;
    type: FormControl<RoomType>;
    floor: FormControl<number>;
    maxGuests: FormControl<number>;
    pricePerNight: FormControl<number>;
    amenities: FormControl<string[]>;
    description: FormControl<string>;
    refundable: FormControl<boolean>;
    cancellable: FormControl<boolean>;
    active: FormControl<boolean>;
  }> = this.fb.group({
    roomNumber: this.fb.control('', { validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9-]+$/)] }),
    type: this.fb.control<RoomType>('STANDARD', { validators: [Validators.required] }),
    floor: this.fb.control(1, { validators: [Validators.required, Validators.min(0), Validators.max(200)] }),
    maxGuests: this.fb.control(2, { validators: [Validators.required, Validators.min(1), Validators.max(12)] }),
    pricePerNight: this.fb.control(1800, { validators: [Validators.required, Validators.min(1), Validators.max(999999)] }),
    amenities: this.fb.control<string[]>(['WiFi'], { validators: [Validators.required, Validators.minLength(1)] }),
    description: this.fb.control('', { validators: [Validators.maxLength(300)] }),
    refundable: this.fb.control(true),
    cancellable: this.fb.control(true),
    active: this.fb.control(true),
  });

  get fc() { return this.form.controls; }

  get activeCount() { return this.rooms.filter((r: any) => !!r?.active).length; }

  refresh() {
    this.rooms = this.roomService.list();
  }

  async add() {
    if (this.form.invalid) return;

    const num = this.fc.roomNumber.value.trim().toUpperCase();
    const duplicate = this.rooms.some((r: any) =>
      String(r?.roomNumber || '').toUpperCase() === num
    );
    if (duplicate) {
      this.fc.roomNumber.setErrors({ ...(this.fc.roomNumber.errors || {}), duplicate: true });
      this.fc.roomNumber.markAsTouched();
      return;
    }

    const amenityIds = (this.fc.amenities.value || [])
      .map(name => this.amenityNameToId.get(name))
      .filter((id): id is number => typeof id === 'number');
    if ((this.fc.amenities.value || []).length > 0 && amenityIds.length === 0) {
      console.warn('Amenity mapping is empty. Did the amenities load before submit?');
    }

    // name, bedType, sizeSqm removed from payload
    const payload: any = {
      roomNumber: num,
      type: this.fc.type.value,
      floor: this.fc.floor.value,
      pricePerNight: this.fc.pricePerNight.value,
      maxGuests: this.fc.maxGuests.value,
      amenities: this.fc.amenities.value,            // names (UI only)
      amenityIds,                                    // backend needs this
      description: this.fc.description.value?.trim(),// used
      refundable: this.fc.refundable.value,          // ignored by backend
      cancellable: this.fc.cancellable.value,        // ignored by backend
      active: this.fc.active.value,                  // used to compute status
    };

    const created = await this.roomService.create(payload as Room);

    if (created) {
      // Reset only existing fields
      this.form.patchValue({
        roomNumber: '',
        description: ''
      });
      this.fc.roomNumber.markAsPristine();
      this.fc.roomNumber.markAsUntouched();
      this.refresh();
    } else {
      console.error('Room creation failed.');
    }
  }

  toggle(r: Room) {
    this.roomService.setActive(r.id, !r.active);
    this.refresh();
  }

  openFilePicker() {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file: File | undefined = input?.files?.[0] ?? undefined;
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.toast.showError('Invalid file format. Please select a valid .csv file.');
      input.value = '';
      return;
    }

    try {
      const result = await this.roomService.bulkUpload(file);
      console.log('Bulk upload result:', result);

      const created = result.createdRoomIds?.length ?? 0;
      const updated = result.updatedCount ?? 0;
      const errors = result.failureCount ?? 0;

      this.toast.showSuccess(`Bulk upload completed. Created: ${created}, Updated: ${updated}, Errors: ${errors}`, 5000);

      // Clear file input
      input.value = '';

      // Refresh local cache from server
      await this.roomService.loadAllForCache({ page: 0, size: 500 });
      this.refresh();
    } catch (err) {
      console.error(err);
      this.toast.showError('Bulk upload failed. Please verify your CSV format and try again.');
      input.value = '';
    }
  }

  async ngOnInit() {
    try {
      await this.roomService.loadAllForCache({ page: 0, size: 500 });

      // Load amenities from backend and prepare UI names + map
      this.amenityService.list$().subscribe({
        next: (list: AmenityDto[]) => {
          this.amenityOptions = list.map(a => a.name);
          this.amenityNameToId.clear();
          for (const a of list) this.amenityNameToId.set(a.name, a.id);
        },
        error: (err) => console.error('Failed to load amenities', err)
      });

    } catch (e) {
      console.error('Failed to load rooms', e);
    }
    this.refresh();
  }
}
