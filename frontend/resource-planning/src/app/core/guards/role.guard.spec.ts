import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  it('should allow access when user has required role', () => {
    authService.currentUser.set({
      id: 1, username: 'admin', displayName: 'Admin', isActive: true,
      employeeId: null, employeeName: null, roles: ['Admin'], createdAt: '', updatedAt: ''
    });

    const guard = roleGuard('Admin');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should redirect when user lacks required role', () => {
    authService.currentUser.set({
      id: 1, username: 'user', displayName: 'User', isActive: true,
      employeeId: null, employeeName: null, roles: ['Employee'], createdAt: '', updatedAt: ''
    });
    const navigateSpy = vi.spyOn(router, 'navigate');

    const guard = roleGuard('Admin');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should allow access when user has any of the required roles', () => {
    authService.currentUser.set({
      id: 1, username: 'mgr', displayName: 'Manager', isActive: true,
      employeeId: null, employeeName: null, roles: ['ProjectManager'], createdAt: '', updatedAt: ''
    });

    const guard = roleGuard('Admin', 'ProjectManager');
    const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));

    expect(result).toBe(true);
  });
});
