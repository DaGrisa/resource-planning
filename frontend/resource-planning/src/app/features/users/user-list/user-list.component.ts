import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';
import { confirmExecute$ } from '../../../shared/utils/confirm-action.util';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h1>Users</h1>
      <a mat-flat-button routerLink="/users/new">
        <mat-icon>add</mat-icon> New User
      </a>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && users.length === 0) {
      <div class="empty-state">No users yet.</div>
    }

    @if (!loading && users.length > 0) {
    <table mat-table [dataSource]="users" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="username">
        <th mat-header-cell *matHeaderCellDef>Username</th>
        <td mat-cell *matCellDef="let u">{{ u.username }}</td>
      </ng-container>

      <ng-container matColumnDef="displayName">
        <th mat-header-cell *matHeaderCellDef>Display Name</th>
        <td mat-cell *matCellDef="let u">{{ u.displayName }}</td>
      </ng-container>

      <ng-container matColumnDef="roles">
        <th mat-header-cell *matHeaderCellDef>Roles</th>
        <td mat-cell *matCellDef="let u">
          <mat-chip-set>
            @for (role of u.roles; track role) {
              <mat-chip>{{ formatRole(role) }}</mat-chip>
            }
          </mat-chip-set>
        </td>
      </ng-container>

      <ng-container matColumnDef="employee">
        <th mat-header-cell *matHeaderCellDef>Linked Employee</th>
        <td mat-cell *matCellDef="let u">{{ u.employeeName || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let u">
          <span [class.inactive]="!u.isActive">{{ u.isActive ? 'Active' : 'Inactive' }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let u">
          <a mat-icon-button [routerLink]="['/users', u.id, 'edit']">
            <mat-icon>edit</mat-icon>
          </a>
          <button mat-icon-button (click)="confirmDelete(u)" *ngIf="u.isActive">
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
export class UserListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  loading = false;
  displayedColumns = ['username', 'displayName', 'roles', 'employee', 'status', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.userService.getAll().pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.users = data;
      this.cdr.markForCheck();
    });
  }

  formatRole(role: string): string {
    return role.replace(/([A-Z])/g, ' $1').trim();
  }

  confirmDelete(user: User) {
    confirmExecute$(
      this.dialog,
      { title: 'Deactivate User', message: `Deactivate "${user.username}"?`, confirmText: 'Deactivate' },
      () => this.userService.delete(user.id)
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.snackBar.open('User deactivated', 'OK', { duration: 3000 });
      this.load();
    });
  }
}
