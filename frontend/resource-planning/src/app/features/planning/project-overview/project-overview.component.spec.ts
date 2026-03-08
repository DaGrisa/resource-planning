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

  afterEach(() => httpMock.verify());

  it('should create', () => {
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component).toBeTruthy();
  });

  it('should load project overview on init', () => {
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
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component.showPercentage).toBe(true);
  });

  it('should generate correct tooltip', () => {
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
    expect(data.body[0]).toEqual(['John Doe', 20, 30, 50]); // CW6: 20h, CW7: 30h
    expect(data.body[1]).toEqual(['Jane Smith', 15, '-', 15]); // CW6: 15h, CW7: none

    // Verify footer
    expect(data.foot[0]).toEqual(['Total', 35, 30, 65]);

    // Verify budget
    expect(data.totalBudgeted).toBe(80);
    expect(data.totalAllocated).toBe(65);

    // Verify filename uses component's current weekFrom/weekTo
    expect(data.filename).toBe(`TestProject_CW${component.weekFrom}-CW${component.weekTo}_${component.year}.pdf`);
  });
});
