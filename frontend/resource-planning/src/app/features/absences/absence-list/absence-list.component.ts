import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { finalize } from 'rxjs';
import { AbsenceService } from '../../../core/services/absence.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { Absence, Employee, Department, AbsenceUpsertDto } from '../../../core/models';
import { AbsenceFormComponent, AbsenceFormData } from '../absence-form/absence-form.component';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';

interface AbsenceGridRow {
  employeeId: number;
  employeeName: string;
  weeklyHours: number;
  weeks: Map<number, { hours: number; note?: string; id: number }>;
}

@Component({
  selector: 'app-absence-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTooltipModule, MatSnackBarModule, MatDialogModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-header">
      <h1>Absences</h1>
      <button mat-flat-button (click)="openForm()">
        <mat-icon>add</mat-icon> Add Absence
      </button>
    </div>

    <div class="filters">
      <mat-form-field>
        <mat-label>From Week</mat-label>
        <input matInput [matDatepicker]="fromPicker" [value]="weekFromDate" (dateChange)="onFromDateChange($event)" />
        <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
        <mat-datepicker #fromPicker></mat-datepicker>
        <mat-hint>CW {{ weekFrom }}</mat-hint>
      </mat-form-field>

      <mat-form-field>
        <mat-label>To Week</mat-label>
        <input matInput [matDatepicker]="toPicker" [value]="weekToDate" (dateChange)="onToDateChange($event)" />
        <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
        <mat-datepicker #toPicker></mat-datepicker>
        <mat-hint>CW {{ weekTo }}</mat-hint>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Department</mat-label>
        <mat-select [(ngModel)]="departmentId" (selectionChange)="load()">
          <mat-option [value]="undefined">All</mat-option>
          @for (dept of departments; track dept.id) {
            <mat-option [value]="dept.id">{{ dept.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Employee</mat-label>
        <mat-select [(ngModel)]="employeeId" (selectionChange)="load()">
          <mat-option [value]="undefined">All</mat-option>
          @for (emp of employees; track emp.id) {
            <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && gridRows.length === 0) {
      <div class="empty-state">No absences found for this period.</div>
    }

    @if (!loading && gridRows.length > 0) {
    <div class="grid-container">
      <table class="planning-table">
        <thead>
          <tr>
            <th class="first-col">Employee</th>
            @for (w of weeks; track w) {
              <th class="week-col">CW {{ w }}<div class="week-date">{{ getWeekStartDate(w) }}</div></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of gridRows; track row.employeeId) {
            <tr>
              <td class="first-col">
                <div class="first-col-name">{{ row.employeeName }}</div>
                <div class="first-col-sub">{{ row.weeklyHours }}h/week</div>
              </td>
              @for (w of weeks; track w) {
                <td class="week-cell-interactive"
                    [class.has-absence]="row.weeks.has(w)"
                    (click)="onCellClick(row, w)"
                    [matTooltip]="getCellTooltip(row, w)">
                  @if (row.weeks.has(w)) {
                    {{ row.weeks.get(w)!.hours }}h
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    }
  `,
  styles: [`
    .has-absence { background-color: #e3f2fd; font-weight: 500; }
    .has-absence:hover { background-color: #bbdefb; }
  `]
})
export class AbsenceListComponent implements OnInit {
  private absenceService = inject(AbsenceService);
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  authService = inject(AuthService);

  absences: Absence[] = [];
  employees: Employee[] = [];
  departments: Department[] = [];
  gridRows: AbsenceGridRow[] = [];
  loading = false;

  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = getISOWeek(new Date()) + 5;
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  departmentId?: number;
  employeeId?: number;

  get weeks(): number[] {
    const w: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) w.push(i);
    return w;
  }

  ngOnInit() {
    this.departmentService.getAll().subscribe(d => this.departments = d);
    this.employeeService.getAll().subscribe(e => this.employees = e);
    this.load();
  }

  load() {
    this.loading = true;
    this.absenceService.getAll({
      year: this.year,
      weekFrom: this.weekFrom,
      weekTo: this.weekTo,
      employeeId: this.employeeId,
      departmentId: this.departmentId
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe(data => {
      this.absences = data;
      this.buildGrid();
    });
  }

  private buildGrid() {
    const employeeMap = new Map<number, AbsenceGridRow>();

    // Add all employees that have absences
    for (const a of this.absences) {
      if (!employeeMap.has(a.employeeId)) {
        const emp = this.employees.find(e => e.id === a.employeeId);
        employeeMap.set(a.employeeId, {
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          weeklyHours: emp?.weeklyHours ?? 0,
          weeks: new Map()
        });
      }
      employeeMap.get(a.employeeId)!.weeks.set(a.calendarWeek, {
        hours: a.hours,
        note: a.note ?? undefined,
        id: a.id
      });
    }

    this.gridRows = Array.from(employeeMap.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  onFromDateChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.weekFrom = getISOWeek(date);
    this.year = this.getISOYear(date);
    this.weekFromDate = getWeekStart(this.year, this.weekFrom);
    this.load();
  }

  onToDateChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.weekTo = getISOWeek(date);
    this.weekToDate = getWeekStart(this.year, this.weekTo);
    this.load();
  }

  getWeekStartDate(week: number): string {
    return formatShortDate(getWeekStart(this.year, week));
  }

  openForm(employeeId?: number, existingAbsences?: { calendarWeek: number; hours: number; note?: string }[]) {
    const ref = this.dialog.open(AbsenceFormComponent, {
      width: '500px',
      data: {
        employees: this.employees,
        preselectedEmployeeId: employeeId,
        year: this.year,
        existingAbsences
      } as AbsenceFormData
    });

    ref.afterClosed().subscribe((result: AbsenceUpsertDto[] | undefined) => {
      if (!result) return;
      this.absenceService.upsert(result).subscribe(() => {
        this.snackBar.open('Absences saved', 'OK', { duration: 3000 });
        this.load();
      });
    });
  }

  onCellClick(row: AbsenceGridRow, week: number) {
    const entry = row.weeks.get(week);
    if (entry) {
      // Edit existing — collect all absences for this employee in the visible range
      const empAbsences = this.absences
        .filter(a => a.employeeId === row.employeeId)
        .map(a => ({ calendarWeek: a.calendarWeek, hours: a.hours, note: a.note ?? undefined }));
      this.openForm(row.employeeId, empAbsences);
    } else {
      // Add new for this employee at this week
      this.openForm(row.employeeId);
    }
  }

  getCellTooltip(row: AbsenceGridRow, week: number): string {
    const entry = row.weeks.get(week);
    if (!entry) return 'Click to add absence';
    let tip = `${entry.hours}h absent`;
    if (entry.note) tip += `\n${entry.note}`;
    return tip;
  }

  private getISOYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
  }
}
