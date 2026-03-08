import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { finalize } from 'rxjs';
import { PlanningService } from '../../../core/services/planning.service';
import { DepartmentService } from '../../../core/services/department.service';
import { EmployeeWeekOverview } from '../../../core/models';
import { Department } from '../../../core/models';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';

@Component({
  selector: 'app-planning-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule, MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <div class="page-header">
      <h1>Planning Overview</h1>
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

      <mat-slide-toggle [(ngModel)]="showPercentage">Show %</mat-slide-toggle>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && overview.length === 0) {
      <div class="empty-state">No planning data yet. Add employees and projects first, then start planning.</div>
    }

    @if (!loading && overview.length > 0) {
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
          @for (emp of overview; track emp.employeeId) {
            <tr>
              <td class="first-col">
                <div class="first-col-name">{{ emp.employeeName }}</div>
                <div class="first-col-sub">{{ emp.departmentName }}</div>
              </td>
              @for (week of emp.weeks; track week.calendarWeek) {
                <td class="week-cell"
                    [class.status-under]="week.status === 'under' && week.totalPlannedHours > 0"
                    [class.status-optimal]="week.status === 'optimal'"
                    [class.status-over]="week.status === 'over'"
                    [class.status-empty]="week.totalPlannedHours === 0"
                    [matTooltip]="getTooltip(week)">
                  @if (showPercentage) {
                    {{ week.percentage | number:'1.0-0' }}%
                    <div class="pct">{{ week.totalPlannedHours | number:'1.1-1' }}h</div>
                  } @else {
                    {{ week.totalPlannedHours | number:'1.1-1' }}h
                    <div class="pct">{{ week.percentage | number:'1.0-0' }}%</div>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="legend">
      <span class="legend-item"><span class="dot status-empty"></span> Not planned</span>
      <span class="legend-item"><span class="dot status-under"></span> Under (&lt;80%)</span>
      <span class="legend-item"><span class="dot status-optimal"></span> Optimal (80-100%)</span>
      <span class="legend-item"><span class="dot status-over"></span> Over (&gt;100%)</span>
    </div>
    }
  `,
  styles: [`
    .pct { font-size: 11px; color: #666; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningOverviewComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private planningService = inject(PlanningService);
  private departmentService = inject(DepartmentService);

  overview: EmployeeWeekOverview[] = [];
  departments: Department[] = [];
  loading = false;
  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = getISOWeek(new Date()) + 5;
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  departmentId?: number;
  showPercentage = true;

  get weeks(): number[] {
    const w: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) w.push(i);
    return w;
  }

  ngOnInit() {
    this.departmentService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(d => this.departments = d);
    this.load();
  }

  load() {
    this.loading = true;
    this.planningService.getOverview({
      year: this.year,
      weekFrom: this.weekFrom,
      weekTo: this.weekTo,
      departmentId: this.departmentId
    }).pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.overview = data);
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

  private getISOYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
  }

  getTooltip(week: any): string {
    const lines: string[] = [];
    if (week.absenceHours > 0) lines.push(`Absence: ${week.absenceHours}h`);
    if (week.allocations?.length) {
      lines.push(...week.allocations.map((a: any) => `${a.projectName}: ${a.plannedHours}h`));
    }
    return lines.length > 0 ? lines.join('\n') : 'No allocations';
  }
}
