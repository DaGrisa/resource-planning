import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should fetch all active projects', () => {
    service.getAll().subscribe(projects => {
      expect(projects.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/projects') && r.params.get('activeOnly') === 'true');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Portal' }]);
  });

  it('should filter by project type', () => {
    service.getAll(true, 'Customer').subscribe();

    const req = httpMock.expectOne(r => r.params.get('type') === 'Customer');
    req.flush([]);
  });

  it('should create a project', () => {
    const dto = { name: 'New', projectType: 'Customer' as const, projectLeadId: null, startDate: null, endDate: null };

    service.create(dto).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/projects'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, ...dto });
  });

  it('should set team members', () => {
    service.setTeam(1, [2, 3, 4]).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/projects/1/team'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual([2, 3, 4]);
    req.flush(null);
  });

  it('should soft-delete a project', () => {
    service.delete(1).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/projects/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
