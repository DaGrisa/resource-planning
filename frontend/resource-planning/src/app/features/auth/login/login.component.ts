import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="login-header">
            <img src="logo.svg" alt="Planly" class="login-logo" />
            <h1>Planly</h1>
            <p>Sign in to your account</p>
          </div>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <mat-form-field class="full-width">
              <mat-label>Username</mat-label>
              <input matInput [(ngModel)]="username" name="username" required autofocus />
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>

            <mat-form-field class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password" name="password" required />
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (error) {
              <div class="error-message">{{ error }}</div>
            }

            <button mat-flat-button type="submit" class="full-width login-button" [disabled]="loading || !loginForm.valid">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%);
    }
    .login-card {
      width: 400px;
      max-width: 90vw;
      padding: 32px;
    }
    .login-header {
      text-align: center;
      width: 100%;
      margin-bottom: 24px;
    }
    .login-logo {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    .login-header h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #1565c0;
    }
    .login-header p {
      margin: 4px 0 0;
      color: #666;
      font-size: 0.9rem;
    }
    .full-width { width: 100%; }
    .login-button {
      margin-top: 16px;
      height: 44px;
    }
    .error-message {
      color: #d32f2f;
      font-size: 0.85rem;
      margin-bottom: 8px;
      text-align: center;
    }
    mat-card-header { display: block; }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  hidePassword = true;
  loading = false;
  error = '';

  onSubmit() {
    this.loading = true;
    this.error = '';
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Invalid username or password';
      }
    });
  }
}
