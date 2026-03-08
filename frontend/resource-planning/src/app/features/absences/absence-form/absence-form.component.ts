import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Employee, AbsenceUpsertDto } from '../../../core/models';
import { getISOWeek, getWeekStart } from '../../../core/utils/week.utils';

export interface AbsenceFormData {
  employees: Employee[];
  preselectedEmployeeId?: number;
  year: number;
  existingAbsences?: { calendarWeek: number; hours: number; note?: string }[];
}

interface WeekEntry {
  calendarWeek: number;
  hours: number;
  weekStart: Date;
}

@Component({
  selector: 'app-absence-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDatepickerModule, MatNativeDateModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ editMode ? 'Edit' : 'Add' }} Absence</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Employee</mat-label>
        <mat-select [(ngModel)]="selectedEmployeeId" (selectionChange)="onEmployeeChange()">
          @for (emp of data.employees; track emp.id) {
            <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.weeklyHours }}h)</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <div class="date-row">
        <mat-form-field>
          <mat-label>Start Date</mat-label>
          <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" (dateChange)="computeWeeks()" />
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field>
          <mat-label>End Date</mat-label>
          <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" (dateChange)="computeWeeks()" />
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
        </mat-form-field>
      </div>

      @if (weekEntries.length > 0) {
        <div class="weeks-section">
          <h3>Hours per Week</h3>
          @for (entry of weekEntries; track entry.calendarWeek) {
            <div class="week-row">
              <span class="week-label">CW {{ entry.calendarWeek }}</span>
              <mat-form-field class="hours-field">
                <mat-label>Hours</mat-label>
                <input matInput type="number" [(ngModel)]="entry.hours" min="0" max="168" step="0.5" />
              </mat-form-field>
            </div>
          }
        </div>
      }

      <mat-form-field class="full-width">
        <mat-label>Note (optional)</mat-label>
        <input matInput [(ngModel)]="note" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .date-row { display: flex; gap: 16px; }
    .date-row mat-form-field { flex: 1; }
    .weeks-section { margin: 8px 0; }
    .weeks-section h3 { margin: 0 0 8px; font-size: 14px; color: #666; }
    .week-row { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
    .week-label { min-width: 60px; font-weight: 500; }
    .hours-field { width: 120px; }
  `]
})
export class AbsenceFormComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AbsenceFormComponent>);
  data: AbsenceFormData = inject(MAT_DIALOG_DATA);

  selectedEmployeeId?: number;
  startDate?: Date;
  endDate?: Date;
  note = '';
  weekEntries: WeekEntry[] = [];
  editMode = false;

  ngOnInit() {
    if (this.data.preselectedEmployeeId) {
      this.selectedEmployeeId = this.data.preselectedEmployeeId;
    }
    if (this.data.existingAbsences?.length) {
      this.editMode = true;
      const sorted = [...this.data.existingAbsences].sort((a, b) => a.calendarWeek - b.calendarWeek);
      this.weekEntries = sorted.map(a => ({
        calendarWeek: a.calendarWeek,
        hours: a.hours,
        weekStart: getWeekStart(this.data.year, a.calendarWeek)
      }));
      this.note = sorted[0]?.note || '';
      this.startDate = getWeekStart(this.data.year, sorted[0].calendarWeek);
      this.endDate = getWeekStart(this.data.year, sorted[sorted.length - 1].calendarWeek);
    }
  }

  onEmployeeChange() {
    this.computeWeeks();
  }

  computeWeeks() {
    if (!this.startDate || !this.endDate || !this.selectedEmployeeId) return;

    const employee = this.data.employees.find(e => e.id === this.selectedEmployeeId);
    if (!employee) return;

    const startWeek = getISOWeek(this.startDate);
    const endWeek = getISOWeek(this.endDate);

    if (endWeek < startWeek) return;

    const dailyHours = employee.weeklyHours / 5;
    const entries: WeekEntry[] = [];

    for (let w = startWeek; w <= endWeek; w++) {
      const weekStart = getWeekStart(this.data.year, w);
      let workingDays = 5;

      if (w === startWeek) {
        const startDay = this.startDate.getDay() || 7; // Monday=1
        workingDays = Math.max(1, 6 - startDay);
      }
      if (w === endWeek) {
        const endDay = this.endDate.getDay() || 7;
        if (w === startWeek) {
          const startDay = this.startDate.getDay() || 7;
          workingDays = Math.max(1, endDay - startDay + 1);
          if (workingDays > 5) workingDays = 5;
        } else {
          workingDays = Math.min(5, endDay);
        }
      }

      // Check existing entry to preserve manual edits
      const existing = this.weekEntries.find(e => e.calendarWeek === w);
      entries.push({
        calendarWeek: w,
        hours: existing ? existing.hours : Math.round(dailyHours * workingDays * 2) / 2,
        weekStart
      });
    }

    this.weekEntries = entries;
  }

  canSave(): boolean {
    return !!this.selectedEmployeeId && this.weekEntries.length > 0 &&
      this.weekEntries.some(e => e.hours > 0);
  }

  save() {
    if (!this.canSave()) return;

    const result: AbsenceUpsertDto[] = this.weekEntries.map(entry => ({
      employeeId: this.selectedEmployeeId!,
      calendarWeek: entry.calendarWeek,
      year: this.data.year,
      hours: entry.hours,
      note: this.note || undefined
    }));

    this.dialogRef.close(result);
  }
}
