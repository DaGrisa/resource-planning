import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee, ProjectType } from '../../../core/models';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatNativeDateModule, MatButtonModule, MatSlideToggleModule, MatSnackBarModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit ? 'Edit Project' : 'New Project' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()" class="form-container">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field>
        <mat-label>Type</mat-label>
        <mat-select formControlName="projectType">
          <mat-option value="Customer">Customer</mat-option>
          <mat-option value="Internal">Internal</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Project Lead</mat-label>
        <mat-select formControlName="projectLeadId">
          <mat-option [value]="null">— None —</mat-option>
          @for (emp of employees; track emp.id) {
            <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Start Date</mat-label>
        <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
        <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
        <mat-datepicker #startPicker></mat-datepicker>
      </mat-form-field>

      <mat-form-field>
        <mat-label>End Date</mat-label>
        <input matInput [matDatepicker]="endPicker" formControlName="endDate" />
        <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
        <mat-datepicker #endPicker></mat-datepicker>
      </mat-form-field>

      @if (isEdit) {
        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
      }

      <div class="form-actions">
        <a mat-button routerLink="/projects">Cancel</a>
        <button mat-flat-button type="submit" [disabled]="form.invalid">Save</button>
      </div>
    </form>
  `,
  styles: [``]
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  employees: Employee[] = [];
  isEdit = false;
  projectId = 0;

  form = this.fb.group({
    name: ['', Validators.required],
    projectType: ['Customer' as ProjectType, Validators.required],
    projectLeadId: [null as number | null],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
    isActive: [true]
  });

  ngOnInit() {
    this.employeeService.getAll().subscribe(e => this.employees = e);

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.projectId = +id;
      this.projectService.getById(this.projectId).subscribe(p => {
        this.form.patchValue({
          name: p.name,
          projectType: p.projectType,
          projectLeadId: p.projectLeadId,
          startDate: p.startDate ? new Date(p.startDate) : null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          isActive: p.isActive
        });
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();

    if (this.isEdit) {
      this.projectService.update(this.projectId, {
        name: val.name!,
        projectType: val.projectType!,
        projectLeadId: val.projectLeadId,
        isActive: val.isActive!,
        startDate: val.startDate?.toISOString() || null,
        endDate: val.endDate?.toISOString() || null
      }).subscribe(() => {
        this.snackBar.open('Project updated', 'OK', { duration: 3000 });
        this.router.navigate(['/projects']);
      });
    } else {
      this.projectService.create({
        name: val.name!,
        projectType: val.projectType!,
        projectLeadId: val.projectLeadId,
        startDate: val.startDate?.toISOString() || null,
        endDate: val.endDate?.toISOString() || null
      }).subscribe(() => {
        this.snackBar.open('Project created', 'OK', { duration: 3000 });
        this.router.navigate(['/projects']);
      });
    }
  }
}
