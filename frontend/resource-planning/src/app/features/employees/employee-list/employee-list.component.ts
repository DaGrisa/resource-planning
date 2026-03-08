import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule, MatDialogModule, MatSnackBarModule
  ],
  template: `
    <div class="page-header">
      <h1>Employees</h1>
      @if (authService.hasAnyRole('Admin', 'DepartmentManager')) {
        <a mat-flat-button routerLink="/employees/new">
          <mat-icon>add</mat-icon> New Employee
        </a>
      }
    </div>

    <div class="filters">
      <mat-slide-toggle [checked]="showInactive" (change)="showInactive = $event.checked; loadEmployees()">
        Show inactive
      </mat-slide-toggle>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && employees.length === 0 && !showInactive) {
      <div class="empty-state">No employees yet. Click "New Employee" to add your first.</div>
    }

    @if (!loading && employees.length > 0) {
    <table mat-table [dataSource]="employees" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let e">{{ e.lastName }}, {{ e.firstName }}</td>
      </ng-container>

      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let e">{{ e.email }}</td>
      </ng-container>

      <ng-container matColumnDef="department">
        <th mat-header-cell *matHeaderCellDef>Department</th>
        <td mat-cell *matCellDef="let e">{{ e.departmentName || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="weeklyHours">
        <th mat-header-cell *matHeaderCellDef>Weekly Hours</th>
        <td mat-cell *matCellDef="let e">{{ e.weeklyHours }}h</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let e">
          <span [class.inactive]="!e.isActive">{{ e.isActive ? 'Active' : 'Inactive' }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let e">
          <a mat-icon-button [routerLink]="['/employees', e.id, 'edit']">
            <mat-icon>edit</mat-icon>
          </a>
          <button mat-icon-button (click)="confirmDelete(e)" *ngIf="e.isActive">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
    }
  `,
  styles: [`
    .full-width { margin-top: 16px; }
  `]
})
export class EmployeeListComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  employees: Employee[] = [];
  loading = false;
  showInactive = false;
  displayedColumns = ['name', 'email', 'department', 'weeklyHours', 'status', 'actions'];

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getAll(!this.showInactive).pipe(
      finalize(() => this.loading = false)
    ).subscribe(data => this.employees = data);
  }

  confirmDelete(employee: Employee) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Deactivate Employee', message: `Deactivate ${employee.firstName} ${employee.lastName}?`, confirmText: 'Deactivate' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.employeeService.delete(employee.id).subscribe(() => {
          this.snackBar.open('Employee deactivated', 'OK', { duration: 3000 });
          this.loadEmployees();
        });
      }
    });
  }
}
