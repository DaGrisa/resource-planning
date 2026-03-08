import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { DepartmentService } from '../../../core/services/department.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatChipsModule, MatSnackBarModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit ? 'Edit Department' : 'New Department' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()" class="form-container">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Lead Manager</mat-label>
        <mat-select formControlName="leadManagerId">
          <mat-option [value]="null">— None —</mat-option>
          @for (emp of employees; track emp.id) {
            <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (isEdit) {
        <mat-form-field>
          <mat-label>Supporting Managers</mat-label>
          <mat-select formControlName="managerIds" multiple>
            @for (emp of employees; track emp.id) {
              <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <div class="form-actions">
        <a mat-button routerLink="/departments">Cancel</a>
        <button mat-flat-button type="submit" [disabled]="form.invalid">Save</button>
      </div>
    </form>
  `,
  styles: [``]
})
export class DepartmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private departmentService = inject(DepartmentService);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  employees: Employee[] = [];
  isEdit = false;
  departmentId = 0;

  form = this.fb.group({
    name: ['', Validators.required],
    leadManagerId: [null as number | null],
    managerIds: [[] as number[]]
  });

  ngOnInit() {
    this.employeeService.getAll().subscribe(e => this.employees = e);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.departmentId = +id;
      this.departmentService.getById(this.departmentId).subscribe(d => {
        this.form.patchValue({
          name: d.name,
          leadManagerId: d.leadManagerId,
          managerIds: d.managers?.map(m => m.employeeId) || []
        });
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();

    const dto = { name: val.name!, leadManagerId: val.leadManagerId };

    if (this.isEdit) {
      const update$ = this.departmentService.update(this.departmentId, dto);
      const managers$ = this.departmentService.setManagers(this.departmentId, val.managerIds!);

      forkJoin([update$, managers$]).subscribe(() => {
        this.snackBar.open('Department updated', 'OK', { duration: 3000 });
        this.router.navigate(['/departments']);
      });
    } else {
      this.departmentService.create(dto).subscribe(() => {
        this.snackBar.open('Department created', 'OK', { duration: 3000 });
        this.router.navigate(['/departments']);
      });
    }
  }
}
