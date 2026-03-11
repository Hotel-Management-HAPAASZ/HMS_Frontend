import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { AmenityService } from '../../../core/services/amenity.service';
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
  selector: 'app-customer-dashboard',
  imports: [
    CommonModule,
    RouterLink,
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
    <div class="dash-bg">
      <div class="container-fluid p-0">

        <!-- Hero -->
        <div class="app-card p-3 p-md-4 mb-3 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Customer Portal</div>
              <h2 class="fw-bold mb-1 title">Welcome, {{ name() }}</h2>
              <p class="text-muted mb-0 small">
                Search rooms and book your stay—everything in one place.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Filter by price & amenities to narrow results</span>
            </div>
          </div>
        </div>

        <div id="search-anchor"></div>

        <!-- ACTIVE STAY ALERT -->
        <div class="app-card active-stay mb-4" *ngIf="activeStay()">
          <div class="d-flex align-items-center justify-content-between p-3 p-md-4">
            <div class="d-flex align-items-center gap-3">
              <div class="stay-icon">🏠</div>
              <div>
                <div class="kicker text-primary mb-1" style="font-size: 10px;">Current Stay</div>
                <h5 class="fw-bold mb-1">You are checked in!</h5>
                <p class="text-muted mb-0 small">
                  Room <strong class="text-dark">{{ activeStay().roomNumbers?.join(', ') }}</strong>
                  &bull; Departure: <span class="fw-semibold">{{ activeStay().checkOut }}</span>
                </p>
              </div>
            </div>
            <a routerLink="/customer/history" class="btn btn-sm btn-outline-primary pill-badge px-3">View Details</a>
          </div>
        </div>

        <!-- ═══════ PRIMARY SEARCH BAR ═══════ -->
        <form [formGroup]="form" (ngSubmit)="search()" class="app-card p-3 p-md-4 mb-3 search-bar">
          <div class="primary-fields">
            <mat-form-field appearance="outline" class="field-checkin">
              <mat-label>Check-in</mat-label>
              <input matInput [matDatepicker]="dp1" formControlName="from" [min]="today" />
              <mat-datepicker-toggle matSuffix [for]="dp1"></mat-datepicker-toggle>
              <mat-datepicker #dp1></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-checkout">
              <mat-label>Check-out</mat-label>
              <input matInput [matDatepicker]="dp2" formControlName="to" [min]="tomorrow" />
              <mat-datepicker-toggle matSuffix [for]="dp2"></mat-datepicker-toggle>
              <mat-datepicker #dp2></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-guests">
              <mat-label>Guests</mat-label>
              <input matInput type="number" min="1" formControlName="guests" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-type">
              <mat-label>Room Type</mat-label>
              <mat-select formControlName="type">
                <mat-option [value]="null">All Types</mat-option>
                <mat-option *ngFor="let t of typeOptions()" [value]="t">{{ t }}</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" class="search-btn" type="submit">
              <mat-icon class="me-1">search</mat-icon>
              Search
            </button>
          </div>

          <!-- Stay Duration Info -->
          <div class="stay-info" *ngIf="nightCount() > 0">
            <mat-icon class="info-icon">info_outline</mat-icon>
            <span>{{ nightCount() }} night{{ nightCount() > 1 ? 's' : '' }} stay</span>
            <span class="text-muted ms-1" *ngIf="hasDates()">
              ({{ form.value.from | date:'d MMM' }} → {{ form.value.to | date:'d MMM' }})
            </span>
          </div>

          <!-- More Filters Toggle -->
          <button mat-stroked-button type="button" class="more-filters-btn mt-2"
                  (click)="showFilters.set(!showFilters())">
            <mat-icon class="me-1">tune</mat-icon>
            {{ showFilters() ? 'Hide Filters' : 'More Filters' }}
            <span class="badge-count" *ngIf="activeFilterCount() > 0">{{ activeFilterCount() }}</span>
          </button>

          <!-- Collapsible Filters -->
          <div class="advanced-filters" *ngIf="showFilters()">
            <mat-divider class="my-2"></mat-divider>
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>Min Price (₹/night)</mat-label>
                <input matInput type="number" min="0" formControlName="minPrice" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Max Price (₹/night)</mat-label>
                <input matInput type="number" min="0" formControlName="maxPrice" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="filter-amenities">
                <mat-label>Amenities</mat-label>
                <mat-select formControlName="amenities" multiple>
                  <mat-option *ngFor="let a of amenityOptions()" [value]="a">{{ a }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Sort by</mat-label>
                <mat-select formControlName="sort">
                  <mat-option value="priceAsc">Price: Low → High</mat-option>
                  <mat-option value="priceDesc">Price: High → Low</mat-option>
                  <mat-option value="capacityDesc">Capacity: Most first</mat-option>
                  <mat-option value="nameAsc">Room: A → Z</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Form Errors -->
          <div class="form-errors mt-2" *ngIf="form.touched && form.errors">
            <div class="err" *ngIf="form.errors['dateRange']">
              <mat-icon>error_outline</mat-icon> {{ form.errors['dateRange'] }}
            </div>
            <div class="err" *ngIf="form.errors['fromPast']">
              <mat-icon>error_outline</mat-icon> {{ form.errors['fromPast'] }}
            </div>
            <div class="err" *ngIf="form.errors['priceRange']">
              <mat-icon>error_outline</mat-icon> {{ form.errors['priceRange'] }}
            </div>
          </div>
        </form>

        <!-- ═══════ RESULTS SUMMARY ═══════ -->
        <div class="results-summary app-card p-2 px-3 mb-3" *ngIf="searched()">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-bold">{{ results().length }}</span>
              <span class="text-muted">room{{ results().length !== 1 ? 's' : '' }} found</span>
              <span class="avail-count" *ngIf="availableCount() >= 0">
                • <span class="text-success fw-bold">{{ availableCount() }}</span> available
              </span>
              <span class="booked-count" *ngIf="bookedCount() > 0">
                • <span class="text-danger fw-bold">{{ bookedCount() }}</span> booked
              </span>
            </div>
            <button mat-stroked-button class="btn-ghost" type="button" (click)="reset()">
              <mat-icon class="me-1" style="font-size:16px;width:16px;height:16px;">refresh</mat-icon> Reset
            </button>
          </div>
        </div>

        <!-- ═══════ QUICK ACTIONS (Merged into flow) ═══════ -->
        <div class="row g-3 g-md-4 mb-3" *ngIf="!searched()">
          <div class="col-12 col-md-6">
            <a routerLink="/customer/history" class="action-tile h-100">
              <div class="action-ico">📚</div>
              <div>
                <div class="action-title">Booking History</div>
                <div class="action-sub">Modify / download invoices</div>
              </div>
              <div class="action-go">›</div>
            </a>
          </div>
          <div class="col-12 col-md-6">
            <a routerLink="/customer/complaint" class="action-tile h-100">
              <div class="action-ico">📝</div>
              <div>
                <div class="action-title">My Complaints</div>
                <div class="action-sub">Raise or track complaints</div>
              </div>
              <div class="action-go">›</div>
            </a>
          </div>
        </div>

        <!-- ═══════ NO-DATES HINT ═══════ -->
        <div class="app-card p-3 p-md-4 mb-3 hint-card" *ngIf="!searched()">
          <div class="d-flex align-items-center gap-3">
            <div class="hint-ico">📅</div>
            <div>
              <div class="fw-bold">Select dates to get started</div>
              <div class="text-muted small">Choose your check-in and check-out dates above, then click Search to see available rooms and prices.</div>
            </div>
          </div>
        </div>

        <!-- ═══════ ROOM CARDS ═══════ -->
        <div class="row g-3 g-md-4 mb-3" *ngIf="pagedResults().length > 0">
          <div class="col-12 col-lg-6" *ngFor="let r of pagedResults()">
            <div class="app-card room-card h-100"
                 [class.is-booked]="r.availabilityStatus === 'BOOKED'"
                 [class.is-available]="r.availabilityStatus === 'AVAILABLE'"
                 [class.is-browse]="r.availabilityStatus === 'BROWSE'">

              <!-- Room Image -->
              <div class="room-media">
                <img class="room-img"
                     [src]="imageForType(r.type)"
                     [alt]="r.type + ' room'"
                     loading="lazy"
                     (error)="onImgError($event)" />

                <!-- Status Badge on Image -->
                <div class="status-badge"
                     [ngClass]="{
                        'badge-available': r.availabilityStatus === 'AVAILABLE',
                        'badge-booked': r.availabilityStatus === 'BOOKED',
                        'badge-browse': r.availabilityStatus === 'BROWSE'
                     }">
                  <mat-icon class="badge-icon">
                    {{ r.availabilityStatus === 'AVAILABLE' ? 'check_circle' :
                       r.availabilityStatus === 'BOOKED' ? 'block' : 'visibility' }}
                  </mat-icon>
                  {{ r.availabilityStatus === 'BROWSE' ? 'Select Dates' :
                     (r.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Booked') }}
                </div>

                <!-- Room Type Badge -->
                <div class="type-badge">{{ r.type }}</div>
              </div>

              <!-- Card Body -->
              <div class="room-body p-3">
                <div class="d-flex align-items-start justify-content-between gap-3">
                  <div class="min-w-0">
                    <h5 class="fw-bold mb-1 text-truncate">{{ friendlyName(r) }}</h5>
                    <div class="text-muted small">
                      <mat-icon class="inline-icon">person</mat-icon>
                      Up to {{ r.maxGuests }} guest{{ r.maxGuests > 1 ? 's' : '' }}
                    </div>

                    <!-- Availability info for BOOKED rooms -->
                    <div class="booked-info mt-1" *ngIf="r.availabilityStatus === 'BOOKED'">
                      <mat-icon class="inline-icon text-danger">event_busy</mat-icon>
                      <span class="text-danger small fw-semibold">
                        Booked
                        <span *ngIf="r.unavailableUntil"> — free from {{ r.unavailableUntil | date:'d MMM yyyy' }}</span>
                      </span>
                    </div>

                    <!-- Hint for BROWSE mode -->
                    <div class="browse-info mt-1" *ngIf="r.availabilityStatus === 'BROWSE'">
                      <mat-icon class="inline-icon text-primary">calendar_today</mat-icon>
                      <span class="text-primary small fw-semibold">Select dates to check availability</span>
                    </div>
                  </div>

                  <!-- Price Column -->
                  <div class="text-end flex-shrink-0">
                    <div class="price">₹{{ r.pricePerNight }}</div>
                    <div class="text-muted small">per night</div>
                    <div class="total-price" *ngIf="nightCount() > 0 && r.availabilityStatus !== 'BOOKED'">
                      <span class="fw-bold">₹{{ r.pricePerNight * nightCount() }}</span>
                      <span class="text-muted"> total</span>
                    </div>
                  </div>
                </div>

                <!-- Amenities -->
                <div class="chips mt-2" *ngIf="r.amenities?.length">
                  <span class="chip" *ngFor="let a of r.amenities.slice(0, 5)">{{ a }}</span>
                  <span class="chip more" *ngIf="r.amenities.length > 5">+{{ r.amenities.length - 5 }}</span>
                </div>

                <!-- Footer -->
                <div class="d-flex align-items-center justify-content-between mt-3 pt-2 border-top-soft">
                  <div class="text-muted small">
                    Best for <span class="fw-semibold">{{ recommendFor(r) }}</span>
                  </div>

                  <!-- Available → Book Now -->
                  <button mat-raised-button color="primary" (click)="book(r)"
                          *ngIf="r.availabilityStatus === 'AVAILABLE'">
                    Book Now <span class="ms-1">›</span>
                  </button>

                  <!-- Browse → Select Dates first -->
                  <button mat-stroked-button color="primary" (click)="scrollToSearch()"
                          *ngIf="r.availabilityStatus === 'BROWSE'">
                    <mat-icon class="me-1" style="font-size:16px;width:16px;height:16px;">calendar_today</mat-icon>
                    Select Dates
                  </button>

                  <!-- Booked → Unavailable -->
                  <div *ngIf="r.availabilityStatus === 'BOOKED'" class="unavail-label">
                    <mat-icon class="me-1" style="font-size:16px;width:16px;height:16px;">lock</mat-icon>
                    Unavailable
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════ PAGINATION ═══════ -->
        <div class="pager app-card p-2 px-3 mb-3 d-flex align-items-center justify-content-between"
             *ngIf="results().length > pageSize">
          <div class="small text-muted">
            Page <span class="fw-semibold">{{ pageIndex() + 1 }}</span> of
            <span class="fw-semibold">{{ pageCount() }}</span>
            • Showing
            <span class="fw-semibold">{{ rangeStart() + 1 }}</span>–<span class="fw-semibold">{{ rangeEnd() }}</span>
            of <span class="fw-semibold">{{ results().length }}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button mat-stroked-button class="btn-ghost" (click)="prevPage()" [disabled]="pageIndex() === 0">‹ Prev</button>
            <button mat-raised-button color="primary" (click)="nextPage()" [disabled]="(pageIndex() + 1) >= pageCount()">Next ›</button>
          </div>
        </div>

        <!-- ═══════ EMPTY STATE ═══════ -->
        <div *ngIf="searched() && results().length === 0" class="app-card p-3 p-md-4 empty">
          <div class="d-flex gap-3 align-items-start">
            <div class="empty-ico">😕</div>
            <div>
              <h5 class="fw-bold mb-1">No rooms match your search</h5>
              <p class="text-muted mb-2">
                Try adjusting your dates, guest count, or removing filters.
              </p>
              <button mat-stroked-button class="btn-ghost" (click)="reset()">Clear Filters & Try Again</button>
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
      border-radius: 18px;
    }

    /* Hero */
    .hero{
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      position: relative;
      overflow: hidden;
    }
    .hero::before, .hero::after { content: none !important; display: none !important; }

    .kicker{
      font-size: 12px; font-weight: 800; letter-spacing: .08em;
      text-transform: uppercase; color: rgba(15,23,42,0.55); margin-bottom: 6px;
    }
    .title{ letter-spacing: -0.01em; }

    .hero-badge{
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08); background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-dot{
      width: 8px; height: 8px; border-radius: 999px;
      background: var(--app-secondary); box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }

    /* ═══ Search Bar ═══ */
    .search-bar {
      background: #fff !important;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 6px 20px rgba(2, 8, 23, 0.06);
    }
    .search-bar::before, .search-bar::after { content: none !important; display: none !important; }
    .primary-fields {
      display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap;
    }
    .primary-fields mat-form-field { flex: 1; min-width: 140px; }
    .primary-fields .search-btn {
      height: 56px; min-width: 120px; border-radius: 14px;
      font-weight: 800; font-size: 14px; align-self: flex-start;
    }

    .stay-info {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 8px; padding: 6px 12px; border-radius: 999px;
      font-size: 13px; font-weight: 700;
      border: 1px solid rgba(79,70,229,0.15); background: rgba(79,70,229,0.06);
      color: rgba(79,70,229,0.9);
    }
    .info-icon { font-size: 16px; width: 16px; height: 16px; }

    .more-filters-btn {
      border-radius: 999px !important; border-color: rgba(15,23,42,0.12) !important;
      font-weight: 700 !important; font-size: 13px !important;
    }
    .badge-count {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--app-primary); color: #fff;
      font-size: 11px; font-weight: 900; margin-left: 6px;
    }

    .advanced-filters { animation: slideDown .2s ease; }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    .filter-row mat-form-field { flex: 1; min-width: 160px; }
    .filter-amenities { flex: 2 !important; min-width: 240px !important; }

    .form-errors { display: grid; gap: 6px; }
    .err {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 10px;
      border: 1px solid rgba(239,68,68,0.20); background: rgba(239,68,68,0.06);
      color: rgba(127,29,29,0.92); font-weight: 600; font-size: 13px;
    }
    .err mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Action Tiles */
    .action-tile{
      display: flex; align-items: center; gap: 12px;
      padding: 16px; border-radius: 18px; text-decoration: none;
      border: 1px solid rgba(15,23,42,0.08); background: rgba(255,255,255,0.7);
      transition: transform .1s ease, background .1s ease;
      color: var(--app-text);
    }
    .action-tile:hover{
      transform: translateY(-2px); background: #fff;
      border-color: rgba(79,70,229,0.18);
    }
    .action-ico{
      width: 48px; height: 48px; border-radius: 14px;
      display: grid; place-items: center; font-size: 20px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16); flex: 0 0 48px;
    }
    .action-title{ font-weight: 900; font-size: 15px; }
    .action-sub{ font-size: 12px; color: rgba(15,23,42,0.6); margin-top: 2px; }
    .action-go{ margin-left: auto; font-size: 18px; color: rgba(15,23,42,0.3); font-weight: 900; }

    /* Hint Card */
    .hint-card {
      border: 1px dashed rgba(79,70,229,0.25); background: rgba(79,70,229,0.04);
      border-radius: 16px;
    }
    .hint-ico {
      width: 48px; height: 48px; border-radius: 14px;
      display: grid; place-items: center; font-size: 24px;
      background: rgba(79,70,229,0.08); border: 1px solid rgba(79,70,229,0.15);
      flex: 0 0 48px;
    }

    /* Results */
    .results-summary {
      border-radius: 14px; border: 1px solid var(--app-border); background: #fff;
      font-size: 14px;
    }

    /* Room Cards */
    .room-card {
      border-radius: 18px; overflow: hidden;
      border: 1px solid var(--app-border); background: #fff;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .room-card:hover:not(.is-booked) {
      transform: translateY(-3px); box-shadow: 0 15px 35px rgba(2, 8, 23, 0.1);
    }
    .room-card.is-booked {
      opacity: 0.75; border: 1px dashed rgba(239,68,68,0.2); background: rgba(239,68,68,0.02);
    }
    .room-media { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; }
    .room-img { width: 100%; height: 100%; object-fit: cover; }

    .status-badge {
      position: absolute; top: 12px; left: 12px;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 800; backdrop-filter: blur(8px);
    }
    .badge-icon { font-size: 14px; width: 14px; height: 14px; }
    .badge-available { background: rgba(34,197,94,0.9); color: #fff; }
    .badge-booked { background: rgba(239,68,68,0.85); color: #fff; }
    .badge-browse { background: rgba(255,255,255,0.9); color: var(--app-primary); }

    .type-badge {
      position: absolute; bottom: 12px; right: 12px;
      padding: 5px 10px; border-radius: 999px;
      font-size: 10px; font-weight: 900; background: rgba(255,255,255,0.9);
      color: var(--app-text); border: 1px solid rgba(0,0,0,0.05);
      text-transform: uppercase; letter-spacing: .02em;
    }

    .room-body { background: #fff; }
    .price { font-size: 24px; font-weight: 900; color: var(--app-text); }
    .total-price {
      margin-top: 4px; padding: 4px 8px; border-radius: 8px;
      background: rgba(79,70,229,0.06); border: 1px solid rgba(79,70,229,0.1);
      font-size: 11px; color: var(--app-primary); font-weight: 700;
    }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
      border: 1px solid rgba(0,0,0,0.06); background: rgba(0,0,0,0.02); color: rgba(0,0,0,0.6);
    }
    .chip.more { background: rgba(6,182,212,0.08); color: #0891b2; border-color: rgba(6,182,212,0.1); }

    .border-top-soft { border-top: 1px solid rgba(0,0,0,0.05); }

    .unavail-label {
      display: inline-flex; align-items: center; padding: 8px 14px;
      border-radius: 999px; font-size: 13px; font-weight: 700;
      background: rgba(239,68,68,0.08); color: #b91c1c; border: 1px solid rgba(239,68,68,0.1);
    }

    .inline-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; vertical-align: middle; margin-right: 4px; }

    /* Pager */
    .pager { border-radius: 16px; border: 1px solid var(--app-border); background: #fff; }
    .btn-ghost { border-radius: 12px; border-color: rgba(0,0,0,0.1); font-weight: 700; }

    /* Empty */
    .empty {
      border: 1px dashed rgba(0,0,0,0.1); background: rgba(255,255,255,0.5); border-radius: 20px;
    }
    .empty-ico {
      width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center;
      font-size: 24px; background: rgba(0,0,0,0.03); flex: 0 0 54px;
    }

    /* Active Stay */
    .active-stay {
      background: linear-gradient(to right, rgba(79,70,229,0.05), rgba(6,182,212,0.05));
      border: 1px solid rgba(79,70,229,0.15);
      border-radius: 20px;
    }
    .stay-icon {
      width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center;
      font-size: 20px; background: #fff; border: 1px solid rgba(79,70,229,0.2);
    }

    @media (max-width: 992px) {
      .primary-fields { flex-direction: column; }
      .primary-fields mat-form-field, .primary-fields .search-btn { width: 100%; }
      .filter-row { flex-direction: column; }
      .filter-row mat-form-field { width: 100% !important; }
    }
  `]
})
export class DashboardComponent {
  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private rooms: RoomService,
    private bookings: BookingService,
    private router: Router,
    private amenitiesSvc: AmenityService
  ) {}

  // Greeting
  name = computed(() => this.auth.user()?.fullName ?? 'Customer');

  // --- Search state ---
  results = signal<Room[]>([]);
  searched = signal(false);
  amenityNames = signal<string[]>([]);
  showFilters = signal(false);
  activeStay = signal<any>(null);

  today = new Date();
  tomorrow = new Date(Date.now() + 86_400_000);

  // Paging
  readonly pageSize = 8;
  pageIndex = signal(0);

  pageCount = computed(() => {
    const total = this.results().length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize);
  });

  rangeStart = computed(() => this.pageIndex() * this.pageSize);
  rangeEnd = computed(() => Math.min(this.rangeStart() + this.pageSize, this.results().length));

  pagedResults = computed(() => this.results().slice(this.rangeStart(), this.rangeEnd()));

  // Computed helpers
  hasDates = computed(() => {
    const v = this.form.value;
    return !!(v.from && v.to);
  });

  nightCount = computed(() => {
    const v = this.form.value;
    if (!v.from || !v.to) return 0;
    const diff = startOfDay(v.to).getTime() - startOfDay(v.from).getTime();
    return Math.max(0, Math.round(diff / 86_400_000));
  });

  availableCount = computed(() => this.results().filter(r => r.availabilityStatus === 'AVAILABLE').length);
  bookedCount = computed(() => this.results().filter(r => r.availabilityStatus === 'BOOKED').length);

  activeFilterCount = computed(() => {
    const v = this.form.value;
    let count = 0;
    if (v.minPrice != null) count++;
    if (v.maxPrice != null) count++;
    if (v.amenities && v.amenities.length > 0) count++;
    if (v.sort && v.sort !== 'priceAsc') count++;
    return count;
  });

  nextPage() {
    if (this.pageIndex() + 1 < this.pageCount()) this.pageIndex.set(this.pageIndex() + 1);
  }
  prevPage() {
    if (this.pageIndex() > 0) this.pageIndex.set(this.pageIndex() - 1);
  }

  ngOnInit(): void {
    this.amenitiesSvc.listNames().subscribe({
      next: (names: string[]) => this.amenityNames.set(names),
      error: (err) => console.error('Failed to load amenity names', err)
    });

    const user = this.auth.user();
    if (user) {
      this.bookings.getActiveStay(user.id).subscribe({
        next: (list: any[]) => {
          if (list && list.length > 0) {
            this.activeStay.set(list[0]);
          }
        }
      });
    }
  }

  form = this.fb.group({
    from: [null as Date | null],
    to: [null as Date | null],
    guests: [1, [Validators.min(1)]],
    type: [null as string | null],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
    amenities: [[] as string[]],
    sort: ['priceAsc' as SortKey],
  }, { validators: [searchValidator()] });

  typeOptions() {
    return ['Standard', 'Deluxe', 'Suite'];
  }

  amenityOptions() {
    return this.amenityNames();
  }

  reset() {
    this.form.reset({
      from: null, to: null, guests: 1,
      type: null, minPrice: null, maxPrice: null,
      amenities: [], sort: 'priceAsc',
    });
    this.results.set([]);
    this.searched.set(false);
    this.pageIndex.set(0);
  }

  private toDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  search() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.searched.set(true);
    this.pageIndex.set(0);

    const v = this.form.getRawValue();
    const adults = v.guests ?? 1;
    const roomType = (v.type || 'ALL_ROOMS').toUpperCase();

    this.rooms.searchAvailableRooms({
      from: v.from ?? undefined,
      to: v.to ?? undefined,
      adults,
      children: 0,
      roomType
    }).subscribe({
      next: (rooms) => {
        const minPrice = v.minPrice ?? null;
        const maxPrice = v.maxPrice ?? null;
        const amenities = v.amenities ?? [];
        const sort = v.sort ?? 'priceAsc';

        let res = rooms
          .filter(r => minPrice != null ? r.pricePerNight >= minPrice : true)
          .filter(r => maxPrice != null ? r.pricePerNight <= maxPrice : true)
          .filter(r => amenities.length ? amenities.every(a => r.amenities.includes(a)) : true);

        // Sort: available rooms first, then booked
        res = [...res].sort((a, b) => {
          const statusOrder = (s: string | undefined) =>
            s === 'AVAILABLE' ? 0 : s === 'BROWSE' ? 1 : 2;
          const statusDiff = statusOrder(a.availabilityStatus) - statusOrder(b.availabilityStatus);
          if (statusDiff !== 0) return statusDiff;

          switch (sort) {
            case 'priceAsc': return a.pricePerNight - b.pricePerNight;
            case 'priceDesc': return b.pricePerNight - a.pricePerNight;
            case 'capacityDesc': return b.maxGuests - a.maxGuests;
            case 'nameAsc': return a.name.localeCompare(b.name);
            default: return 0;
          }
        });

        this.results.set(res);
      },
      error: () => this.results.set([])
    });
  }

  friendlyName(r: Room): string {
    const typeLabel = (r.type ?? '').charAt(0).toUpperCase() + (r.type ?? '').slice(1).toLowerCase();
    return `${typeLabel} Room ${r.roomNumber || r.name}`;
  }

  recommendFor(r: Room) {
    if (r.maxGuests >= 4) return 'Families';
    if (r.maxGuests === 3) return 'Small groups';
    return 'Couples / Solo';
  }

  scrollToSearch() {
    const el = document.getElementById('search-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  book(room: Room) {
    const v = this.form.value;
    const from = v.from ?? null;
    const to = v.to ?? null;
    const guests = v.guests ?? 1;

    if (!from || !to) {
      this.scrollToSearch();
      return;
    }

    if (!room?.id) return;

    this.router.navigate(['/customer/book'], {
      queryParams: {
        roomId: room.id,
        from: this.toDateOnly(from),
        to: this.toDateOnly(to),
        guests
      }
    });
  }

  imageForType(type: string | null | undefined): string {
    const t = (type ?? '').toLowerCase().trim();
    if (t === 'standard') return 'https://product.hstatic.net/1000405477/product/deluxe_room_001_e9cf9d71f0ea428ebf597874150a6c70.jpg';
    if (t === 'deluxe') return 'https://dq5r178u4t83b.cloudfront.net/wp-content/uploads/sites/125/2020/06/15182916/Sofitel-Dubai-Wafi-Luxury-Room-Bedroom-Skyline-View-Image1_WEB.jpg';
    if (t === 'suite') return 'https://i.dailymail.co.uk/i/pix/2015/04/21/17/27D22D6F00000578-3049121-image-a-13_1429632909327.jpg';
    if (t === 'executive') return 'https://www.landmarklondon.co.uk/wp-content/uploads/2019/05/Executive-Room-1800x1200.jpg';
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop';
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) img.style.visibility = 'hidden';
  }
}