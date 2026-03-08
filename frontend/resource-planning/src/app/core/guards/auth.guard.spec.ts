import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
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

  it('should allow access when logged in', () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, roles: ['Admin'] }));
    localStorage.setItem('token', 'test-token');
    // Re-create service to pick up localStorage
    const freshService = TestBed.inject(AuthService);
    // We need to set the signal
    freshService.currentUser.set({ id: 1, username: 'admin', displayName: 'Admin', isActive: true, employeeId: null, employeeName: null, roles: ['Admin'], createdAt: '', updatedAt: '' });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('should redirect to login when not logged in', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
