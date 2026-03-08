import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PlanningService } from '../../../core/services/planning.service';
import { ProjectService } from '../../../core/services/project.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { EmployeeWeekOverview, WeekSummary, AllocationUpsertDto, ProjectAllocationDetail } from '../../../core/models';
import { Department, Project } from '../../../core/models';
import { CellEditorComponent } from './cell-editor.component';
import { BulkAllocationComponent } from './bulk-allocation.component';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';

@Component({
  selector: 'app-capacity-grid',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatSnackBarModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="page-header">
      <h1>Capacity Planning</h1>
      <div class="header-actions">
        <button mat-stroked-button (click)="openBulkAllocation()">
          <mat-icon>date_range</mat-icon> Bulk Plan
        </button>
        @if (isDirty) {
          <button mat-flat-button (click)="save()">
            <mat-icon>save</mat-icon> Save Changes
          </button>
          <button mat-button (click)="loadData()">
            <mat-icon>undo</mat-icon> Discard
          </button>
        }
      </div>
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
        <mat-select [(ngModel)]="departmentId" (selectionChange)="loadData()">
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
                <div class="first-col-sub">{{ emp.departmentName }} ({{ emp.weeklyHours }}h)</div>
              </td>
              @for (week of emp.weeks; track week.calendarWeek) {
                <td class="week-cell-interactive"
                    [class.status-under]="week.status === 'under' && week.totalPlannedHours > 0"
                    [class.status-optimal]="week.status === 'optimal'"
                    [class.status-over]="week.status === 'over'"
                    [class.status-empty]="week.totalPlannedHours === 0"
                    (click)="editCell(emp, week)"
                    [matTooltip]="getCellTooltip(emp, week)">
                  <div class="cell-value">
                    {{ showPercentage ? (week.percentage | number:'1.0-0') + '%' : (week.totalPlannedHours | number:'1.1-1') + 'h' }}
                  </div>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="legend">
      <span class="legend-item"><span class="dot status-under"></span> Under (&lt;80%)</span>
      <span class="legend-item"><span class="dot status-optimal"></span> Optimal (80–100%)</span>
      <span class="legend-item"><span class="dot status-over"></span> Over (&gt;100%)</span>
    </div>
    }

    @if (isDirty) {
      <div class="dirty-banner">
        Unsaved changes. Click "Save Changes" to persist.
      </div>
    }
  `,
  styles: [`
    .cell-value { font-weight: 500; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapacityGridComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private planningService = inject(PlanningService);
  private projectService = inject(ProjectService);
  private departmentService = inject(DepartmentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  authService = inject(AuthService);

  overview: EmployeeWeekOverview[] = [];
  departments: Department[] = [];
  projects: Project[] = [];
  loading = false;

  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = getISOWeek(new Date()) + 5;
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  departmentId?: number;
  showPercentage = true;
  isDirty = false;

  pendingChanges: AllocationUpsertDto[] = [];

  get weeks(): number[] {
    const w: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) w.push(i);
    return w;
  }

  ngOnInit() {
    this.departmentService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(d => this.departments = d);
    this.projectService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => this.projects = p);
    this.loadData();
  }

  loadData() {
    this.isDirty = false;
    this.pendingChanges = [];
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
    this.loadData();
  }

  onToDateChange(event: any) {
    const date = event.value as Date;
    if (!date) return;
    this.weekTo = getISOWeek(date);
    this.weekToDate = getWeekStart(this.year, this.weekTo);
    this.loadData();
  }

  getWeekStartDate(week: number): string {
    return formatShortDate(getWeekStart(this.year, week));
  }

  editCell(emp: EmployeeWeekOverview, week: WeekSummary) {
    const ref = this.dialog.open(CellEditorComponent, {
      width: '400px',
      data: {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        weeklyHours: emp.weeklyHours,
        calendarWeek: week.calendarWeek,
        year: week.year,
        allocations: week.allocations.map(a => ({ ...a })),
        projects: this.projects
      }
    });

    ref.afterClosed().subscribe((result: ProjectAllocationDetail[] | undefined) => {
      if (!result) return;

      // Apply changes locally
      const weekData = emp.weeks.find(w => w.calendarWeek === week.calendarWeek);
      if (!weekData) return;

      weekData.allocations = result;
      weekData.totalPlannedHours = result.reduce((sum, a) => sum + a.plannedHours, 0);
      weekData.percentage = emp.weeklyHours > 0 ? weekData.totalPlannedHours / emp.weeklyHours * 100 : 0;
      weekData.status = weekData.percentage > 100 ? 'over' : weekData.percentage >= 80 ? 'optimal' : 'under';

      // Track changes
      for (const alloc of result) {
        const existing = this.pendingChanges.findIndex(c =>
          c.employeeId === emp.employeeId && c.projectId === alloc.projectId &&
          c.calendarWeek === week.calendarWeek && c.year === week.year);
        const change: AllocationUpsertDto = {
          employeeId: emp.employeeId,
          projectId: alloc.projectId,
          calendarWeek: week.calendarWeek,
          year: week.year,
          plannedHours: alloc.plannedHours
        };
        if (existing >= 0) {
          this.pendingChanges[existing] = change;
        } else {
          this.pendingChanges.push(change);
        }
      }

      this.isDirty = this.pendingChanges.length > 0;
    });
  }

  openBulkAllocation() {
    const ref = this.dialog.open(BulkAllocationComponent, {
      width: '500px',
      data: {
        overview: this.overview,
        projects: this.projects,
        year: this.year,
        weekFrom: this.weekFrom,
        weekTo: this.weekTo
      }
    });

    ref.afterClosed().subscribe((result: AllocationUpsertDto[] | undefined) => {
      if (!result || result.length === 0) return;

      for (const alloc of result) {
        // Merge into pendingChanges
        const existingIdx = this.pendingChanges.findIndex(c =>
          c.employeeId === alloc.employeeId && c.projectId === alloc.projectId &&
          c.calendarWeek === alloc.calendarWeek && c.year === alloc.year);
        if (existingIdx >= 0) {
          this.pendingChanges[existingIdx] = alloc;
        } else {
          this.pendingChanges.push(alloc);
        }

        // Update local overview for visual feedback
        const emp = this.overview.find(e => e.employeeId === alloc.employeeId);
        if (!emp) continue;
        const weekData = emp.weeks.find(w => w.calendarWeek === alloc.calendarWeek && w.year === alloc.year);
        if (!weekData) continue;

        const project = this.projects.find(p => p.id === alloc.projectId);
        const existingAlloc = weekData.allocations.find(a => a.projectId === alloc.projectId);
        if (existingAlloc) {
          existingAlloc.plannedHours = alloc.plannedHours;
          existingAlloc.percentage = emp.weeklyHours > 0 ? alloc.plannedHours / emp.weeklyHours * 100 : 0;
        } else {
          weekData.allocations.push({
            projectId: alloc.projectId,
            projectName: project?.name ?? '',
            plannedHours: alloc.plannedHours,
            percentage: emp.weeklyHours > 0 ? alloc.plannedHours / emp.weeklyHours * 100 : 0
          });
        }

        weekData.totalPlannedHours = weekData.allocations.reduce((sum, a) => sum + a.plannedHours, 0);
        weekData.percentage = emp.weeklyHours > 0 ? weekData.totalPlannedHours / emp.weeklyHours * 100 : 0;
        weekData.status = weekData.percentage > 100 ? 'over' : weekData.percentage >= 80 ? 'optimal' : 'under';
      }

      this.isDirty = this.pendingChanges.length > 0;
    });
  }

  save() {
    this.planningService.upsertAllocations(this.pendingChanges).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.snackBar.open('Allocations saved', 'OK', { duration: 3000 });
      this.loadData();
    });
  }

  private getISOYear(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
  }

  getCellTooltip(emp: EmployeeWeekOverview, week: WeekSummary): string {
    const lines: string[] = [];
    if (week.absenceHours > 0) lines.push(`Absence: ${week.absenceHours}h`);
    if (week.allocations.length > 0) {
      lines.push(...week.allocations.map(a => `${a.projectName}: ${a.plannedHours}h`));
    }
    return lines.length > 0 ? lines.join('\n') : 'Click to add allocations';
  }
}
