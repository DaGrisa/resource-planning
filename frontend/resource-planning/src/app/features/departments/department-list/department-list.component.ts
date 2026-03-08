import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { Department } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h1>Departments</h1>
      @if (authService.hasAnyRole('Admin', 'DepartmentManager')) {
        <a mat-flat-button routerLink="/departments/new">
          <mat-icon>add</mat-icon> New Department
        </a>
      }
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && departments.length === 0) {
      <div class="empty-state">No departments yet. Start by creating your first department.</div>
    }

    @if (!loading && departments.length > 0) {
    <table mat-table [dataSource]="departments" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let d">{{ d.name }}</td>
      </ng-container>

      <ng-container matColumnDef="leadManager">
        <th mat-header-cell *matHeaderCellDef>Lead Manager</th>
        <td mat-cell *matCellDef="let d">{{ d.leadManagerName || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="employeeCount">
        <th mat-header-cell *matHeaderCellDef>Employees</th>
        <td mat-cell *matCellDef="let d">{{ d.employeeCount }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let d">
          <a mat-icon-button [routerLink]="['/departments', d.id, 'edit']">
            <mat-icon>edit</mat-icon>
          </a>
          <button mat-icon-button (click)="confirmDelete(d)">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
    }
  `,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private departmentService = inject(DepartmentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  authService = inject(AuthService);

  departments: Department[] = [];
  loading = false;
  displayedColumns = ['name', 'leadManager', 'employeeCount', 'actions'];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.departmentService.getAll().pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.departments = data);
  }

  confirmDelete(dept: Department) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Department', message: `Delete "${dept.name}"? Only possible if no active employees.` }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.departmentService.delete(dept.id).subscribe({
          next: () => {
            this.snackBar.open('Department deleted', 'OK', { duration: 3000 });
            this.load();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Cannot delete department', 'OK', { duration: 5000 });
          }
        });
      }
    });
  }
}
