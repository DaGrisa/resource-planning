import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
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
import { finalize } from 'rxjs';
import { ProjectWeekOverview, ProjectWeekSummary, ProjectBudgetUpsertDto } from '../../../core/models';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';
import { loadStoredToWeek, saveStoredToWeek } from '../../../core/utils/week-filter-storage.utils';
import { BulkBudgetComponent } from './bulk-budget.component';

@Component({
  selector: 'app-project-planning',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatSnackBarModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="page-header">
      <h1>Project Planning</h1>
      <div class="header-actions">
        <button mat-stroked-button (click)="openBulkBudget()">
          <mat-icon>date_range</mat-icon> Bulk Plan
        </button>
        @if (isDirty) {
          <button mat-flat-button (click)="save()">
            <mat-icon>save</mat-icon> Save Budgets
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

      <mat-slide-toggle [(ngModel)]="showPercentage">Show %</mat-slide-toggle>
    </div>

    @if (loading) {
      <div class="spinner"><mat-spinner diameter="40"></mat-spinner></div>
    }

    @if (!loading && overview.length === 0) {
      <div class="empty-state">No active projects. Create projects first.</div>
    }

    @if (!loading && overview.length > 0) {
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
            @for (proj of overview; track proj.projectId) {
              <tr>
                <td class="first-col">
                  <div class="first-col-name">{{ proj.projectName }}</div>
                  <div class="first-col-sub">{{ proj.projectType }}</div>
                </td>
                @for (week of proj.weeks; track week.calendarWeek) {
                  <td class="week-cell"
                      [class.status-none]="week.status === 'none'"
                      [class.status-under]="week.status === 'under'"
                      [class.status-optimal]="week.status === 'optimal'"
                      [class.status-over]="week.status === 'over'"
                      [matTooltip]="getCellTooltip(proj, week)"
                      matTooltipClass="multiline-tooltip">
                    <div class="budget-row">
                      <input type="number" class="budget-input" min="0" step="1"
                        [ngModel]="week.budgetedHours"
                        (ngModelChange)="onBudgetChange(proj, week, $event)" />
                    </div>
                    <div class="allocated-row">
                      @if (showPercentage && week.budgetedHours > 0) {
                        {{ week.percentage | number:'1.0-0' }}%
                      } @else {
                        {{ week.allocatedHours | number:'1.1-1' }}h
                      }
                    </div>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="legend">
        <span class="legend-item"><span class="dot status-none"></span> No budget</span>
        <span class="legend-item"><span class="dot status-under"></span> Under (&lt;{{ projectOptimalThresholdMin }}%)</span>
        <span class="legend-item"><span class="dot status-optimal"></span> Optimal ({{ projectOptimalThresholdMin }}-{{ projectOptimalThresholdMax }}%)</span>
        <span class="legend-item"><span class="dot status-over"></span> Over (&gt;{{ projectOptimalThresholdMax }}%)</span>
      </div>
    }

    @if (isDirty) {
      <div class="dirty-banner">
        Unsaved budget changes. Click "Save Budgets" to persist.
      </div>
    }
  `,
  styles: [`
    .week-col { min-width: 80px; }
    .week-cell { vertical-align: middle; }
    .budget-row { margin-bottom: 2px; }
    .budget-input { width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 4px; padding: 2px 4px; font-size: 13px; }
    .budget-input:focus { outline: none; border-color: #1976d2; }
    .allocated-row { font-size: 12px; color: #666; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectPlanningComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private planningService = inject(PlanningService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  overview: ProjectWeekOverview[] = [];
  loading = false;

  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = loadStoredToWeek(getISOWeek(new Date()) + 5);
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  showPercentage = true;
  isDirty = false;
  projectOptimalThresholdMin = 90;
  projectOptimalThresholdMax = 110;

  pendingChanges: Map<string, ProjectBudgetUpsertDto> = new Map();

  get weeks(): number[] {
    const w: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) w.push(i);
    return w;
  }

  ngOnInit() {
    this.planningService.getProjectThresholds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(thresholds => {
      this.projectOptimalThresholdMin = thresholds.optimalMinPercent;
      this.projectOptimalThresholdMax = thresholds.optimalMaxPercent;
      this.cdr.markForCheck();
    });
    this.loadData();
  }

  loadData() {
    this.isDirty = false;
    this.pendingChanges.clear();
    this.loading = true;
    this.planningService.getProjectOverview({
      year: this.year,
      weekFrom: this.weekFrom,
      weekTo: this.weekTo
    }).pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => { this.overview = data; this.cdr.markForCheck(); });
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
    saveStoredToWeek(this.weekTo);
    this.weekToDate = getWeekStart(this.year, this.weekTo);
    this.loadData();
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

  onBudgetChange(proj: ProjectWeekOverview, week: ProjectWeekSummary, value: number) {
    const hours = value ?? 0;
    week.budgetedHours = hours;

    // Recompute status
    week.percentage = hours > 0 ? week.allocatedHours / hours * 100 : 0;
    const roundedPercentageForStatus = Math.round(week.percentage);
    week.percentage = Math.round(week.percentage * 10) / 10;
    week.status = hours <= 0
      ? 'none'
      : roundedPercentageForStatus > this.projectOptimalThresholdMax
        ? 'over'
        : roundedPercentageForStatus >= this.projectOptimalThresholdMin
          ? 'optimal'
          : 'under';

    const key = `${proj.projectId}-${week.calendarWeek}-${week.year}`;
    this.pendingChanges.set(key, {
      projectId: proj.projectId,
      calendarWeek: week.calendarWeek,
      year: week.year,
      budgetedHours: hours
    });

    this.isDirty = this.pendingChanges.size > 0;
  }

  openBulkBudget() {
    const ref = this.dialog.open(BulkBudgetComponent, {
      width: '500px',
      data: {
        overview: this.overview,
        year: this.year,
        weekFrom: this.weekFrom,
        weekTo: this.weekTo
      }
    });

    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: ProjectBudgetUpsertDto[] | undefined) => {
      if (!result || result.length === 0) return;

      for (const budget of result) {
        const project = this.overview.find(p => p.projectId === budget.projectId);
        const week = project?.weeks.find(w => w.calendarWeek === budget.calendarWeek && w.year === budget.year);

        if (project && week) {
          this.onBudgetChange(project, week, budget.budgetedHours);
        } else {
          const key = `${budget.projectId}-${budget.calendarWeek}-${budget.year}`;
          this.pendingChanges.set(key, budget);
        }
      }

      this.isDirty = this.pendingChanges.size > 0;
      this.cdr.markForCheck();
    });
  }

  save() {
    const budgets = Array.from(this.pendingChanges.values());
    this.planningService.upsertProjectBudgets(budgets).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.snackBar.open('Project budgets saved', 'OK', { duration: 3000 });
      this.loadData();
    });
  }

  getCellTooltip(proj: ProjectWeekOverview, week: ProjectWeekSummary): string {
    const lines = [`Budget: ${week.budgetedHours}h`];
    if (week.allocations.length === 0) {
      lines.push('No allocations');
    } else {
      lines.push(...week.allocations.map(a => `${a.employeeName}: ${a.plannedHours}h`));
    }

    return `${lines.join('\n')}\n`;
  }
}
