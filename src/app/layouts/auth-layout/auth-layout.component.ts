import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatCardModule],
  template: `
  <div class="min-h-screen flex items-center justify-center p-4 bg-gray-50">
    <mat-card class="w-full max-w-lg p-4">
      <router-outlet></router-outlet>
      
    </mat-card>
  </div>
  `
})
export class AuthLayoutComponent {}