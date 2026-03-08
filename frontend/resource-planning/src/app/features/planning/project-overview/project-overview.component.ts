import { Component, inject, OnInit } from '@angular/core';
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
import { ProjectWeekOverview, ProjectWeekSummary } from '../../../core/models';
import { getISOWeek, getWeekStart, formatShortDate } from '../../../core/utils/week.utils';

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
                    [matTooltip]="getTooltip(week)">
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
      <span class="legend-item"><span class="dot status-under"></span> Under (&lt;80%)</span>
      <span class="legend-item"><span class="dot status-optimal"></span> Optimal (80-100%)</span>
      <span class="legend-item"><span class="dot status-over"></span> Over (&gt;100%)</span>
    </div>
    }
  `,
  styles: [`
    .proj-header { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
    .pdf-btn { flex-shrink: 0; }
    .week-col { min-width: 80px; }
    .detail { font-size: 11px; color: #666; }
  `]
})
export class ProjectOverviewComponent implements OnInit {
  private planningService = inject(PlanningService);

  overview: ProjectWeekOverview[] = [];
  loading = false;
  year = new Date().getFullYear();
  weekFrom = getISOWeek(new Date());
  weekTo = getISOWeek(new Date()) + 5;
  weekFromDate = getWeekStart(this.year, this.weekFrom);
  weekToDate = getWeekStart(this.year, this.weekTo);
  showPercentage = true;

  get weeks(): number[] {
    const w: number[] = [];
    for (let i = this.weekFrom; i <= this.weekTo; i++) w.push(i);
    return w;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.planningService.getProjectOverview({
      year: this.year,
      weekFrom: this.weekFrom,
      weekTo: this.weekTo
    }).pipe(
      finalize(() => this.loading = false)
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

  getTooltip(week: ProjectWeekSummary): string {
    if (!week.allocations?.length) return 'No allocations';
    return week.allocations.map(a => `${a.employeeName}: ${a.plannedHours}h`).join('\n');
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
        row.push(hours > 0 ? hours : '-');
        weekTotals[i] += hours;
        empTotal += hours;
      });
      row.push(empTotal);
      grandTotal += empTotal;
      body.push(row);
    }

    const foot = [['Total', ...weekTotals.map(t => t > 0 ? t : '-'), grandTotal]];
    const totalBudgeted = proj.weeks.reduce((sum, w) => sum + w.budgetedHours, 0);
    const totalAllocated = proj.weeks.reduce((sum, w) => sum + w.allocatedHours, 0);
    const filename = `${proj.projectName}_CW${this.weekFrom}-CW${this.weekTo}_${this.year}.pdf`;

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
        doc.text(`Budget: ${data.totalBudgeted.toFixed(1)}h budgeted / ${data.totalAllocated.toFixed(1)}h allocated`, 14, finalY + 10);
      }
    }

    doc.save(data.filename);
  }
}
