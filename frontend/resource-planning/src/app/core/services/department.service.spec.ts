import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DepartmentService } from './department.service';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DepartmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch all departments', () => {
    service.getAll().subscribe(depts => {
      expect(depts.length).toBe(2);
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/departments'));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
  });

  it('should get department by id', () => {
    service.getById(1).subscribe(dept => {
      expect(dept.name).toBe('Engineering');
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/departments/1'));
    req.flush({ id: 1, name: 'Engineering', managers: [], employees: [] });
  });

  it('should create a department', () => {
    service.create({ name: 'New', leadManagerId: null }).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/departments'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, name: 'New' });
  });

  it('should set managers', () => {
    service.setManagers(1, [2, 3]).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/departments/1/managers'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([2, 3]);
    req.flush(null);
  });

  it('should delete a department', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/departments/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
