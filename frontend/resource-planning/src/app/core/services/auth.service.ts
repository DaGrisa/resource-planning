import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { LoginRequest, LoginResponse, User, Role, ChangePasswordDto } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private url = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(this.loadUserFromStorage());
  isLoggedIn = computed(() => !!this.currentUser());

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.url}/login`, request).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUser.set(response.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  changePassword(dto: ChangePasswordDto) {
    return this.http.post<void>(`${this.url}/change-password`, dto);
  }

  refreshCurrentUser() {
    return this.http.get<User>(`${this.url}/me`).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  hasRole(role: Role): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  hasAnyRole(...roles: Role[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  get isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  private loadUserFromStorage(): User | null {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}
