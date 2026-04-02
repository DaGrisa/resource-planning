import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ProjectOverviewComponent } from './project-overview.component';

describe('ProjectOverviewComponent', () => {
  let component: ProjectOverviewComponent;
  let fixture: ComponentFixture<ProjectOverviewComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectOverviewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectOverviewComponent);
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
      projectId: 1, projectName: 'TestProject', projectType: 'Customer',
      weeks: [{
        calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 35,
        percentage: 87.5, status: 'optimal',
        allocations: [{ employeeId: 1, employeeName: 'John Doe', plannedHours: 35 }]
      }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);
    expect(component.overview.length).toBe(1);
    expect(component.overview[0].weeks[0].status).toBe('optimal');
  });

  it('should default showPercentage to true', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component.showPercentage).toBe(true);
  });

  it('should generate correct tooltip', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    const week: any = {
      allocations: [
        { employeeId: 1, employeeName: 'Alice A', plannedHours: 20 },
        { employeeId: 2, employeeName: 'Bob B', plannedHours: 15 }
      ]
    };
    const tooltip = component.getTooltip(week);
    expect(tooltip).toContain('Alice A: 20h');
    expect(tooltip).toContain('Bob B: 15h');
  });

  it('should build PDF table data correctly', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    const mockProj: any = {
      projectId: 1,
      projectName: 'TestProject',
      projectType: 'Customer',
      weeks: [
        {
          calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 35,
          percentage: 87.5, status: 'optimal',
          allocations: [
            { employeeId: 1, employeeName: 'John Doe', plannedHours: 20 },
            { employeeId: 2, employeeName: 'Jane Smith', plannedHours: 15 }
          ]
        },
        {
          calendarWeek: 7, year: 2026, budgetedHours: 40, allocatedHours: 30,
          percentage: 75, status: 'under',
          allocations: [
            { employeeId: 1, employeeName: 'John Doe', plannedHours: 30 }
          ]
        }
      ]
    };
    const data = component.buildPdfTableData(mockProj);

    // Verify header
    expect(data.head[0]).toEqual(['Employee', 'CW 6', 'CW 7', 'Total']);

    // Verify body rows
    expect(data.body.length).toBe(2);
    expect(data.body[0]).toEqual(['John Doe', '20.00', '30.00', '50.00']); // CW6: 20h, CW7: 30h
    expect(data.body[1]).toEqual(['Jane Smith', '15.00', '-', '15.00']); // CW6: 15h, CW7: none

    // Verify footer
    expect(data.foot[0]).toEqual(['Total', '35.00', '30.00', '65.00']);

    // Verify budget
    expect(data.totalBudgeted).toBe(80);
    expect(data.totalAllocated).toBe(65);

    // Verify filename uses component's current weekFrom/weekTo
    expect(data.filename).toBe(`TestProject_CW${component.weekFrom}-CW${component.weekTo}_${component.year}.pdf`);
  });

  it('should build monthly PDF table data correctly', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);

    const mockMonthlyProj: any = {
      projectId: 1,
      projectName: 'MonthlyProject',
      projectType: 'Customer',
      months: [
        {
          year: 2026,
          month: 3,
          budgetedHours: 20,
          allocatedHours: 10,
          percentage: 50,
          status: 'under',
          allocations: [
            { employeeId: 1, employeeName: 'John Doe', plannedHours: 4 },
            { employeeId: 2, employeeName: 'Jane Smith', plannedHours: 6 }
          ]
        },
        {
          year: 2026,
          month: 4,
          budgetedHours: 30,
          allocatedHours: 15,
          percentage: 50,
          status: 'under',
          allocations: [
            { employeeId: 1, employeeName: 'John Doe', plannedHours: 7 },
            { employeeId: 2, employeeName: 'Jane Smith', plannedHours: 8 }
          ]
        }
      ]
    };

    const data = component.buildMonthlyPdfTableData(mockMonthlyProj);

    expect(data.head[0]).toEqual(['Employee', 'Mar 2026', 'Apr 2026', 'Total']);
    expect(data.body.length).toBe(2);
    expect(data.body[0]).toEqual(['John Doe', '4.00', '7.00', '11.00']);
    expect(data.body[1]).toEqual(['Jane Smith', '6.00', '8.00', '14.00']);
    expect(data.foot[0]).toEqual(['Total', '10.00', '15.00', '25.00']);
    expect(data.totalBudgeted).toBe(50);
    expect(data.totalAllocated).toBe(25);
    expect(data.filename).toBe(`MonthlyProject_Monthly_CW${component.weekFrom}-CW${component.weekTo}_${component.year}.pdf`);
  });

  it('should load monthly overview from dedicated endpoint when switching view mode', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([
      { projectId: 10, projectName: 'A', projectType: 'Customer', weeks: [] },
      { projectId: 20, projectName: 'B', projectType: 'Internal', weeks: [] }
    ]);

    component.viewMode = 'monthly';
    component.onViewModeChange();

    const req = httpMock.expectOne(r => r.url.includes('/planning/project-overview-monthly'));
    req.flush([
      {
        projectId: 10,
        projectName: 'A',
        projectType: 'Customer',
        months: [
          {
            year: 2026,
            month: 2,
            budgetedHours: 80,
            allocatedHours: 60,
            percentage: 75,
            status: 'under',
            allocations: [{ employeeId: 1, employeeName: 'Alice A', plannedHours: 60 }]
          }
        ]
      }
    ]);

    expect(component.monthlyOverview.length).toBe(1);
    expect(component.monthlyOverview[0].months[0].allocatedHours).toBe(60);
  });

  it('should expose month columns from first monthly project row', () => {
    flushProjectThresholds();
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([
      { projectId: 1, projectName: 'Monthly Project', projectType: 'Customer', weeks: [] }
    ]);

    component.viewMode = 'monthly';
    component.onViewModeChange();

    httpMock.expectOne(r => r.url.includes('/planning/project-overview-monthly')).flush([
      {
        projectId: 1,
        projectName: 'Monthly Project',
        projectType: 'Customer',
        months: [
          {
            year: 2026,
            month: 1,
            budgetedHours: 40,
            allocatedHours: 40,
            percentage: 100,
            status: 'optimal',
            allocations: []
          },
          {
            year: 2026,
            month: 2,
            budgetedHours: 80,
            allocatedHours: 88,
            percentage: 110,
            status: 'optimal',
            allocations: []
          }
        ]
      }
    ]);

    expect(component.monthColumns.length).toBe(2);
    expect(component.monthColumns[0].month).toBe(1);
    expect(component.monthColumns[1].month).toBe(2);
    expect(component.getMonthLabel(component.monthColumns[0])).toContain('2026');
  });
});
