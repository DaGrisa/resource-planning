import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AllocationUpsertDto, EmployeeWeekOverview } from '../../../core/models';
import { Project } from '../../../core/models';
import { getISOWeek, getWeekStart } from '../../../core/utils/week.utils';

export interface BulkAllocationData {
  overview: EmployeeWeekOverview[];
  projects: Project[];
  year: number;
  weekFrom: number;
  weekTo: number;
}

@Component({
  selector: 'app-bulk-allocation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSelectModule, MatIconModule, MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>Bulk Plan Allocation</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Employee</mat-label>
        <mat-select [(ngModel)]="selectedEmployeeId" (selectionChange)="onEmployeeChange()">
          @for (emp of data.overview; track emp.employeeId) {
            <mat-option [value]="emp.employeeId">{{ emp.employeeName }} ({{ emp.weeklyHours }}h)</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Project</mat-label>
        <mat-select [(ngModel)]="selectedProjectId">
          @for (p of activeProjects; track p.id) {
            <mat-option [value]="p.id">{{ p.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="week-range">
        <mat-form-field>
          <mat-label>From Week</mat-label>
          <input matInput [matDatepicker]="fromPicker" [value]="fromDate" (dateChange)="onFromChange($event)" />
          <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
          <mat-hint>CW {{ fromWeek }}</mat-hint>
        </mat-form-field>

        <mat-form-field>
          <mat-label>To Week</mat-label>
          <input matInput [matDatepicker]="toPicker" [value]="toDate" (dateChange)="onToChange($event)" />
          <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
          <mat-hint>CW {{ toWeek }}</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field class="full-width">
        <mat-label>Hours per week</mat-label>
        <input matInput type="number" [(ngModel)]="hoursPerWeek" min="0" step="0.5" />
      </mat-form-field>

      @if (selectedEmployeeId && selectedProjectId && fromWeek <= toWeek) {
        <div class="summary">
          Will create {{ weekCount }} allocation(s) for CW {{ fromWeek }}–{{ toWeek }} ({{ hoursPerWeek }}h each)
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="confirm()" [disabled]="!isValid">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .week-range { display: flex; gap: 16px; }
    .week-range mat-form-field { flex: 1; }
    .summary { margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 13px; }
  `]
})
export class BulkAllocationComponent implements OnInit {
  data = inject<BulkAllocationData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BulkAllocationComponent>);

  selectedEmployeeId?: number;
  selectedProjectId?: number;
  fromWeek: number = 0;
  toWeek: number = 0;
  fromDate: Date = new Date();
  toDate: Date = new Date();
  hoursPerWeek: number = 0;
  year: number = new Date().getFullYear();

  get activeProjects(): Project[] {
    return this.data.projects.filter(p => p.isActive);
  }

  get weekCount(): number {
    return this.toWeek >= this.fromWeek ? this.toWeek - this.fromWeek + 1 : 0;
  }

  get isValid(): boolean {
    return !!this.selectedEmployeeId && !!this.selectedProjectId &&
      this.fromWeek > 0 && this.toWeek >= this.fromWeek && this.hoursPerWeek > 0;
  }

  ngOnInit() {
    this.year = this.data.year;
    this.fromWeek = this.data.weekFrom;
    this.toWeek = this.data.weekTo;
    this.fromDate = getWeekStart(this.year, this.fromWeek);
    this.toDate = getWeekStart(this.year, this.toWeek);
  }

  onEmployeeChange() {
    const emp = this.data.overview.find(e => e.employeeId === this.selectedEmployeeId);
    if (emp) {
      this.hoursPerWeek = emp.weeklyHours;
    }
  }

  onFromChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.fromWeek = getISOWeek(date);
    this.fromDate = getWeekStart(this.year, this.fromWeek);
  }

  onToChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.toWeek = getISOWeek(date);
    this.toDate = getWeekStart(this.year, this.toWeek);
  }

  confirm() {
    if (!this.isValid) return;

    const allocations: AllocationUpsertDto[] = [];
    for (let w = this.fromWeek; w <= this.toWeek; w++) {
      allocations.push({
        employeeId: this.selectedEmployeeId!,
        projectId: this.selectedProjectId!,
        calendarWeek: w,
        year: this.year,
        plannedHours: this.hoursPerWeek
      });
    }

    this.dialogRef.close(allocations);
  }
}
