import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlanningService } from './planning.service';

describe('PlanningService', () => {
  let service: PlanningService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlanningService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch allocations with filters', () => {
    service.getAllocations({ year: 2026, weekFrom: 6, weekTo: 10 }).subscribe(allocs => {
      expect(allocs.length).toBe(1);
    });

    const req = httpMock.expectOne(r =>
      r.url.includes('/planning/allocations') &&
      r.params.get('year') === '2026' &&
      r.params.get('weekFrom') === '6' &&
      r.params.get('weekTo') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, employeeId: 1, projectId: 1, calendarWeek: 6, year: 2026, plannedHours: 20 }]);
  });

  it('should pass optional filters', () => {
    service.getAllocations({ year: 2026, weekFrom: 1, weekTo: 5, employeeId: 3, departmentId: 2 }).subscribe();

    const req = httpMock.expectOne(r =>
      r.params.get('employeeId') === '3' &&
      r.params.get('departmentId') === '2'
    );
    req.flush([]);
  });

  it('should upsert allocations', () => {
    const allocations = [
      { employeeId: 1, projectId: 1, calendarWeek: 6, year: 2026, plannedHours: 20 },
      { employeeId: 1, projectId: 2, calendarWeek: 6, year: 2026, plannedHours: 0 }
    ];

    service.upsertAllocations(allocations).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/planning/allocations'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(allocations);
    req.flush(null);
  });

  it('should get overview', () => {
    service.getOverview({ year: 2026, weekFrom: 6, weekTo: 8 }).subscribe(overview => {
      expect(overview.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/planning/overview'));
    expect(req.request.method).toBe('GET');
    req.flush([{ employeeId: 1, employeeName: 'Test', weeks: [] }]);
  });

  it('should get employee allocations', () => {
    service.getEmployeeAllocations(1, 2026, 6, 10).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/planning/employee/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ employeeId: 1, employeeName: 'Test', weeks: [] });
  });
});
