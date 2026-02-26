import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmenityService } from '../../../core/services/amenity.service';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { RoomService } from '../../../core/services/room.service';
import { BookingService } from '../../../core/services/booking.service';
import { Room } from '../../../core/models/models';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

type SortKey = 'priceAsc' | 'priceDesc' | 'capacityDesc' | 'nameAsc';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Group validator: date range + price range */
function searchValidator(): (group: AbstractControl) => ValidationErrors | null {
  return (group: AbstractControl) => {
    const from = group.get('from')?.value as Date | null;
    const to = group.get('to')?.value as Date | null;

    const minPrice = group.get('minPrice')?.value as number | null;
    const maxPrice = group.get('maxPrice')?.value as number | null;

    const errors: any = {};

    // Date validation
    if (from && to) {
      const f = startOfDay(from);
      const t = startOfDay(to);
      if (t <= f) errors.dateRange = 'Check-out must be after check-in';
    }

    // Optional: prevent past check-in
    if (from) {
      const today = startOfDay(new Date());
      if (startOfDay(from) < today) errors.fromPast = 'Check-in cannot be in the past';
    }

    // Price validation
    if (minPrice != null && minPrice < 0) errors.minPriceInvalid = 'Min price cannot be negative';
    if (maxPrice != null && maxPrice < 0) errors.maxPriceInvalid = 'Max price cannot be negative';
    if (minPrice != null && maxPrice != null && maxPrice < minPrice) {
      errors.priceRange = 'Max price must be greater than or equal to min price';
    }

    return Object.keys(errors).length ? errors : null;
  };
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div class="search-bg">
      <div class="container-fluid p-0">

        <!-- Search Hero Card (dashboard-like) -->
        <div class="app-card p-3 p-md-4 mb-4 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Customer Portal</div>
              <h2 class="fw-bold mb-1 title">Search Room Availability</h2>
              <p class="text-muted mb-0">
                Choose dates, guests, and filters to find the best room for your stay.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Add amenities to narrow down results</span>
            </div>
          </div>

          <mat-divider class="my-3"></mat-divider>

          <!-- FORM -->
          <form [formGroup]="form" (ngSubmit)="search()" class="grid-form">

            <!-- Dates -->
            <mat-form-field appearance="outline">
              <mat-label>Check-in</mat-label>
              <input matInput [matDatepicker]="dp1" formControlName="from" />
              <mat-datepicker-toggle matSuffix [for]="dp1"></mat-datepicker-toggle>
              <mat-datepicker #dp1></mat-datepicker>
              <mat-error *ngIf="form.controls.from.touched && form.controls.from.hasError('required')">
                Check-in date is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Check-out</mat-label>
              <input matInput [matDatepicker]="dp2" formControlName="to" />
              <mat-datepicker-toggle matSuffix [for]="dp2"></mat-datepicker-toggle>
              <mat-datepicker #dp2></mat-datepicker>
              <mat-error *ngIf="form.controls.to.touched && form.controls.to.hasError('required')">
                Check-out date is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Guests</mat-label>
              <input matInput type="number" min="1" formControlName="guests" />
              <mat-error *ngIf="form.controls.guests.touched && form.controls.guests.hasError('required')">
                Guests is required
              </mat-error>
              <mat-error *ngIf="form.controls.guests.touched && form.controls.guests.hasError('min')">
                Guests must be at least 1
              </mat-error>
            </mat-form-field>

            <!-- Filters -->
            <mat-form-field appearance="outline">
              <mat-label>Room Type</mat-label>
              <mat-select formControlName="type">
                <mat-option [value]="null">Any</mat-option>
                <mat-option *ngFor="let t of typeOptions()" [value]="t">{{ t }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Min Price (₹/night)</mat-label>
              <input matInput type="number" min="0" formControlName="minPrice" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Max Price (₹/night)</mat-label>
              <input matInput type="number" min="0" formControlName="maxPrice" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="amenities">
              <mat-label>Amenities</mat-label>
              <mat-select formControlName="amenities" multiple>
                <mat-option *ngFor="let a of amenityOptions()" [value]="a">{{ a }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Sort by</mat-label>
              <mat-select formControlName="sort">
                <mat-option value="priceAsc">Price: Low to High</mat-option>
                <mat-option value="priceDesc">Price: High to Low</mat-option>
                <mat-option value="capacityDesc">Capacity: High to Low</mat-option>
                <mat-option value="nameAsc">Name: A → Z</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Form-level errors -->
            <div class="form-errors" *ngIf="form.touched && form.errors">
              <div class="err" *ngIf="form.errors['dateRange']">
                <mat-icon>error_outline</mat-icon>
                {{ form.errors['dateRange'] }}
              </div>
              <div class="err" *ngIf="form.errors['fromPast']">
                <mat-icon>error_outline</mat-icon>
                {{ form.errors['fromPast'] }}
              </div>
              <div class="err" *ngIf="form.errors['priceRange']">
                <mat-icon>error_outline</mat-icon>
                {{ form.errors['priceRange'] }}
              </div>
              <div class="err" *ngIf="form.errors['minPriceInvalid']">
                <mat-icon>error_outline</mat-icon>
                {{ form.errors['minPriceInvalid'] }}
              </div>
              <div class="err" *ngIf="form.errors['maxPriceInvalid']">
                <mat-icon>error_outline</mat-icon>
                {{ form.errors['maxPriceInvalid'] }}
              </div>
            </div>

            <!-- Actions -->
            <div class="actions">
              <button mat-raised-button color="primary" class="btn-wide" [disabled]="form.invalid">
                <mat-icon class="me-1">search</mat-icon>
                Search
              </button>

              <button mat-stroked-button type="button" class="btn-ghost" (click)="reset()">
                Reset
              </button>

              <div class="small text-muted ms-lg-auto" *ngIf="searched()">
                Showing <span class="fw-semibold">{{ results().length }}</span> result(s)
              </div>
            </div>
          </form>
        </div>

        <!-- Results -->
        <div class="row g-3 g-md-4" *ngIf="results().length > 0">
          <div class="col-12 col-lg-6" *ngFor="let r of results()">
            <div class="app-card p-3 p-md-4 room-card h-100">
              <div class="d-flex align-items-start justify-content-between gap-3">
                <div class="min-w-0">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <h5 class="fw-bold mb-0 text-truncate">{{ r.name }}</h5>
                    <span class="pill type">{{ r.type }}</span>
                    <span class="pill ok">Available</span>
                  </div>
                  <div class="text-muted small mt-1">
                    Max Guests: <span class="fw-semibold">{{ r.maxGuests }}</span>
                  </div>

                  <div class="chips mt-2" *ngIf="r.amenities?.length">
                    <span class="chip" *ngFor="let a of r.amenities.slice(0, 6)">{{ a }}</span>
                    <span class="chip more" *ngIf="r.amenities.length > 6">+{{ r.amenities.length - 6 }} more</span>
                  </div>
                </div>

                <div class="text-end">
                  <div class="price">₹{{ r.pricePerNight }}</div>
                  <div class="text-muted small">per night</div>
                </div>
              </div>

              <div class="d-flex align-items-center justify-content-between mt-3 pt-2 border-top-soft">
                <div class="text-muted small">
                  Best for <span class="fw-semibold">{{ recommendFor(r) }}</span>
                </div>
                <button mat-raised-button color="primary" (click)="book(r)">
                  Book <span class="ms-1">›</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="searched() && results().length === 0" class="app-card p-3 p-md-4 empty">
          <div class="d-flex gap-3 align-items-start">
            <div class="empty-ico">😕</div>
            <div>
              <h5 class="fw-bold mb-1">No rooms available</h5>
              <p class="text-muted mb-0">
                Try adjusting dates, removing amenities, or expanding your price range.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* Background matches dashboard vibe */
    .search-bg{
      background:
        radial-gradient(1000px 500px at 10% 10%, rgba(79, 70, 229, 0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 20%, rgba(6, 182, 212, 0.08), transparent 55%),
        radial-gradient(700px 400px at 50% 100%, rgba(34, 197, 94, 0.05), transparent 55%),
        var(--app-bg);
      padding: 0;
      border-radius: 18px;
    }

    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      overflow: hidden;
    }
    .hero::before, .hero::after{ content:none !important; display:none !important; }

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

    .hero-badge{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-dot{
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--app-secondary);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }

    /* Form grid: neat, professional */
    .grid-form{
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 12px;
      align-items: start;
    }
    mat-form-field{ width: 100%; }

    /* 3 columns on desktop, 1 on mobile */
    .grid-form > mat-form-field:nth-child(1){ grid-column: span 4; }
    .grid-form > mat-form-field:nth-child(2){ grid-column: span 4; }
    .grid-form > mat-form-field:nth-child(3){ grid-column: span 4; }

    .grid-form > mat-form-field:nth-child(4){ grid-column: span 4; }
    .grid-form > mat-form-field:nth-child(5){ grid-column: span 4; }
    .grid-form > mat-form-field:nth-child(6){ grid-column: span 4; }

    .amenities{ grid-column: span 8; }
    .grid-form > mat-form-field:nth-child(8){ grid-column: span 4; }

    .form-errors{
      grid-column: 1 / -1;
      display: grid;
      gap: 8px;
      margin-top: 2px;
    }
    .err{
      display:flex;
      align-items:center;
      gap:8px;
      padding:10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(239,68,68,0.22);
      background: rgba(239,68,68,0.06);
      color: rgba(127,29,29,0.95);
      font-weight: 600;
    }
    .err mat-icon{
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .actions{
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .btn-wide{ min-width: 160px; border-radius: 14px; }
    .btn-ghost{
      border-radius: 14px;
      border-color: rgba(15,23,42,0.10);
    }

    /* Results cards (dashboard-like) */
    .room-card{ border-radius: 16px; }
    .price{
      font-size: 22px;
      font-weight: 900;
      color: rgba(15,23,42,0.92);
      line-height: 1;
    }
    .pill{
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid rgba(15,23,42,0.10);
      background: rgba(15,23,42,0.02);
      color: rgba(15,23,42,0.72);
    }
    .pill.type{
      border-color: rgba(79,70,229,0.18);
      background: rgba(79,70,229,0.08);
      color: rgba(79,70,229,0.95);
    }
    .pill.ok{
      border-color: rgba(34,197,94,0.18);
      background: rgba(34,197,94,0.10);
      color: rgba(22,101,52,0.95);
    }

    .chips{
      display:flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip{
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid rgba(15,23,42,0.10);
      background: rgba(255,255,255,0.65);
      color: rgba(15,23,42,0.70);
    }
    .chip.more{
      background: rgba(6,182,212,0.08);
      border-color: rgba(6,182,212,0.18);
      color: rgba(6,182,212,0.95);
    }

    .border-top-soft{
      border-top: 1px solid rgba(15,23,42,0.08);
    }

    .empty{
      border-radius: 16px;
      border: 1px dashed rgba(15,23,42,0.14);
      background: rgba(255,255,255,0.65);
    }
    .empty-ico{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display:grid;
      place-items:center;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      font-size: 20px;
      flex: 0 0 44px;
    }

    /* Responsive */
    @media (max-width: 992px){
      .grid-form{ grid-template-columns: repeat(12, 1fr); }
      .grid-form > mat-form-field:nth-child(1),
      .grid-form > mat-form-field:nth-child(2),
      .grid-form > mat-form-field:nth-child(3),
      .grid-form > mat-form-field:nth-child(4),
      .grid-form > mat-form-field:nth-child(5),
      .grid-form > mat-form-field:nth-child(6),
      .amenities,
      .grid-form > mat-form-field:nth-child(8){
        grid-column: 1 / -1;
      }
      .hero-badge{ white-space: normal; }
    }
  `]
})
export class SearchRoomsComponent {
  results = signal<Room[]>([]);
  searched = signal(false);
  amenityNames = signal<string[]>([]);

  // cache rooms in-memory so dropdown options are stable
  // private allRooms = computed(() => this.rooms.list().filter(r => r.active));

  constructor(
    private fb: FormBuilder,
    private rooms: RoomService,
    private bookings: BookingService,
    private router: Router
    , private amenitiesSvc: AmenityService
  ) { }
  private toDateOnly(d: Date): string {
  // Use UTC parts to avoid timezone drift
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

  ngOnInit(): void {
    this.amenitiesSvc.listNames().subscribe({
      next: (names: string[]) => this.amenityNames.set(names),
      error: (err) => console.error('Failed to load amenity names', err)
    });
  }
  form = this.fb.group({
    from: [null as Date | null, Validators.required],
    to: [null as Date | null, Validators.required],
    guests: [1, [Validators.min(1)]],

    // New optional filters
    type: [null as string | null],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
    amenities: [[] as string[]],
    sort: ['priceAsc' as SortKey],
  }, { validators: [searchValidator()] });


  typeOptions() {
    // Backend expects strings like "Standard", "Deluxe", "Suite"
    return ['Standard', 'Deluxe', 'Suite'];
  }


  amenityOptions() {
    return this.amenityNames();
  }

  reset() {
    this.form.reset({
      from: null,
      to: null,
      guests: 1,
      type: null,
      minPrice: null,
      maxPrice: null,
      amenities: [],
      sort: 'priceAsc',
    });
    this.results.set([]);
    this.searched.set(false);
  }

  search() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.searched.set(true);

    const v = this.form.value;
    const adults = v.guests!;
    const children = 0;

    if (!v.type) {
      this.form.get('type')?.setErrors({ required: true });
      return;
    }

    this.rooms.searchAvailableRooms({
      from: v.from!,
      to: v.to!,
      adults,
      children,
      roomType: v.type!
    }).subscribe({
      next: (rooms) => {
        const minPrice = v.minPrice ?? null;
        const maxPrice = v.maxPrice ?? null;
        const amenities = v.amenities ?? [];
        const sort = v.sort;

        let res = rooms
          .filter(r => minPrice != null ? r.pricePerNight >= minPrice : true)
          .filter(r => maxPrice != null ? r.pricePerNight <= maxPrice : true)
          .filter(r => amenities.length ? amenities.every(a => r.amenities.includes(a)) : true);

        const key = sort ?? 'priceAsc';

        res = [...res].sort((a, b) => {
          switch (key) {
            case 'priceAsc': return a.pricePerNight - b.pricePerNight;
            case 'priceDesc': return b.pricePerNight - a.pricePerNight;
            case 'capacityDesc': return b.maxGuests - a.maxGuests;
            case 'nameAsc': return a.name.localeCompare(b.name);
            default: return 0;
          }
        });

        this.results.set(res);
      },
      error: () => {
        this.results.set([]);
      }
    });
  }

  recommendFor(r: Room) {
    if (r.maxGuests >= 4) return 'Families';
    if (r.maxGuests === 3) return 'Small groups';
    return 'Couples / Solo';
  }

 book(room: Room) {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const from: Date | null = this.form.value.from ?? null;
  const to: Date | null = this.form.value.to ?? null;
  const guests: number = this.form.value.guests!;

  if (!room?.id || !from || !to || !guests) {
    console.warn('Missing booking params', { room, from, to, guests });
    return;
  }

  this.router.navigate(
    ['/customer/book'],
    {
      queryParams: {
        roomId: room.id,
        from: this.toDateOnly(from),  // YYYY-MM-DD
        to: this.toDateOnly(to),      // YYYY-MM-DD
        guests
      }
    }
  );
}
}