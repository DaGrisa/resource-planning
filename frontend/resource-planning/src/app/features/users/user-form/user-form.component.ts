import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/user.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee, Role } from '../../../core/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatCheckboxModule, MatSlideToggleModule, MatCardModule,
    MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit ? 'Edit User' : 'New User' }}</h1>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading) {
    <mat-card>
      <mat-card-content>
        <form (ngSubmit)="onSubmit()" #userForm="ngForm">
          <mat-form-field class="full-width">
            <mat-label>Username</mat-label>
            <input matInput [(ngModel)]="username" name="username" required minlength="3" [disabled]="isEdit" />
          </mat-form-field>

          @if (!isEdit) {
            <mat-form-field class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="6" />
            </mat-form-field>
          }

          <mat-form-field class="full-width">
            <mat-label>Display Name</mat-label>
            <input matInput [(ngModel)]="displayName" name="displayName" required />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Linked Employee</mat-label>
            <mat-select [(ngModel)]="employeeId" name="employeeId">
              <mat-option [value]="null">None</mat-option>
              @for (emp of employees; track emp.id) {
                <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="roles-section">
            <label class="roles-label">Roles</label>
            <div class="roles-grid">
              @for (role of allRoles; track role) {
                <mat-checkbox [checked]="selectedRoles.includes(role)" (change)="toggleRole(role, $event.checked)">
                  {{ formatRole(role) }}
                </mat-checkbox>
              }
            </div>
          </div>

          @if (isEdit) {
            <mat-slide-toggle [(ngModel)]="isActive" name="isActive" class="toggle-field">Active</mat-slide-toggle>
          }

          <div class="form-actions">
            <button mat-button type="button" (click)="goBack()">Cancel</button>
            <button mat-flat-button type="submit" [disabled]="!userForm.valid || saving">
              {{ isEdit ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
    }
  `,
  styles: [`
    mat-card { max-width: 600px; }
    .full-width { width: 100%; }
    .roles-section { margin: 16px 0; }
    .roles-label { font-size: 0.85rem; color: #666; display: block; margin-bottom: 8px; }
    .roles-grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .toggle-field { display: block; margin: 16px 0; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  `]
})
export class UserFormComponent implements OnInit {
  private userService = inject(UserService);
  private employeeService = inject(EmployeeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isEdit = false;
  loading = false;
  saving = false;
  userId?: number;

  username = '';
  password = '';
  displayName = '';
  employeeId: number | null = null;
  isActive = true;
  selectedRoles: Role[] = [];
  allRoles: Role[] = ['Admin', 'DepartmentManager', 'ProjectManager', 'Employee'];
  employees: Employee[] = [];

  ngOnInit() {
    this.employeeService.getAll().subscribe(e => this.employees = e);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.userId = +id;
      this.loading = true;
      this.userService.getById(this.userId).subscribe(user => {
        this.username = user.username;
        this.displayName = user.displayName;
        this.employeeId = user.employeeId;
        this.isActive = user.isActive;
        this.selectedRoles = [...user.roles];
        this.loading = false;
      });
    }
  }

  toggleRole(role: Role, checked: boolean) {
    if (checked) {
      this.selectedRoles.push(role);
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  formatRole(role: string): string {
    return role.replace(/([A-Z])/g, ' $1').trim();
  }

  onSubmit() {
    this.saving = true;
    if (this.isEdit) {
      this.userService.update(this.userId!, {
        displayName: this.displayName,
        employeeId: this.employeeId,
        isActive: this.isActive,
        roles: this.selectedRoles
      }).subscribe({
        next: () => {
          this.snackBar.open('User updated', 'OK', { duration: 3000 });
          this.router.navigate(['/users']);
        },
        error: () => this.saving = false
      });
    } else {
      this.userService.create({
        username: this.username,
        password: this.password,
        displayName: this.displayName,
        employeeId: this.employeeId,
        roles: this.selectedRoles
      }).subscribe({
        next: () => {
          this.snackBar.open('User created', 'OK', { duration: 3000 });
          this.router.navigate(['/users']);
        },
        error: () => this.saving = false
      });
    }
  }

  goBack() {
    this.router.navigate(['/users']);
  }
}
