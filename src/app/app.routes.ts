import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },

  // AUTH LAYOUT
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component')
        .then(m => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component')
            .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component')
            .then(m => m.RegisterComponent)
      },

      // 🔐 Extra auth flows from your friend
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password.component')
            .then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'verify-otp',
        loadComponent: () =>
          import('./features/auth/verify-otp.component')
            .then(m => m.VerifyOtpComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password.component')
            .then(m => m.ResetPasswordComponent)
      },
    ]
  },

  // CUSTOMER LAYOUT
  {
    path: 'customer',
    canActivate: [authGuard, roleGuard(['CUSTOMER'])],
    loadComponent: () =>
      import('./layouts/customer-layout/customer-layout.component')
        .then(m => m.CustomerLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/customer/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/customer/search-rooms/search-rooms.component')
            .then(m => m.SearchRoomsComponent)
      },
      {
        path: 'book',
        loadComponent: () =>
          import('./features/customer/book-room/book-room.component')
            .then(m => m.BookRoomComponent)
      },
      {
        path: 'pay',
        loadComponent: () =>
          import('./features/customer/pay-bill/pay-bill.component')
            .then(m => m.PayBillComponent)
      },
      {
        path: 'invoice',
        loadComponent: () =>
          import('./features/customer/invoice/invoice.component')
            .then(m => m.InvoiceComponent)
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/customer/booking-history/booking-history.component')
            .then(m => m.BookingHistoryComponent)
      },
      {
        path: 'modify',
        loadComponent: () =>
          import('./features/customer/modify-booking/modify-booking.component')
            .then(m => m.ModifyBookingComponent)
      },
      {
        path: 'cancel',
        loadComponent: () =>
          import('./features/customer/cancel-booking/cancel-booking.component')
            .then(m => m.CancelBookingComponent)
      },
      {
        path: 'complaint',
        loadComponent: () =>
          import('./features/customer/register-complaint/register-complaint.component')
            .then(m => m.RegisterComplaintComponent)
      },
      {
        path: 'track',
        loadComponent: () =>
          import('./features/customer/track-complaint/track-complaint.component')
            .then(m => m.TrackComplaintComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/customer/update-profile/update-profile.component')
            .then(m => m.UpdateProfileComponent)
      },

      // ✅ Single result page for CASH info / CARD success
      {
        path: 'payment-result',
        loadComponent: () =>
          import('./features/customer/payment-result/payment-result.component')
            .then(m => m.PaymentResultComponent)
      },
      {
        path: 'food',
        loadComponent: () =>
          import('./features/customer/food-order/food-order.component')
            .then(m => m.FoodOrderComponent)
      },
      {
        path: 'food-history',
        loadComponent: () =>
          import('./features/customer/food-history/food-history.component')
            .then(m => m.FoodHistoryComponent)
      },
    ]
  },

  // ADMIN LAYOUT
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['ADMIN'])],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./features/admin/manage-rooms/manage-rooms.component')
            .then(m => m.ManageRoomsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/admin/manage-bookings/manage-bookings.component')
            .then(m => m.ManageBookingsComponent)
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/admin/manage-customers/manage-customers.component')
            .then(m => m.ManageCustomersComponent)
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/admin/manage-staff/manage-staff.component')
            .then(m => m.ManageStaffComponent)
      },
      {
        path: 'complaints',
        loadComponent: () =>
          import('./features/admin/complaints-overview/complaints-overview.component')
            .then(m => m.ComplaintsOverviewComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/reports/reports.component')
            .then(m => m.ReportsComponent)
      },
    ]
  },

  // STAFF LAYOUT (from your friend)
  {
    path: 'staff',
    canActivate: [authGuard, roleGuard(['STAFF'])],
    loadComponent: () =>
      import('./layouts/staff-layout/staff-layout.component')
        .then(m => m.StaffLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/staff/staff-dashboard/staff-dashboard.component')
            .then(m => m.StaffDashboardComponent)
      },
      {
        path: 'complaints',
        loadComponent: () =>
          import('./features/staff/staff-complaints/staff-complaints.component')
            .then(m => m.StaffComplaintsComponent)
      },
      {
        path: 'housekeeping',
        loadComponent: () =>
          import('./features/staff/housekeeping-tasks/housekeeping-tasks.component')
            .then(m => m.HousekeepingTasksComponent)
      },
    ]
  },

  // FOOD STAFF LAYOUT
  {
    path: 'food-staff',
    canActivate: [authGuard, roleGuard(['FOOD_STAFF'])],
    loadComponent: () =>
      import('./layouts/food-staff-layout/food-staff-layout.component')
        .then(m => m.FoodStaffLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/food-staff/food-staff-dashboard/food-staff-dashboard.component')
            .then(m => m.FoodStaffDashboardComponent)
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/food-staff/order-queue/order-queue.component')
            .then(m => m.OrderQueueComponent)
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/food-staff/manage-menu/manage-menu.component')
            .then(m => m.ManageMenuComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'auth/login' }
];