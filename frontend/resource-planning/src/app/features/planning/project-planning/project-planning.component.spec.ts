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
    await TestBed.configureTestingModule({
      imports: [ProjectPlanningComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPlanningComponent);
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
      projectId: 1, projectName: 'Test', projectType: 'Customer',
      weeks: [{ calendarWeek: 6, year: 2026, budgetedHours: 40, allocatedHours: 30, percentage: 75, status: 'under', allocations: [] }]
    }];
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush(mockData);
    expect(component.overview.length).toBe(1);
    expect(component.overview[0].projectName).toBe('Test');
  });

  it('should default showPercentage to true', () => {
    httpMock.expectOne(req => req.url.includes('/planning/project-overview')).flush([]);
    expect(component.showPercentage).toBe(true);
  });

  it('should track budget changes as dirty', () => {
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
});
