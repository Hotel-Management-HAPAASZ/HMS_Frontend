import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/models';

export const roleGuard = (allowed: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigateByUrl('/auth/login');
    return false;
  }

  const role = auth.role();
  if (role && allowed.includes(role)) return true;

  // fallback based on role
  if (role === 'ADMIN') router.navigateByUrl('/admin/dashboard');
  else if (role === 'STAFF') router.navigateByUrl('/staff/dashboard');
  else router.navigateByUrl('/customer/dashboard');

  return false;
};