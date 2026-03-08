import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be logged in initially', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should login and store token/user', () => {
    const mockResponse = {
      token: 'jwt-token-123',
      user: {
        id: 1, username: 'admin', displayName: 'Admin',
        isActive: true, employeeId: null, employeeName: null,
        roles: ['Admin'] as any, createdAt: '', updatedAt: ''
      }
    };

    service.login({ username: 'admin', password: 'admin123' }).subscribe(response => {
      expect(response.token).toBe('jwt-token-123');
      expect(service.isLoggedIn()).toBe(true);
      expect(service.currentUser()?.username).toBe('admin');
      expect(localStorage.getItem('token')).toBe('jwt-token-123');
    });

    const req = httpMock.expectOne('http://localhost:5113/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should logout and clear storage', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', roles: ['Admin'] }));
    const navigateSpy = vi.spyOn(router, 'navigate');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should return token from localStorage', () => {
    localStorage.setItem('token', 'stored-token');
    expect(service.getToken()).toBe('stored-token');
  });

  it('should check roles correctly', () => {
    expect(service.hasRole('Admin')).toBe(false); // no user set
    service.currentUser.set({ id: 1, username: 'admin', displayName: 'Admin', isActive: true, employeeId: null, employeeName: null, roles: ['Admin', 'DepartmentManager'], createdAt: '', updatedAt: '' });
    expect(service.hasRole('Admin')).toBe(true);
    expect(service.hasRole('DepartmentManager')).toBe(true);
    expect(service.hasRole('Employee')).toBe(false);
  });

  it('hasAnyRole should return true if user has at least one role', () => {
    // Set user with roles via login
    const mockResponse = {
      token: 'jwt-token-123',
      user: {
        id: 1, username: 'admin', displayName: 'Admin',
        isActive: true, employeeId: null, employeeName: null,
        roles: ['Admin', 'DepartmentManager'] as any, createdAt: '', updatedAt: ''
      }
    };

    service.login({ username: 'admin', password: 'admin123' }).subscribe(() => {
      expect(service.hasAnyRole('Admin', 'Employee')).toBe(true);
      expect(service.hasAnyRole('ProjectManager', 'Employee')).toBe(false);
    });

    httpMock.expectOne('http://localhost:5113/api/auth/login').flush(mockResponse);
  });
});
