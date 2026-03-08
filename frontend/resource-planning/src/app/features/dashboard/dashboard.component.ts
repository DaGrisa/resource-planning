import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, finalize } from 'rxjs';
import { EmployeeService } from '../../core/services/employee.service';
import { DepartmentService } from '../../core/services/department.service';
import { ProjectService } from '../../core/services/project.service';
import { PlanningService } from '../../core/services/planning.service';
import { Department, Project, ProjectWeekOverview, EmployeeWeekOverview, WeekSummary } from '../../core/models';
import { getISOWeek } from '../../core/utils/week.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    @if (isEmpty) {
      <mat-card class="getting-started">
        <mat-card-header>
          <mat-icon mat-card-avatar>rocket_launch</mat-icon>
          <mat-card-title>Getting Started</mat-card-title>
          <mat-card-subtitle>Set up your resource planning in a few steps</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <ol class="steps">
            <li><a routerLink="/departments">Create departments</a> to organize your teams</li>
            <li><a routerLink="/employees">Add employees</a> and assign them to departments</li>
            <li><a routerLink="/projects">Create projects</a> that need capacity</li>
            <li><a routerLink="/planning">Plan capacity</a> by allocating hours per week</li>
          </ol>
        </mat-card-content>
      </mat-card>
    }

    @if (!isEmpty) {
      <h2 class="section-title">Overview</h2>
      <div class="cards">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>people</mat-icon>
            <mat-card-title>{{ employeeCount }}</mat-card-title>
            <mat-card-subtitle>Active Employees</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <a mat-button routerLink="/employees">View</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>{{ departmentCount }}</mat-card-title>
            <mat-card-subtitle>Departments</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <a mat-button routerLink="/departments">View</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>folder</mat-icon>
            <mat-card-title>{{ projectCount }}</mat-card-title>
            <mat-card-subtitle>Active Projects</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <a mat-button routerLink="/projects">View</a>
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>calendar_month</mat-icon>
            <mat-card-title>CW {{ currentWeek }}</mat-card-title>
            <mat-card-subtitle>Current Week</mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions>
            <a mat-button routerLink="/planning">Plan</a>
          </mat-card-actions>
        </mat-card>
      </div>

      <h2 class="section-title">Planning</h2>
      <div class="filters">
        <mat-form-field>
          <mat-label>Department</mat-label>
          <mat-select [(ngModel)]="selectedDepartmentId" (ngModelChange)="onDepartmentChange()">
            <mat-option [value]="undefined">All</mat-option>
            @for (dept of departments; track dept.id) {
              <mat-option [value]="dept.id">{{ dept.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()">
            <mat-option [value]="undefined">All</mat-option>
            @for (proj of projects; track proj.id) {
              <mat-option [value]="proj.id">{{ proj.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="planning-summary">
        <mat-card-header>
          <mat-icon mat-card-avatar>assessment</mat-icon>
          <mat-card-title>Planning Status — CW {{ currentWeek }}–{{ currentWeek + 3 }}</mat-card-title>
          <mat-card-subtitle>Overview of the next 4 weeks</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-grid">
            <div class="summary-item" [class.mis-planned]="misPlannedEmployees > 0" [class.ok]="misPlannedEmployees === 0">
              <mat-icon>people</mat-icon>
              <span class="count">{{ misPlannedEmployees }}</span>
              <span class="label">mis-planned employees</span>
            </div>
            <div class="summary-item" [class.mis-planned]="misPlannedProjects > 0" [class.ok]="misPlannedProjects === 0">
              <mat-icon>folder</mat-icon>
              <span class="count">{{ misPlannedProjects }}</span>
              <span class="label">mis-planned projects</span>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/planning/overview">Employee Overview</a>
          <a mat-button routerLink="/planning/project-overview">Project Overview</a>
        </mat-card-actions>
      </mat-card>

      @if (overPlanned.length > 0) {
        <mat-card class="alert-card over">
          <mat-card-header>
            <mat-icon mat-card-avatar class="warn-icon">warning</mat-icon>
            <mat-card-title>Over-planned Employees</mat-card-title>
            <mat-card-subtitle>Employees with &gt;100% allocation in the next 4 weeks</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="entry-grid">
              @for (entry of overPlanned; track entry.employeeName + entry.week.calendarWeek) {
                <div class="entry-chip over">
                  <span class="entry-name">{{ entry.employeeName }}</span>
                  <span class="entry-week">CW {{ entry.week.calendarWeek }}</span>
                  <span class="entry-pct">{{ entry.week.percentage | number:'1.0-0' }}%</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (underPlanned.length > 0) {
        <mat-card class="alert-card under">
          <mat-card-header>
            <mat-icon mat-card-avatar class="info-icon">info</mat-icon>
            <mat-card-title>Under-planned Employees</mat-card-title>
            <mat-card-subtitle>Employees with &lt;80% allocation in the next 4 weeks</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="entry-grid">
              @for (entry of underPlanned; track entry.employeeName + entry.week.calendarWeek) {
                <div class="entry-chip under">
                  <span class="entry-name">{{ entry.employeeName }}</span>
                  <span class="entry-week">CW {{ entry.week.calendarWeek }}</span>
                  <span class="entry-pct">{{ entry.week.percentage | number:'1.0-0' }}%</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .section-title { font-size: 16px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    mat-card-header mat-icon[mat-card-avatar] { font-size: 32px; width: 40px; height: 40px; line-height: 40px; color: #1565c0; }
    .alert-card { margin-bottom: 16px; }
    .alert-card.over { border-left: 4px solid #f44336; }
    .alert-card.under { border-left: 4px solid #ff9800; }
    .warn-icon { color: #f44336; }
    .info-icon { color: #ff9800; }
    .getting-started { max-width: 600px; margin-bottom: 24px; border-left: 4px solid #1565c0; }
    .getting-started mat-icon[mat-card-avatar] { color: #1565c0; }
    .getting-started ol.steps { padding-left: 20px; }
    .getting-started ol.steps li { margin-bottom: 8px; line-height: 1.6; }
    .getting-started ol.steps a { color: #1565c0; text-decoration: none; font-weight: 500; }
    .getting-started ol.steps a:hover { text-decoration: underline; }
    .planning-summary { margin-bottom: 16px; border-left: 4px solid #1565c0; }
    .planning-summary mat-icon[mat-card-avatar] { color: #1565c0; }
    .entry-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .entry-chip { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: 0 8px; padding: 8px 12px; border-radius: 8px; min-width: 160px; }
    .entry-chip.over { background: #fdecea; border-left: 3px solid #f44336; }
    .entry-chip.under { background: #fff8e1; border-left: 3px solid #ff9800; }
    .entry-name { font-weight: 500; font-size: 13px; grid-column: 1; grid-row: 1; }
    .entry-week { font-size: 11px; color: #888; grid-column: 1; grid-row: 2; }
    .entry-pct { font-weight: 700; font-size: 15px; grid-column: 2; grid-row: 1 / 3; align-self: center; }
    .summary-grid { display: flex; gap: 24px; margin-top: 8px; }
    .summary-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; }
    .summary-item.mis-planned { background: #fff3e0; }
    .summary-item.mis-planned mat-icon { color: #ff9800; }
    .summary-item.ok { background: #e8f5e9; }
    .summary-item.ok mat-icon { color: #43a047; }
    .summary-item .count { font-size: 24px; font-weight: 600; color: #1a2a3a; }
    .summary-item .label { font-size: 13px; color: #666; }
  `]
})
export class DashboardComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private departmentService = inject(DepartmentService);
  private projectService = inject(ProjectService);
  private planningService = inject(PlanningService);

  employeeCount = 0;
  departmentCount = 0;
  projectCount = 0;
  loading = false;
  currentWeek = getISOWeek(new Date());

  departments: Department[] = [];
  projects: Project[] = [];
  selectedDepartmentId?: number;
  selectedProjectId?: number;

  overPlanned: { employeeName: string; week: WeekSummary }[] = [];
  underPlanned: { employeeName: string; week: WeekSummary }[] = [];
  misPlannedEmployees = 0;
  misPlannedProjects = 0;

  private allEmployeeOverview: EmployeeWeekOverview[] = [];
  private allProjectOverview: ProjectWeekOverview[] = [];

  get isEmpty(): boolean {
    return !this.loading && this.employeeCount === 0 && this.departmentCount === 0 && this.projectCount === 0;
  }

  ngOnInit() {
    this.loading = true;
    forkJoin([
      this.employeeService.getAll(),
      this.departmentService.getAll(),
      this.projectService.getAll(),
      this.planningService.getOverview({
        year: new Date().getFullYear(),
        weekFrom: this.currentWeek,
        weekTo: this.currentWeek + 3
      }),
      this.planningService.getProjectOverview({
        year: new Date().getFullYear(),
        weekFrom: this.currentWeek,
        weekTo: this.currentWeek + 3
      })
    ]).pipe(
      finalize(() => this.loading = false)
    ).subscribe(([employees, departments, projects, overview, projectOverview]) => {
      this.employeeCount = employees.length;
      this.departmentCount = departments.length;
      this.projectCount = projects.length;
      this.departments = departments;
      this.projects = projects;
      this.allEmployeeOverview = overview;
      this.allProjectOverview = projectOverview;
      this.applyFilters();
    });
  }

  onDepartmentChange() {
    if (this.selectedDepartmentId) this.selectedProjectId = undefined;
    this.applyFilters();
  }

  onProjectChange() {
    if (this.selectedProjectId) this.selectedDepartmentId = undefined;
    this.applyFilters();
  }

  private applyFilters() {
    let employeeOverview = this.allEmployeeOverview;

    if (this.selectedDepartmentId) {
      const dept = this.departments.find(d => d.id === this.selectedDepartmentId);
      if (dept) employeeOverview = employeeOverview.filter(e => e.departmentName === dept.name);
    }

    if (this.selectedProjectId) {
      employeeOverview = employeeOverview.filter(e =>
        e.weeks.some(w => w.allocations.some(a => a.projectId === this.selectedProjectId)));
    }

    this.overPlanned = employeeOverview.flatMap(e =>
      e.weeks.filter(w => w.status === 'over').map(w => ({ employeeName: e.employeeName, week: w })));
    this.underPlanned = employeeOverview.flatMap(e =>
      e.weeks.filter(w => w.status === 'under' && w.totalPlannedHours > 0).map(w => ({ employeeName: e.employeeName, week: w })));

    const misPlannedSet = new Set([
      ...this.overPlanned.map(e => e.employeeName),
      ...this.underPlanned.map(e => e.employeeName)
    ]);
    this.misPlannedEmployees = misPlannedSet.size;

    let projectOverview = this.allProjectOverview;
    if (this.selectedProjectId) {
      projectOverview = projectOverview.filter(p => p.projectId === this.selectedProjectId);
    }
    this.misPlannedProjects = projectOverview.filter(p =>
      p.weeks.some(w => w.status === 'over' || w.status === 'under')).length;
  }
}
