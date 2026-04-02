import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { finalize } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlanningService } from '../../../core/services/planning.service';
import { ProjectMonthOverview, ProjectMonthSummary, ProjectWeekOverview, ProjectWeekSummary } from '../../../core/models';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';
import { loadStoredToWeek, saveStoredToWeek } from '../../../core/utils/week-filter-storage.utils';

type ViewMode = 'weekly' | 'monthly';

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule, MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <div class="page-header">
      <h1>Project Overview</h1>
    </div>

    <div class="filters">
      <mat-form-field>
        <mat-label>View</mat-label>
        <mat-select [(ngModel)]="viewMode" (ngModelChange)="onViewModeChange()">
          <mat-option value="weekly">Weekly</mat-option>
          <mat-option value="monthly">Monthly</mat-option>
        </mat-select>
      </mat-form-field>

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

    @if (!loading && isCurrentViewEmpty) {
      <div class="empty-state">No active projects. Create projects first.</div>
    }

    @if (!loading && overview.length > 0 && viewMode === 'weekly') {
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
                <div class="proj-header">
                  <div>
                    <div class="first-col-name">{{ proj.projectName }}</div>
                    <div class="first-col-sub">{{ proj.projectType }}</div>
                  </div>
                  <button mat-icon-button matTooltip="Export PDF" (click)="exportPdf(proj)" class="pdf-btn">
                    <mat-icon>picture_as_pdf</mat-icon>
                  </button>
                </div>
              </td>
              @for (week of proj.weeks; track week.calendarWeek) {
                <td class="week-cell"
                    [class.status-none]="week.status === 'none'"
                    [class.status-under]="week.status === 'under'"
                    [class.status-optimal]="week.status === 'optimal'"
                    [class.status-over]="week.status === 'over'"
                  [matTooltip]="getTooltip(week)"
                  matTooltipClass="multiline-tooltip">
                  @if (showPercentage && week.budgetedHours > 0) {
                    {{ week.percentage | number:'1.0-0' }}%
                    <div class="detail">{{ week.allocatedHours | number:'1.1-1' }} / {{ week.budgetedHours | number:'1.1-1' }}h</div>
                  } @else {
                    {{ week.allocatedHours | number:'1.1-1' }}h
                    <div class="detail">Budget: {{ week.budgetedHours | number:'1.1-1' }}h</div>
                  }
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

    @if (!loading && monthlyOverview.length > 0 && viewMode === 'monthly') {
    <div class="grid-container">
      <table class="planning-table monthly-table">
        <thead>
          <tr>
            <th class="first-col">Project</th>
            @for (month of monthColumns; track month.year + '-' + month.month) {
              <th class="week-col">{{ getMonthLabel(month) }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (proj of monthlyOverview; track proj.projectId) {
            <tr>
              <td class="first-col">
                <div class="proj-header">
                  <div>
                    <div class="first-col-name">{{ proj.projectName }}</div>
                    <div class="first-col-sub">{{ proj.projectType }} (monthly)</div>
                  </div>
                  <button mat-icon-button matTooltip="Export PDF" (click)="exportMonthlyPdf(proj)" class="pdf-btn">
                    <mat-icon>picture_as_pdf</mat-icon>
                  </button>
                </div>
              </td>
              @for (month of proj.months; track month.year + '-' + month.month) {
                <td class="week-cell"
                    [class.status-none]="month.status === 'none'"
                    [class.status-under]="month.status === 'under'"
                    [class.status-optimal]="month.status === 'optimal'"
                    [class.status-over]="month.status === 'over'"
                    [matTooltip]="getMonthlyTooltip(month)"
                    matTooltipClass="multiline-tooltip">
                  @if (showPercentage && month.budgetedHours > 0) {
                    {{ month.percentage | number:'1.0-0' }}%
                    <div class="detail">{{ month.allocatedHours | number:'1.1-1' }} / {{ month.budgetedHours | number:'1.1-1' }}h</div>
                  } @else {
                    {{ month.allocatedHours | number:'1.1-1' }}h
                    <div class="detail">Budget: {{ month.budgetedHours | number:'1.1-1' }}h</div>
                  }
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
  `,
  styles: [`
    .proj-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
    .pdf-btn { flex-shrink: 0; }
    .week-col { min-width: 80px; }
    .detail { font-size: 11px; color: #666; }
    .monthly-table .week-col { min-width: 100px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectOverviewComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private planningService = inject(PlanningService);
  private cdr = inject(ChangeDetectorRef);

  overview: ProjectWeekOverview[] = [];
  monthlyOverview: ProjectMonthOverview[] = [];
  loading = false;
  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = loadStoredToWeek(getISOWeek(new Date()) + 5);
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  showPercentage = true;
  viewMode: ViewMode = 'weekly';
  projectOptimalThresholdMin = 90;
  projectOptimalThresholdMax = 110;

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
    this.load();
  }

  get isCurrentViewEmpty(): boolean {
    return this.viewMode === 'weekly' ? this.overview.length === 0 : this.monthlyOverview.length === 0;
  }

  get monthColumns(): ProjectMonthSummary[] {
    return this.monthlyOverview[0]?.months ?? [];
  }

  load() {
    this.loading = true;

    if (this.viewMode === 'weekly') {
      this.planningService.getProjectOverview({
        year: this.year,
        weekFrom: this.weekFrom,
        weekTo: this.weekTo
      }).pipe(
        finalize(() => this.loading = false),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(data => {
        this.overview = data;
        this.monthlyOverview = [];
        this.cdr.markForCheck();
      });
      return;
    }

    this.planningService.getProjectOverviewMonthly({
      year: this.year,
      weekFrom: this.weekFrom,
      weekTo: this.weekTo
    }).pipe(
      finalize(() => this.loading = false),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.monthlyOverview = data;
      this.overview = [];
      this.cdr.markForCheck();
    });
  }

  onViewModeChange() {
    this.load();
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
    saveStoredToWeek(this.weekTo);
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

  getTooltip(week: ProjectWeekSummary): string {
    if (!week.allocations?.length) return 'No allocations';
    return week.allocations.map(a => `${a.employeeName}: ${a.plannedHours}h`).join('\n');
  }

  getMonthlyTooltip(month: ProjectMonthSummary): string {
    if (!month.allocations.length) return 'No allocations';
    return month.allocations.map(a => `${a.employeeName}: ${a.plannedHours}h`).join('\n');
  }

  getMonthLabel(month: ProjectMonthSummary): string {
    return new Date(month.year, month.month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  private formatPdfHours(hours: number): string {
    return hours.toFixed(2);
  }

  buildPdfTableData(proj: ProjectWeekOverview): {
    head: (string | number)[][];
    body: (string | number)[][];
    foot: (string | number)[][];
    totalBudgeted: number;
    totalAllocated: number;
    filename: string;
  } {
    const weekNums = proj.weeks.map(w => w.calendarWeek);

    const employeeMap = new Map<number, string>();
    for (const week of proj.weeks) {
      for (const alloc of week.allocations) {
        if (!employeeMap.has(alloc.employeeId)) {
          employeeMap.set(alloc.employeeId, alloc.employeeName);
        }
      }
    }

    const hoursLookup = new Map<number, Map<number, number>>();
    for (const week of proj.weeks) {
      for (const alloc of week.allocations) {
        if (!hoursLookup.has(alloc.employeeId)) {
          hoursLookup.set(alloc.employeeId, new Map());
        }
        hoursLookup.get(alloc.employeeId)!.set(week.calendarWeek, alloc.plannedHours);
      }
    }

    const head = [['Employee', ...weekNums.map(w => `CW ${w}`), 'Total']];
    const body: (string | number)[][] = [];
    const weekTotals = new Array(weekNums.length).fill(0);
    let grandTotal = 0;

    for (const [empId, empName] of employeeMap) {
      const row: (string | number)[] = [empName];
      let empTotal = 0;
      weekNums.forEach((w, i) => {
        const hours = hoursLookup.get(empId)?.get(w) ?? 0;
        row.push(hours > 0 ? this.formatPdfHours(hours) : '-');
        weekTotals[i] += hours;
        empTotal += hours;
      });
      row.push(this.formatPdfHours(empTotal));
      grandTotal += empTotal;
      body.push(row);
    }

    const foot = [['Total', ...weekTotals.map(t => t > 0 ? this.formatPdfHours(t) : '-'), this.formatPdfHours(grandTotal)]];
    const totalBudgeted = proj.weeks.reduce((sum, w) => sum + w.budgetedHours, 0);
    const totalAllocated = proj.weeks.reduce((sum, w) => sum + w.allocatedHours, 0);
    const filename = `${proj.projectName}_CW${this.weekFrom}-CW${this.weekTo}_${this.year}.pdf`;

    return { head, body, foot, totalBudgeted, totalAllocated, filename };
  }

  buildMonthlyPdfTableData(proj: ProjectMonthOverview): {
    head: (string | number)[][];
    body: (string | number)[][];
    foot: (string | number)[][];
    totalBudgeted: number;
    totalAllocated: number;
    filename: string;
  } {
    const monthKeys = proj.months.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`);
    const monthLabels = proj.months.map(m => this.getMonthLabel(m));

    const employeeMap = new Map<number, string>();
    for (const month of proj.months) {
      for (const alloc of month.allocations) {
        if (!employeeMap.has(alloc.employeeId)) {
          employeeMap.set(alloc.employeeId, alloc.employeeName);
        }
      }
    }

    const hoursLookup = new Map<number, Map<string, number>>();
    for (const month of proj.months) {
      const monthKey = `${month.year}-${String(month.month).padStart(2, '0')}`;
      for (const alloc of month.allocations) {
        if (!hoursLookup.has(alloc.employeeId)) {
          hoursLookup.set(alloc.employeeId, new Map());
        }
        hoursLookup.get(alloc.employeeId)!.set(monthKey, alloc.plannedHours);
      }
    }

    const head = [['Employee', ...monthLabels, 'Total']];
    const body: (string | number)[][] = [];
    const monthTotals = new Array(monthKeys.length).fill(0);
    let grandTotal = 0;

    for (const [empId, empName] of employeeMap) {
      const row: (string | number)[] = [empName];
      let empTotal = 0;
      monthKeys.forEach((key, i) => {
        const hours = hoursLookup.get(empId)?.get(key) ?? 0;
        row.push(hours > 0 ? this.formatPdfHours(hours) : '-');
        monthTotals[i] += hours;
        empTotal += hours;
      });
      row.push(this.formatPdfHours(empTotal));
      grandTotal += empTotal;
      body.push(row);
    }

    const foot = [['Total', ...monthTotals.map(t => t > 0 ? this.formatPdfHours(t) : '-'), this.formatPdfHours(grandTotal)]];
    const totalBudgeted = proj.months.reduce((sum, m) => sum + m.budgetedHours, 0);
    const totalAllocated = proj.months.reduce((sum, m) => sum + m.allocatedHours, 0);
    const filename = `${proj.projectName}_Monthly_CW${this.weekFrom}-CW${this.weekTo}_${this.year}.pdf`;

    return { head, body, foot, totalBudgeted, totalAllocated, filename };
  }

  exportPdf(proj: ProjectWeekOverview): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const data = this.buildPdfTableData(proj);
    const maxWeeksPerPage = 10;

    // Number of week columns (exclude Employee col at index 0 and Total col at end)
    const totalWeeks = data.head[0].length - 2;
    const chunks = Math.ceil(totalWeeks / maxWeeksPerPage);

    for (let chunk = 0; chunk < chunks; chunk++) {
      if (chunk > 0) doc.addPage();

      const startIdx = chunk * maxWeeksPerPage;
      const endIdx = Math.min(startIdx + maxWeeksPerPage, totalWeeks);
      const isLastChunk = chunk === chunks - 1;

      // Slice columns: Employee (0) + week columns for this chunk + Total (only on last chunk)
      const sliceHead = [
        [data.head[0][0], ...data.head[0].slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [data.head[0][data.head[0].length - 1]] : [])]
      ];
      const sliceBody = data.body.map(row => [
        row[0], ...row.slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [row[row.length - 1]] : [])
      ]);
      const sliceFoot = [
        [data.foot[0][0], ...data.foot[0].slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [data.foot[0][data.foot[0].length - 1]] : [])]
      ];

      doc.setFontSize(16);
      doc.text(`${proj.projectName} — Resource Report`, 14, 20);

      doc.setFontSize(11);
      const pageLabel = chunks > 1 ? ` (Page ${chunk + 1}/${chunks})` : '';
      doc.text(`Year ${this.year}, CW ${this.weekFrom} – CW ${this.weekTo}${pageLabel}`, 14, 28);

      autoTable(doc, {
        startY: 34,
        head: sliceHead,
        body: sliceBody,
        foot: sliceFoot,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { halign: 'center', fontSize: 9, minCellWidth: 20 },
        columnStyles: { 0: { halign: 'left', minCellWidth: 40 } },
      });

      if (isLastChunk) {
        const finalY = (doc as any).lastAutoTable?.finalY ?? 34;
        doc.setFontSize(10);
        doc.text(`Budget: ${data.totalBudgeted.toFixed(2)}h budgeted / ${data.totalAllocated.toFixed(2)}h allocated`, 14, finalY + 10);
      }
    }

    doc.save(data.filename);
  }

  exportMonthlyPdf(proj: ProjectMonthOverview): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const data = this.buildMonthlyPdfTableData(proj);
    const maxMonthsPerPage = 10;

    // Number of month columns (exclude Employee col at index 0 and Total col at end)
    const totalMonths = data.head[0].length - 2;
    const chunks = Math.ceil(totalMonths / maxMonthsPerPage);

    for (let chunk = 0; chunk < chunks; chunk++) {
      if (chunk > 0) doc.addPage();

      const startIdx = chunk * maxMonthsPerPage;
      const endIdx = Math.min(startIdx + maxMonthsPerPage, totalMonths);
      const isLastChunk = chunk === chunks - 1;

      const sliceHead = [
        [data.head[0][0], ...data.head[0].slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [data.head[0][data.head[0].length - 1]] : [])]
      ];
      const sliceBody = data.body.map(row => [
        row[0], ...row.slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [row[row.length - 1]] : [])
      ]);
      const sliceFoot = [
        [data.foot[0][0], ...data.foot[0].slice(1 + startIdx, 1 + endIdx), ...(isLastChunk ? [data.foot[0][data.foot[0].length - 1]] : [])]
      ];

      doc.setFontSize(16);
      doc.text(`${proj.projectName} — Monthly Resource Report`, 14, 20);

      doc.setFontSize(11);
      const pageLabel = chunks > 1 ? ` (Page ${chunk + 1}/${chunks})` : '';
      doc.text(`Year ${this.year}, CW ${this.weekFrom} – CW ${this.weekTo}${pageLabel}`, 14, 28);

      autoTable(doc, {
        startY: 34,
        head: sliceHead,
        body: sliceBody,
        foot: sliceFoot,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { halign: 'center', fontSize: 9, minCellWidth: 20 },
        columnStyles: { 0: { halign: 'left', minCellWidth: 40 } },
      });

      if (isLastChunk) {
        const finalY = (doc as any).lastAutoTable?.finalY ?? 34;
        doc.setFontSize(10);
        doc.text(`Budget: ${data.totalBudgeted.toFixed(2)}h budgeted / ${data.totalAllocated.toFixed(2)}h allocated`, 14, finalY + 10);
      }
    }

    doc.save(data.filename);
  }
}
