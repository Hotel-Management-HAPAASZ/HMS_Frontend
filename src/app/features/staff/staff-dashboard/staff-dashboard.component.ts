import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ComplaintService } from '../../../core/services/complaint.service';

// If your Complaint type is exported somewhere and already used in your app,
// you can import it and replace `any` with `Complaint`.
// import { Complaint } from '../../../core/models/complaint.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dash-bg">
      <div class="wrap">

        <!-- Hero -->
        <div class="app-card hero">
          <div class="hero-row">
            <div>
              <div class="kicker">Staff Portal</div>
              <h2 class="title">Operations Overview</h2>
              <p class="sub">
                Welcome, <span class="strong">{{ name() }}</span>.
                Track complaint queues and manage housekeeping tasks.
              </p>
            </div>

            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span class="muted">Tip:</span>
              <span class="small strong">Start from “Quick Actions” to process requests faster</span>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats">

          <div class="app-card stat-card">
            <div class="stat-top">
              <div>
                <div class="stat-label">Open Complaints</div>
                <div class="stat-value">{{ openCount() }}</div>
              </div>
              <div class="stat-icon orange">🎫</div>
            </div>
            <div class="stat-foot">Pending triage / assignment</div>
          </div>

          <div class="app-card stat-card">
            <div class="stat-top">
              <div>
                <div class="stat-label">In Progress</div>
                <div class="stat-value">{{ inProgressCount() }}</div>
              </div>
              <div class="stat-icon cyan">⏳</div>
            </div>
            <div class="stat-foot">Currently being handled</div>
          </div>

          <div class="app-card stat-card">
            <div class="stat-top">
              <div>
                <div class="stat-label">Resolved</div>
                <div class="stat-value">{{ resolvedCount() }}</div>
              </div>
              <div class="stat-icon green">✅</div>
            </div>
            <div class="stat-foot">Resolved / closed tickets</div>
          </div>

          <div class="app-card stat-card">
            <div class="stat-top">
              <div>
                <div class="stat-label">Total Complaints</div>
                <div class="stat-value">{{ totalCount() }}</div>
              </div>
              <div class="stat-icon indigo">📦</div>
            </div>
            <div class="stat-foot">
              All-time volume
              <a routerLink="/staff/complaints" class="link-app">View</a>
            </div>
          </div>

        </div>

        <!-- Main -->
        <div class="grid">

          <!-- Quick Actions -->
          <div class="app-card">
            <div class="card-head">
              <h5 class="h5">Quick Actions</h5>
              <span class="pill-badge">Recommended</span>
            </div>

            <p class="muted small">
              Jump to common staff tasks: review complaint queue, update status, or manage housekeeping.
            </p>

            <div class="actions">
              <a routerLink="/staff/complaints" class="action-tile">
                <div class="action-ico">🧾</div>
                <div>
                  <div class="action-title">View Complaint Queue</div>
                  <div class="action-sub">Open & in-progress tickets</div>
                </div>
                <div class="action-go">›</div>
              </a>

              <a routerLink="/staff/complaints" class="action-tile">
                <div class="action-ico">🛠️</div>
                <div>
                  <div class="action-title">Update Complaint Status</div>
                  <div class="action-sub">Assign, progress & resolve</div>
                </div>
                <div class="action-go">›</div>
              </a>

              <a routerLink="/staff/housekeeping" class="action-tile">
                <div class="action-ico">🧹</div>
                <div>
                  <div class="action-title">Manage Housekeeping</div>
                  <div class="action-sub">Rooms, tasks & schedules</div>
                </div>
                <div class="action-go">›</div>
              </a>

              <a routerLink="/staff/dashboard" class="action-tile">
                <div class="action-ico">📊</div>
                <div>
                  <div class="action-title">Daily Snapshot</div>
                  <div class="action-sub">Monitor workload & trends</div>
                </div>
                <div class="action-go">›</div>
              </a>
            </div>
          </div>

          <!-- Right column -->
          <div class="right">

            <div class="app-card">
              <h5 class="h5">Quick Tips</h5>
              <ul class="tips">
                <li class="tip"><span class="tip-dot"></span><span>Prioritize older OPEN tickets to meet SLA.</span></li>
                <li class="tip"><span class="tip-dot"></span><span>Mark IN_PROGRESS once assigned to a staff member.</span></li>
                <li class="tip"><span class="tip-dot"></span><span>Close as RESOLVED only after confirmation.</span></li>
              </ul>
            </div>

            <div class="app-card">
              <div class="card-head">
                <h5 class="h5">Queue Preview</h5>
                <a routerLink="/staff/complaints" class="link-app small">View all</a>
              </div>

              <div class="activity">
                <ng-container *ngIf="recentOpen().length; else empty">
                  <div class="activity-item" *ngFor="let c of recentOpen()">
                    <div class="activity-dot"></div>
                    <div class="activity-body">
                      <!-- ✅ No 'title' used here (avoids your build error) -->
                      <div class="activity-title">{{ complaintLabel(c) }}</div>
                      <div class="activity-sub">
                        Status: <strong>{{ c.status }}</strong>
                      </div>
                    </div>
                  </div>
                </ng-container>

                <ng-template #empty>
                  <div class="activity-item">
                    <div class="activity-dot"></div>
                    <div class="activity-body">
                      <div class="activity-title">No open tickets right now</div>
                      <div class="activity-sub">Your current queue will appear here.</div>
                    </div>
                  </div>
                </ng-template>
              </div>

            </div>

          </div>
        </div>

        <div class="footer">© 2026 Hotel Booking System</div>
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
      min-height: calc(100vh - 64px);
    }

    .wrap{ padding: 18px; max-width: 1180px; margin: 0 auto; }

    .app-card{
      background: #fff;
      border: 1px solid var(--app-border);
      border-radius: 18px;
      box-shadow: 0 10px 25px rgba(2, 8, 23, 0.08);
      padding: 16px;
    }

    /* Hero */
    .hero{ margin-bottom: 16px; overflow: hidden; }
    .hero-row{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .kicker{
      display:inline-flex;
      align-items:center;
      gap:8px;
      font-size:12px;
      font-weight:800;
      letter-spacing:.08em;
      text-transform:uppercase;
      color: rgba(15,23,42,0.55);
      margin-bottom: 6px;
    }
    .title{
      font-weight: 900;
      letter-spacing: -0.01em;
      margin: 0 0 6px 0;
    }
    .sub{ margin:0; color: rgba(15,23,42,0.62); }
    .strong{ font-weight: 800; color: rgba(15,23,42,0.9); }

    .hero-badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:10px 12px;
      border-radius:999px;
      border:1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      white-space: nowrap;
    }
    .badge-dot{
      width:8px; height:8px; border-radius:999px;
      background: var(--app-secondary);
      box-shadow: 0 0 0 4px rgba(6,182,212,0.12);
    }
    .muted{ color: rgba(15,23,42,0.60); }
    .small{ font-size: 12px; }

    /* Stats */
    .stats{
      display:grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    @media (max-width: 1100px){ .stats{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media (max-width: 560px){ .stats{ grid-template-columns: 1fr; } }

    .stat-card{ border-radius: 16px; }
    .stat-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .stat-label{
      font-size:12px; font-weight:800; letter-spacing:.06em;
      text-transform: uppercase; color: rgba(15,23,42,0.55);
    }
    .stat-value{ font-size:22px; font-weight:900; margin-top:4px; color: rgba(15,23,42,0.92); }
    .stat-foot{ margin-top: 10px; font-size: 12px; color: rgba(15,23,42,0.55); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

    .stat-icon{
      width:44px; height:44px; border-radius:14px;
      display:grid; place-items:center; font-size:18px;
      border:1px solid rgba(15,23,42,0.06);
      background: rgba(15,23,42,0.02);
    }
    .stat-icon.indigo{ background: rgba(79,70,229,0.10); border-color: rgba(79,70,229,0.18); }
    .stat-icon.cyan{ background: rgba(6,182,212,0.10); border-color: rgba(6,182,212,0.18); }
    .stat-icon.orange{ background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.22); }
    .stat-icon.green{ background: rgba(34,197,94,0.10); border-color: rgba(34,197,94,0.18); }

    /* Main grid */
    .grid{
      display:grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 14px;
      align-items: start;
    }
    @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }

    /* ✅ Right column spacing between Quick Tips and Queue Preview */
.right{
  display: grid;
  gap: 14px;
}

    .card-head{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      margin-bottom: 6px;
    }
    .h5{ margin:0; font-weight: 900; font-size: 16px; }

    .pill-badge{
      border-radius: 999px;
      padding: 6px 10px;
      font-weight: 700;
      color: rgba(15, 23, 42, 0.7);
      background: rgba(15,23,42,0.02);
      border: 1px solid rgba(15,23,42,0.08);
      font-size: 12px;
    }

    /* Action tiles */
    .actions{
      display:grid;
      grid-template-columns: repeat(2, minmax(0,1fr));
      gap: 10px;
      margin-top: 12px;
    }
    @media (max-width: 720px){ .actions{ grid-template-columns: 1fr; } }

    .action-tile{
      display:flex; align-items:center; gap:12px;
      padding: 12px;
      border-radius: 14px;
      text-decoration: none;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(255,255,255,0.7);
      transition: transform .08s ease, border-color .12s ease, background .12s ease;
      color: var(--app-text);
    }
    .action-tile:hover{
      transform: translateY(-1px);
      background: #fff;
      border-color: rgba(79,70,229,0.18);
    }
    .action-ico{
      width:42px; height:42px; border-radius:14px;
      display:grid; place-items:center;
      font-size:18px;
      background: linear-gradient(135deg, rgba(79,70,229,0.10), rgba(6,182,212,0.08));
      border: 1px solid rgba(79,70,229,0.16);
      flex: 0 0 42px;
    }
    .action-title{ font-weight: 900; line-height: 1.1; }
    .action-sub{ font-size:12px; color: rgba(15,23,42,0.60); margin-top: 3px; }
    .action-go{ margin-left:auto; font-size:18px; color: rgba(15,23,42,0.35); font-weight: 900; }

    /* Tips */
    .tips{ list-style:none; padding:0; margin: 10px 0 0 0; }
    .tip{ display:flex; gap:10px; align-items:flex-start; margin: 8px 0; color: rgba(15,23,42,0.62); }
    .tip-dot{
      width:10px; height:10px; border-radius:999px; margin-top:6px;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 6px 12px rgba(79, 70, 229, 0.15);
      flex: 0 0 10px;
    }

    /* Activity */
    .activity{ margin-top: 10px; }
    .activity-item{ display:flex; gap:10px; padding: 10px 0; }
    .activity-dot{
      width:10px; height:10px; border-radius:999px; margin-top:6px;
      background: rgba(15,23,42,0.18);
      flex: 0 0 10px;
    }
    .activity-title{ font-weight: 800; }
    .activity-sub{ font-size: 12px; color: rgba(15,23,42,0.60); }

    .link-app{
      color: var(--app-primary);
      text-decoration: none;
      font-weight: 700;
    }
    .link-app:hover{ text-decoration: underline; }

    .footer{ text-align:center; margin-top: 14px; font-size: 12px; color: rgba(15,23,42,0.5); }
  `]
})
export class StaffDashboardComponent {
  constructor(private auth: AuthService, private complaintService: ComplaintService) {}

  // ✅ validation: handles empty/undefined user names
  name = computed(() => this.auth.user()?.fullName?.trim() || 'Staff');

  /**
   * ✅ validation: always returns an array.
   * Your existing code uses complaints.list() directly.
   * If list() returns null/undefined, this avoids runtime crashes.
   */
  all = computed(() => {
    const list = this.complaintService.list?.();
    return Array.isArray(list) ? list : [];
  });

  // ✅ status safe accessor
  private statusOf(c: any): string {
    return (c?.status ?? '').toString();
  }

  totalCount = computed(() => this.all().length);

  openCount = computed(() =>
    this.all().filter(c => this.statusOf(c) === 'OPEN').length
  );

  inProgressCount = computed(() =>
    this.all().filter(c => this.statusOf(c) === 'IN_PROGRESS').length
  );

  resolvedCount = computed(() =>
    this.all().filter(c => ['RESOLVED', 'CLOSED'].includes(this.statusOf(c))).length
  );

  /**
   * ✅ For queue preview – shows OPEN items only
   * Note: we avoid referencing properties that may not exist on Complaint (like title).
   */
  recentOpen = computed(() =>
    this.all()
      .filter(c => this.statusOf(c) === 'OPEN')
      .slice(0, 3)
  );

  /**
   * ✅ Safe label generator that does NOT depend on any specific Complaint fields.
   * Uses id if available; otherwise a generic label.
   */
  complaintLabel(c: any): string {
    const id = c?.id ?? c?.complaintId ?? c?.ticketId ?? null;
    if (id !== null && id !== undefined && `${id}`.trim() !== '') {
      return `Complaint #${id}`;
    }
    return 'Complaint';
  }
}