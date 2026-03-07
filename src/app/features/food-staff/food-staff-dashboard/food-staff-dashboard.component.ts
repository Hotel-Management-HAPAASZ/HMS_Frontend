import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="container py-3">
      <mat-card class="p-3">
        <h2 class="fw-bold mb-1">Food Staff Dashboard</h2>
        <div class="text-muted small">
          Use the Menu page to manage items. (Orders queue UI can be added next.)
        </div>
      </mat-card>
    </div>
  `
})
export class FoodStaffDashboardComponent {}


