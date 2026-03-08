import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EmployeeService } from '../../../core/services/employee.service';
import { DepartmentService } from '../../../core/services/department.service';
import { Department } from '../../../core/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatSlideToggleModule, MatSnackBarModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit ? 'Edit Employee' : 'New Employee' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()" class="form-container">
      <mat-form-field>
        <mat-label>First Name</mat-label>
        <input matInput formControlName="firstName" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Last Name</mat-label>
        <input matInput formControlName="lastName" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" type="email" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Weekly Hours</mat-label>
        <input matInput formControlName="weeklyHours" type="number" step="0.5" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Department</mat-label>
        <mat-select formControlName="departmentId">
          <mat-option [value]="null">— None —</mat-option>
          @for (dept of departments; track dept.id) {
            <mat-option [value]="dept.id">{{ dept.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (isEdit) {
        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
      }

      <div class="form-actions">
        <a mat-button routerLink="/employees">Cancel</a>
        <button mat-flat-button type="submit" [disabled]="form.invalid">Save</button>
      </div>
    </form>
  `,
  styles: [``]
})
export class EmployeeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  departments: Department[] = [];
  isEdit = false;
  employeeId = 0;

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    weeklyHours: [42.5, [Validators.required, Validators.min(0), Validators.max(168)]],
    departmentId: [null as number | null],
    isActive: [true]
  });

  ngOnInit() {
    this.departmentService.getAll().subscribe(d => this.departments = d);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.employeeId = +id;
      this.employeeService.getById(this.employeeId).subscribe(e => {
        this.form.patchValue(e);
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();

    if (this.isEdit) {
      this.employeeService.update(this.employeeId, {
        firstName: val.firstName!,
        lastName: val.lastName!,
        email: val.email!,
        weeklyHours: val.weeklyHours!,
        departmentId: val.departmentId,
        isActive: val.isActive!
      }).subscribe(() => {
        this.snackBar.open('Employee updated', 'OK', { duration: 3000 });
        this.router.navigate(['/employees']);
      });
    } else {
      this.employeeService.create({
        firstName: val.firstName!,
        lastName: val.lastName!,
        email: val.email!,
        weeklyHours: val.weeklyHours!,
        departmentId: val.departmentId
      }).subscribe(() => {
        this.snackBar.open('Employee created', 'OK', { duration: 3000 });
        this.router.navigate(['/employees']);
      });
    }
  }
}
