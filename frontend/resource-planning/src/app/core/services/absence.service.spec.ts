import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AbsenceService } from './absence.service';

describe('AbsenceService', () => {
  let service: AbsenceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AbsenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch absences with filters', () => {
    service.getAll({ year: 2026, weekFrom: 6, weekTo: 10 }).subscribe(absences => {
      expect(absences.length).toBe(1);
    });

    const req = httpMock.expectOne(r =>
      r.url.includes('/absences') &&
      r.params.get('year') === '2026' &&
      r.params.get('weekFrom') === '6' &&
      r.params.get('weekTo') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, employeeId: 1, employeeName: 'Test', calendarWeek: 6, year: 2026, type: 'Regular', hours: 40, note: 'Vacation' }]);
  });

  it('should pass optional filters', () => {
    service.getAll({ year: 2026, weekFrom: 1, weekTo: 5, employeeId: 3, departmentId: 2 }).subscribe();

    const req = httpMock.expectOne(r =>
      r.params.get('employeeId') === '3' &&
      r.params.get('departmentId') === '2'
    );
    req.flush([]);
  });

  it('should upsert absences', () => {
    const absences = [
      { employeeId: 1, calendarWeek: 6, year: 2026, hours: 40, note: 'Vacation', type: 'Regular' as const }
    ];

    service.upsert(absences).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/absences'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(absences);
    req.flush(null);
  });

  it('should delete absence', () => {
    service.delete(5).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/absences/5'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should fetch holidays', () => {
    service.getHolidays({ year: 2026, weekFrom: 1, weekTo: 10 }).subscribe(holidays => {
      expect(holidays.length).toBe(1);
    });

    const req = httpMock.expectOne(r =>
      r.url.includes('/absences/holidays') &&
      r.params.get('year') === '2026' &&
      r.params.get('weekFrom') === '1' &&
      r.params.get('weekTo') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ date: '2026-01-01', calendarWeek: 1, year: 2026, note: 'Public Holiday' }]);
  });

  it('should upsert holidays', () => {
    const holidays = [{ date: '2026-04-27', note: 'Public Holiday' }];

    service.upsertHolidays(holidays).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/absences/holidays'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(holidays);
    req.flush(null);
  });
});
