import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

const mockAdminUser = {
  id: 1, username: 'admin', displayName: 'Admin', isActive: true,
  employeeId: null, employeeName: null, roles: ['Admin'] as any,
  createdAt: '', updatedAt: ''
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have navigation groups', () => {
    TestBed.inject(AuthService).currentUser.set(mockAdminUser);
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.navGroups().length).toBeGreaterThan(0);
  });

  it('should render navigation links', () => {
    TestBed.inject(AuthService).currentUser.set(mockAdminUser);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('a[mat-list-item]');
    expect(navLinks.length).toBe(11);
  });
});
