import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ProjectPlanningComponent } from './project-planning.component';
import { environment } from '../../../../environments/environment';

describe('ProjectPlanningComponent', () => {
  let component: ProjectPlanningComponent;
  let fixture: ComponentFixture<ProjectPlanningComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('resourcePlanning.weekTo');

    await TestBed.configureTestingModule({
      imports: [ProjectPlanningComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPlanningComponent);
    fixture.autoDetectChanges(true);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushProjectThresholds() {
    httpMock.expectOne(req => req.url.includes('/planning/project-thresholds')).flush({
      optimalMinPercent: 90,
      optimalMaxPercent: 110
    });
  }

  afterEach(() => httpMock.verify());

  it('should create', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component).toBeTruthy();
  });

  it('should load project overview on init', () => {
    flushProjectThresholds();
    const mockData = [{
      projectId: 1, projectName: 'Test', projectType: 'Customer',
      weeks: [{ calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 30, percentage: 75, status: 'under', allocations: [] }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);
    expect(component.overview.length).toBe(1);
    expect(component.overview[0].projectName).toBe('Test');
  });

  it('should default showPercentage to true', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component.showPercentage).toBe(true);
  });

  it('should track budget changes as dirty', () => {
    flushProjectThresholds();
    const mockData = [{
      projectId: 1, projectName: 'Test', projectType: 'Customer',
      weeks: [{ calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 30, percentage: 75, status: 'under', allocations: [] }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);

    component.onBudgetChange(component.overview[0], component.overview[0].weeks[0], 50);
    expect(component.isDirty).toBe(true);
    expect(component.pendingChanges.size).toBe(1);
  });

  it('should save budgets and reload', () => {
    flushProjectThresholds();
    const mockData = [{
      projectId: 1, projectName: 'Test', projectType: 'Customer',
      weeks: [{ calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 30, percentage: 75, status: 'under', allocations: [] }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);

    component.onBudgetChange(component.overview[0], component.overview[0].weeks[0], 50);
    component.save();

    httpMock.expectOne(req => req.url.includes('/planning/project-budgets') && req.method === 'PUT').flush(null);
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);

    expect(component.isDirty).toBe(false);
  });

  it('should format project planning tooltip with line breaks per item', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);

    const tooltip = component.getCellTooltip(
      { projectId: 1, projectName: 'P1', projectType: 'Customer', weeks: [] },
      {
        calendarWeek: 6,
        year: 2026,
        budgetedHours: 100,
        allocatedHours: 35,
        percentage: 35,
        status: 'under',
        allocations: [
          { employeeId: 1, employeeName: 'Alice A', plannedHours: 20 },
          { employeeId: 2, employeeName: 'Bob B', plannedHours: 15 }
        ]
      }
    );

    expect(tooltip).toContain('Budget: 100h\n');
    expect(tooltip).toContain('Alice A: 20h\n');
    expect(tooltip).toContain('Bob B: 15h\n');
  });

  it('should persist selected to week in localStorage', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);

    component.onToDateChange({ value: new Date(2026, 0, 12) });
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);

    expect(localStorage.getItem('resourcePlanning.weekTo')).toBe(component.weekTo.toString());
  });

  it('should keep status optimal at max threshold boundary', () => {
    flushProjectThresholds();
    const mockData = [{
      projectId: 1, projectName: 'Test', projectType: 'Customer',
      weeks: [{ calendarWeek: 6, year: 2026, budgetedHours: 10, allocatedHours: 11, percentage: 110, status: 'optimal', allocations: [] }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);

    component.onBudgetChange(component.overview[0], component.overview[0].weeks[0], 10);

    expect(component.overview[0].weeks[0].percentage).toBe(110);
    expect(component.overview[0].weeks[0].status).toBe('optimal');
  });
});
