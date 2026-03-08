import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EmployeeService } from './employee.service';
import { Employee } from '../models';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch all active employees by default', () => {
    const mockEmployees: Partial<Employee>[] = [
      { id: 1, firstName: 'John', lastName: 'Doe', isActive: true }
    ];

    service.getAll().subscribe(employees => {
      expect(employees.length).toBe(1);
      expect(employees[0].firstName).toBe('John');
    });

    const req = httpMock.expectOne(r => r.url.includes('/employees') && r.params.get('activeOnly') === 'true');
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployees);
  });

  it('should fetch inactive employees when activeOnly is false', () => {
    service.getAll(false).subscribe();

    const req = httpMock.expectOne(r => r.params.get('activeOnly') === 'false');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should filter by departmentId', () => {
    service.getAll(true, 5).subscribe();

    const req = httpMock.expectOne(r => r.params.get('departmentId') === '5');
    req.flush([]);
  });

  it('should get employee by id', () => {
    service.getById(1).subscribe(emp => {
      expect(emp.id).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/employees/1'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, firstName: 'John', lastName: 'Doe' });
  });

  it('should create an employee', () => {
    const dto = { firstName: 'New', lastName: 'User', email: 'new@test.com', weeklyHours: 40, departmentId: null };

    service.create(dto).subscribe(emp => {
      expect(emp.id).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/employees'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 1, ...dto });
  });

  it('should update an employee', () => {
    const dto = { firstName: 'Updated', lastName: 'User', email: 'u@test.com', weeklyHours: 40, departmentId: null, isActive: true };

    service.update(1, dto).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/employees/1'));
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should delete (soft-delete) an employee', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/employees/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
