import { Component, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-customer-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule
  ],
  template: `
  <mat-sidenav-container class="shell">

    <!-- SIDEBAR -->
    <mat-sidenav mode="side" opened class="sidebar">
      <!-- Brand block -->
      <a class="brand" routerLink="/customer/dashboard">
        <div class="brand-mark">H</div>
        <div class="brand-text">
          <div class="brand-title">Hotel Booking</div>
          <div class="brand-subtitle">Customer Portal</div>
        </div>
      </a>

      <!-- Nav -->
      <mat-nav-list class="nav">
        <a mat-list-item
           routerLink="/customer/dashboard"
           routerLinkActive="active-link"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon class="nav-icon">dashboard</mat-icon>
          <span class="nav-text">Dashboard</span>
        </a>

        <a mat-list-item routerLink="/customer/search" routerLinkActive="active-link">
          <mat-icon class="nav-icon">search</mat-icon>
          <span class="nav-text">Search Rooms</span>
        </a>

        <a mat-list-item routerLink="/customer/history" routerLinkActive="active-link">
          <mat-icon class="nav-icon">history</mat-icon>
          <span class="nav-text">Booking History</span>
        </a>

        <div class="nav-section">Support</div>

        <a mat-list-item routerLink="/customer/complaint" routerLinkActive="active-link">
          <mat-icon class="nav-icon">report_problem</mat-icon>
          <span class="nav-text">Register Complaint</span>
        </a>

        <a mat-list-item routerLink="/customer/track" routerLinkActive="active-link">
          <mat-icon class="nav-icon">track_changes</mat-icon>
          <span class="nav-text">Track Complaints</span>
        </a>

        <div class="nav-section">Account</div>

        <a mat-list-item routerLink="/customer/profile" routerLinkActive="active-link">
          <mat-icon class="nav-icon">person</mat-icon>
          <span class="nav-text">Profile</span>
        </a>
      </mat-nav-list>

      <!-- Sidebar footer user chip -->
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">{{ initials() }}</div>
          <div class="user-meta">
            <div class="user-name">{{ name() }}</div>
            <div class="user-role">Customer</div>
          </div>
        </div>
      </div>
    </mat-sidenav>

    <!-- MAIN -->
    <mat-sidenav-content class="main">

      <!-- TOPBAR -->
      <mat-toolbar class="topbar">
        <div class="topbar-left">
          <div class="page-title">
            <div class="title">Reservation Overview</div>
            <div class="subtitle">Search rooms, manage bookings & download invoices</div>
          </div>
        </div>

        <div class="topbar-right">
          <div class="pill">
            <span class="dot"></span>
            <span class="pill-text">Signed in as</span>
            <strong class="pill-name">{{ name() }}</strong>
          </div>

          <button mat-stroked-button class="logout-btn" (click)="logout()">
            Logout
          </button>
        </div>
      </mat-toolbar>

      <!-- Routed pages -->
      <div class="content">
        <router-outlet></router-outlet>
      </div>

    </mat-sidenav-content>

  </mat-sidenav-container>
  `,
  styles: [`
    /* ===== Shell ===== */
    .shell{
      height: 100vh;
      background: var(--app-bg);
    }

    /* ===== Sidebar ===== */
    .sidebar{
      width: 270px;
      background: #fff;
      border-right: 1px solid var(--app-border);
      padding: 14px 12px;
    }

    .brand{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--app-text);
  border: 1px solid rgba(15,23,42,0.06);

  /* ✅ FIX: prevent any background strip artifacts */
  overflow: hidden;
  background-clip: padding-box;

  /* safer, cleaner (still premium). You can keep gradient if you want. */
  background: #fff;
  box-shadow: 0 10px 25px rgba(2, 8, 23, 0.04);
}

/* Optional: if you still want a subtle gradient, use this instead of background:#fff */
/*
.brand{
  background:
    radial-gradient(700px 300px at 20% 10%, rgba(79,70,229,0.10), transparent 55%),
    #fff;
}
*/

    .brand-mark{
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
      flex: 0 0 42px;
    }

    .brand-title{
      font-weight: 900;
      line-height: 1.1;
      font-size: 14px;
    }
    .brand-subtitle{
      font-size: 12px;
      color: rgba(15,23,42,0.6);
      margin-top: 2px;
    }

    .nav{
      margin-top: 10px;
    }

    .nav-section{
      margin: 14px 10px 6px;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: rgba(15,23,42,0.45);
      font-weight: 800;
    }

    /* ===== Material list item polish ===== */
    /* Ensure each list item aligns perfectly */
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__content{
  align-items: center !important;
}

/* ✅ Give icon its own fixed column and center it */
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__start{
  width: 34px !important;                /* more breathing space */
  min-width: 34px !important;
  margin-right: 10px !important;         /* icon-label spacing */
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* ✅ Remove any default top/baseline offset */
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__start,
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__start *{
  margin-top: 0 !important;
  transform: translateY(0) !important;
}

/* ✅ Icon sizing and baseline fix */
:host ::ng-deep .sidebar .mat-mdc-list-item mat-icon.nav-icon{
  width: 22px !important;
  height: 22px !important;
  font-size: 20px !important;
  line-height: 22px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: middle !important;
  color: rgba(15,23,42,0.60);
  margin-right: 12px !important;
}

/* ✅ Label alignment and consistent typography */
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__primary-text,
.nav-text{
  display: inline-flex !important;
  align-items: center !important;
  line-height: 1.2 !important;
  font-weight: 700;
  color: rgba(15,23,42,0.78);
}

/* Optional: slightly more padding inside each item for premium feel */
:host ::ng-deep .sidebar .mat-mdc-list-item{
  border-radius: 12px;
  margin: 6px 6px;
}
:host ::ng-deep .sidebar .mat-mdc-list-item .mdc-list-item__content{
  padding: 10px 10px !important;
}

    

    .nav-text{
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
      font-weight: 700;
      color: rgba(15,23,42,0.78);
    }

    /* Active link */
    :host ::ng-deep .sidebar a.active-link{
      background: linear-gradient(135deg, rgba(79,70,229,0.14), rgba(6,182,212,0.10)) !important;
      border: 1px solid rgba(79,70,229,0.18) !important;
    }
    :host ::ng-deep .sidebar a.active-link mat-icon.nav-icon{
      color: var(--app-primary) !important;
    }
    :host ::ng-deep .sidebar a.active-link .nav-text{
      color: rgba(15,23,42,0.92) !important;
    }

    /* Sidebar footer */
    .sidebar-footer{
      margin-top: 16px;
      padding: 14px 6px 0;
      border-top: 1px solid var(--app-border);
    }

    .user-chip{
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(15,23,42,0.02);
      border: 1px solid rgba(15,23,42,0.06);
    }

    .user-avatar{
      width: 38px;
      height: 38px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-weight: 900;
      color: #fff;
      background: linear-gradient(135deg, var(--app-primary), var(--app-secondary));
      flex: 0 0 38px;
      font-size: 13px;
    }

    .user-name{
      font-weight: 900;
      line-height: 1.1;
      font-size: 13px;
    }
    .user-role{
      font-size: 12px;
      color: rgba(15,23,42,0.55);
      margin-top: 2px;
    }

    /* ===== Topbar ===== */
    .main{
      background: var(--app-bg);
    }

    .topbar{
      background:
        radial-gradient(1000px 450px at 10% 20%, rgba(79,70,229,0.08), transparent 60%),
        radial-gradient(900px 450px at 90% 10%, rgba(6,182,212,0.08), transparent 55%),
        #fff !important;
      border-bottom: 1px solid var(--app-border);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .page-title .title{
      font-weight: 900;
      font-size: 18px;
      line-height: 1.1;
      color: rgba(15,23,42,0.95);
    }
    .page-title .subtitle{
      margin-top: 2px;
      font-size: 12px;
      color: rgba(15,23,42,0.6);
    }

    .topbar-right{
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .pill{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
      background: rgba(15,23,42,0.02);
      font-size: 13px;
      color: rgba(15,23,42,0.7);
    }

    .dot{
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--app-success);
      box-shadow: 0 0 0 4px rgba(34,197,94,0.12);
    }

    .pill-name{
      color: rgba(15,23,42,0.92);
    }

    .logout-btn{
      border-color: rgba(79,70,229,0.35) !important;
      color: var(--app-primary) !important;
      border-radius: 999px !important;
      padding: 0 14px !important;
      height: 34px;
    }

    .content{
      padding: 18px;
    }

    :host ::ng-deep .mat-toolbar-single-row{
      height: auto !important;
      min-height: 64px;
    }
  `]
})
export class CustomerLayoutComponent {
  constructor(private auth: AuthService, private router: Router) {}

  name = computed(() => this.auth.user()?.fullName ?? 'Customer');

  initials = computed(() => {
    const n = this.auth.user()?.fullName ?? 'Customer';
    const parts = n.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}