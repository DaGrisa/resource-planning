import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmployeeListComponent } from './employee-list.component';

describe('EmployeeListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
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
    const fixture = TestBed.createComponent(EmployeeListComponent);
    fixture.detectChanges();

    // Flush the initial load request
    const req = httpMock.expectOne(r => r.url.includes('/employees'));
    req.flush([]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load employees on init', () => {
    const fixture = TestBed.createComponent(EmployeeListComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('/employees'));
    req.flush([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', weeklyHours: 40, isActive: true, departmentName: 'Dev' }
    ]);

    expect(fixture.componentInstance.employees.length).toBe(1);
  });

  it('should populate employee data after load', () => {
    const fixture = TestBed.createComponent(EmployeeListComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('/employees'));
    req.flush([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', weeklyHours: 40, isActive: true, departmentName: 'Dev' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', weeklyHours: 35, isActive: true, departmentName: 'QA' }
    ]);

    const component = fixture.componentInstance;
    expect(component.employees.length).toBe(2);
    expect(component.employees[0].lastName).toBe('Doe');
    expect(component.employees[1].firstName).toBe('Jane');
    expect(component.loading).toBe(false);
  });

  afterEach(() => httpMock.verify());
});
