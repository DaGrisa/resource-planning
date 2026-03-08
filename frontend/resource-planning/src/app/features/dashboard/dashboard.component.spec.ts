import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    // Flush the forkJoin requests
    httpMock.match(r => r.url.includes('/employees'))[0]?.flush([]);
    httpMock.match(r => r.url.includes('/departments'))[0]?.flush([]);
    httpMock.match(r => r.url.includes('/projects'))[0]?.flush([]);
    httpMock.match(r => r.url.includes('/planning/overview'))[0]?.flush([]);
    httpMock.match(r => r.url.includes('/planning/project-overview'))[0]?.flush([]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display correct counts', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.autoDetectChanges(true);

    // Respond to forkJoin requests
    const empReq = httpMock.match(r => r.url.includes('/employees'));
    empReq[0]?.flush([{ id: 1 }, { id: 2 }, { id: 3 }]);

    const deptReq = httpMock.match(r => r.url.includes('/departments'));
    deptReq[0]?.flush([{ id: 1 }, { id: 2 }]);

    const projReq = httpMock.match(r => r.url.includes('/projects'));
    projReq[0]?.flush([{ id: 1 }]);

    const overviewReq = httpMock.match(r => r.url.includes('/planning/overview'));
    overviewReq[0]?.flush([]);

    const projOverviewReq = httpMock.match(r => r.url.includes('/planning/project-overview'));
    projOverviewReq[0]?.flush([]);

    expect(fixture.componentInstance.employeeCount).toBe(3);
    expect(fixture.componentInstance.departmentCount).toBe(2);
    expect(fixture.componentInstance.projectCount).toBe(1);
  });

  afterEach(() => httpMock.verify());
});
