import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-customer-dashboard',
  template: `
    <div class="dash-bg">
      <div class="container-fluid p-0">

        <!-- Page header card (no redundant nav buttons now) -->
        <div class="app-card p-3 p-md-4 mb-4 hero">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <div class="kicker">Customer Portal</div>
              <h2 class="fw-bold mb-1 title">Reservation Overview</h2>
              <p class="text-muted mb-0">
                Welcome back, <span class="fw-semibold">{{ name() }}</span>.
                Search rooms, manage bookings, and download invoices.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="text-muted small">Tip:</span>
              <span class="small fw-semibold">Use Quick Actions below to get started</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="row g-3 g-md-4 mb-4">
          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Total Bookings</div>
                  <div class="stat-value">{{ totalBookings }}</div>
                </div>
                <div class="stat-icon indigo">📦</div>
              </div>
              <div class="stat-foot text-muted small mt-2">All-time bookings</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Upcoming Stay</div>
                  <div class="stat-value">{{ upcomingStay }}</div>
                </div>
                <div class="stat-icon cyan">🗓️</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Next check-in (sample)</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Open Complaints</div>
                  <div class="stat-value">{{ openComplaints }}</div>
                </div>
                <div class="stat-icon orange">🎫</div>
              </div>
              <div class="stat-foot text-muted small mt-2">Pending resolution</div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-3">
            <div class="app-card p-3 stat-card h-100">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="stat-label">Profile</div>
                  <div class="stat-value">{{ profileStatus }}</div>
                </div>
                <div class="stat-icon green">✅</div>
              </div>
              <div class="stat-foot text-muted small mt-2">
                Keep details up to date
                <a routerLink="/customer/profile" class="ms-1 link-app">Update</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Main content -->
        <div class="row g-3 g-md-4">

          <!-- Quick actions (KEEP AS SAME) -->
          <div class="col-12 col-lg-7">
            <div class="app-card p-3 p-md-4 h-100">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Quick Actions</h5>
                <span class="badge text-bg-light border pill-badge">Recommended</span>
              </div>

              <p class="text-muted small mb-3">
                Start with the most common tasks. You can search rooms by date, guests, and preferences.
              </p>

              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <a routerLink="/customer/search" class="action-tile">
                    <div class="action-ico">🔎</div>
                    <div>
                      <div class="action-title">Search Available Rooms</div>
                      <div class="action-sub">Find rooms by dates & guests</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/customer/history" class="action-tile">
                    <div class="action-ico">📚</div>
                    <div>
                      <div class="action-title">View Booking History</div>
                      <div class="action-sub">Modify, cancel, or download invoices</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/customer/pay" class="action-tile">
                    <div class="action-ico">💳</div>
                    <div>
                      <div class="action-title">Pay Bills</div>
                      <div class="action-sub">Complete pending payments</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>

                <div class="col-12 col-md-6">
                  <a routerLink="/customer/complaint" class="action-tile">
                    <div class="action-ico">📝</div>
                    <div>
                      <div class="action-title">Register Complaint</div>
                      <div class="action-sub">Raise and track service requests</div>
                    </div>
                    <div class="action-go">›</div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="col-12 col-lg-5">
            <div class="app-card p-3 p-md-4 mb-3">
              <h5 class="fw-bold mb-2">Quick Tips</h5>
              <ul class="list-unstyled mb-0">
                <li class="tip d-flex gap-2 mb-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">Use date filters to find best availability.</span>
                </li>
                <li class="tip d-flex gap-2 mb-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">Invoices are available in Booking History.</span>
                </li>
                <li class="tip d-flex gap-2">
                  <span class="tip-dot"></span>
                  <span class="text-muted">Update profile to speed up check-in.</span>
                </li>
              </ul>
            </div>

            <div class="app-card p-3 p-md-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h5 class="fw-bold mb-0">Recent Activity</h5>
                <a routerLink="/customer/history" class="small link-app">View all</a>
              </div>

              <div class="activity">
                <div class="activity-item">
                  <div class="activity-dot"></div>
                  <div class="activity-body">
                    <div class="activity-title">No recent activity yet</div>
                    <div class="activity-sub text-muted">Your latest bookings and payments will appear here.</div>
                  </div>
                </div>
              </div>
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

    /* ✅ Make the top hero card background completely uniform */
.hero{
  background: #fff !important;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
  position: relative;
  overflow: hidden;
}

/* ✅ Remove any decorative gradient blob that causes color change at the end */
.hero::before,
.hero::after{
  content: none !important;
  display: none !important;
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

    .title{
      letter-spacing: -0.01em;
    }

    /* Tip pill on hero right */
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

    /* Stats */
    .stat-card{ border-radius: 16px; }
    .stat-label{
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.55);
    }
    .stat-value{
      font-size: 22px;
      font-weight: 900;
      margin-top: 4px;
      color: rgba(15,23,42,0.92);
    }
    .stat-icon{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 18px;
      border: 1px solid rgba(15,23,42,0.06);
      background: rgba(15,23,42,0.02);
    }
    .stat-icon.indigo{ background: rgba(79,70,229,0.10); border-color: rgba(79,70,229,0.18); }
    .stat-icon.cyan{ background: rgba(6,182,212,0.10); border-color: rgba(6,182,212,0.18); }
    .stat-icon.orange{ background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.22); }
    .stat-icon.green{ background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.18); }

    .pill-badge{
      border-radius: 999px;
      padding: 6px 10px;
      font-weight: 700;
      color: rgba(15, 23, 42, 0.7);
    }

    /* Action tiles (Quick Actions) */
    .action-tile{
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 12px;
      border-radius: 14px;
      text-decoration: none;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.7);
      transition: transform .08s ease, border-color .12s ease, background .12s ease;
      color: var(--app-text);
      height: 100%;
    }
    .action-tile:hover{
      transform: translateY(-1px);
      background: #fff;
      border-color: rgba(79,70,229,0.18);
    }
    .action-ico{
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 18px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex: 0 0 42px;
    }
    .action-title{
      font-weight: 900;
      line-height: 1.1;
    }
    .action-sub{
      font-size: 12px;
      color: rgba(15,23,42,0.60);
      margin-top: 3px;
    }
    .action-go{
      margin-left: auto;
      font-size: 18px;
      color: rgba(15,23,42,0.35);
      font-weight: 900;
    }

    /* Tips */
    .tip-dot{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      margin-top: 6px;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
      flex: 0 0 10px;
    }

    /* Activity */
    .activity-item{
      display: flex;
      gap: 10px;
      padding: 10px 0;
    }
    .activity-dot{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      margin-top: 6px;
      background: rgba(15,23,42,0.18);
      flex: 0 0 10px;
    }
    .activity-title{ font-weight: 800; }
    .activity-sub{ font-size: 12px; }

    .link-app{
      color: var(--app-primary);
      text-decoration: none;
      font-weight: 700;
    }
    .link-app:hover{
      text-decoration: underline;
    }
  `]
})
export class DashboardComponent {
  constructor(private auth: AuthService) {}

  name = computed(() => this.auth.user()?.fullName ?? 'Customer');

  // placeholders until you connect real API/state
  totalBookings = 0;
  upcomingStay = '—';
  openComplaints = 0;
  profileStatus = 'Active';
}