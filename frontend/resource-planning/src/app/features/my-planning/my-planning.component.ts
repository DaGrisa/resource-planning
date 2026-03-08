import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { finalize } from 'rxjs';
import { PlanningService } from '../../core/services/planning.service';
import { EmployeeService } from '../../core/services/employee.service';
import { AuthService } from '../../core/services/auth.service';
import { Employee, EmployeeWeekOverview, WeekSummary } from '../../core/models';
import { getISOWeek, getWeekStart, formatShortDate } from '../../core/utils/week.utils';

@Component({
  selector: 'app-my-planning',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="page-header">
      <h1>My Planning</h1>
    </div>

    <div class="filters">
      @if (showEmployeeSelect) {
        <mat-form-field>
          <mat-label>Employee</mat-label>
          <mat-select [(ngModel)]="selectedEmployeeId" (selectionChange)="load()">
            <mat-option [value]="undefined">— Select employee —</mat-option>
            @for (emp of employees; track emp.id) {
              <mat-option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

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

      <mat-slide-toggle [(ngModel)]="showPercentage">Show %</mat-slide-toggle>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && !selectedEmployeeId && showEmployeeSelect) {
      <div class="empty-state">Select an employee to view their planning.</div>
    }

    @if (!loading && !showEmployeeSelect && !selectedEmployeeId) {
      <div class="empty-state">Your account is not linked to an employee profile.</div>
    }

    @if (!loading && overview) {
      <div class="employee-info">
        <strong>{{ overview.employeeName }}</strong>
        <span class="dept">{{ overview.departmentName }}</span>
        <span class="capacity">{{ overview.weeklyHours }}h / week</span>
      </div>

      @if (projectRows.length === 0 && !hasAbsences) {
        <div class="empty-state">No allocations in the selected period.</div>
      } @else {
        <div class="grid-container">
          <table class="planning-table">
            <thead>
              <tr>
                <th class="first-col">Project</th>
                @for (w of weeks; track w) {
                  <th class="week-col">CW {{ w }}<div class="week-date">{{ getWeekStartDate(w) }}</div></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (project of projectRows; track project.id) {
                <tr>
                  <td class="first-col">{{ project.name }}</td>
                  @for (w of weeks; track w) {
                    <td class="week-cell-interactive">
                      @if (getProjectHours(project.id, w); as h) {
                        {{ showPercentage ? (getProjectPct(project.id, w) | number:'1.0-0') + '%' : (h | number:'1.1-1') + 'h' }}
                      } @else {
                        <span class="empty-cell">—</span>
                      }
                    </td>
                  }
                </tr>
              }

              @if (hasAbsences) {
                <tr>
                  <td class="first-col absence-label">Absences</td>
                  @for (w of weeks; track w) {
                    <td class="week-cell-interactive absence-cell">
                      @if (getAbsenceHours(w); as h) {
                        {{ showPercentage ? (h / overview!.weeklyHours * 100 | number:'1.0-0') + '%' : (h | number:'1.1-1') + 'h' }}
                      } @else {
                        <span class="empty-cell">—</span>
                      }
                    </td>
                  }
                </tr>
              }

              <tr>
                <td class="first-col total-label">Total</td>
                @for (w of weeks; track w) {
                  <td class="week-cell-interactive"
                      [class.status-under]="getWeek(w)?.status === 'under'"
                      [class.status-optimal]="getWeek(w)?.status === 'optimal'"
                      [class.status-over]="getWeek(w)?.status === 'over'"
                      [class.status-empty]="!getWeek(w) || (getWeek(w)?.totalPlannedHours === 0 && !getAbsenceHours(w))">
                    {{ showPercentage
                        ? (getWeek(w)?.percentage | number:'1.0-0') + '%'
                        : (getWeek(w)?.totalPlannedHours | number:'1.1-1') + 'h' }}
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>

        <div class="legend">
          <span class="legend-item"><span class="dot status-under"></span> Under (&lt;80%)</span>
          <span class="legend-item"><span class="dot status-optimal"></span> Optimal (80–100%)</span>
          <span class="legend-item"><span class="dot status-over"></span> Over (&gt;100%)</span>
        </div>
      }
    }
  `,
  styles: [`
    .employee-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      font-size: 15px;
      padding: 12px 16px;
      background: #f0f4ff;
      border-radius: 8px;
      border-left: 4px solid #1565c0;
    }
    .employee-info .dept { color: #666; }
    .employee-info .capacity { color: #1565c0; font-weight: 500; }
    .absence-label { color: #e65100; font-style: italic; }
    .absence-cell { color: #e65100; font-style: italic; }
    .total-label { font-weight: 700; }
    .empty-cell { color: #ccc; }
  `]
})
export class MyPlanningComponent implements OnInit {
  private planningService = inject(PlanningService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  employees: Employee[] = [];
  selectedEmployeeId?: number;
  overview?: EmployeeWeekOverview;
  loading = false;

  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = getISOWeek(new Date()) + 5;
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  showPercentage = false;

  get showEmployeeSelect(): boolean {
    return !this.authService.hasRole('Employee');
  }

  get weeks(): number[] {
    const result: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) result.push(i);
    return result;
  }

  get projectRows(): { id: number; name: string }[] {
    if (!this.overview) return [];
    const map = new Map<number, string>();
    for (const week of this.overview.weeks) {
      for (const alloc of week.allocations) {
        map.set(alloc.projectId, alloc.projectName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get hasAbsences(): boolean {
    return !!this.overview?.weeks.some(w => w.absenceHours > 0);
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (this.authService.hasRole('Employee')) {
      if (user?.employeeId) {
        this.selectedEmployeeId = user.employeeId;
        this.load();
      }
    } else {
      this.employeeService.getAll().subscribe(emps => this.employees = emps);
    }
  }

  load() {
    if (!this.selectedEmployeeId) return;
    this.loading = true;
    this.overview = undefined;
    this.planningService
      .getEmployeeAllocations(this.selectedEmployeeId, this.year, this.weekFrom, this.weekTo)
      .pipe(finalize(() => this.loading = false))
      .subscribe(data => this.overview = data);
  }

  onFromDateChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.weekFrom = getISOWeek(date);
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

  getWeek(week: number): WeekSummary | undefined {
    return this.overview?.weeks.find(w => w.calendarWeek === week);
  }

  getProjectHours(projectId: number, week: number): number {
    return this.getWeek(week)?.allocations.find(a => a.projectId === projectId)?.plannedHours ?? 0;
  }

  getProjectPct(projectId: number, week: number): number {
    return this.getWeek(week)?.allocations.find(a => a.projectId === projectId)?.percentage ?? 0;
  }

  getAbsenceHours(week: number): number {
    return this.getWeek(week)?.absenceHours ?? 0;
  }
}
