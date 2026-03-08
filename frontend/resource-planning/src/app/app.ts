import { Component, ViewChild, inject, computed } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from './core/services/auth.service';
import { Role } from './core/models';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: Role[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, MatDividerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private breakpointObserver = inject(BreakpointObserver);
  authService = inject(AuthService);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  isTablet = false;

  private allNavGroups: NavGroup[] = [
    {
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { path: '/my-planning', label: 'My Planning', icon: 'person_search' },
      ]
    },
    {
      label: 'Overview',
      items: [
        { path: '/planning/overview', label: 'Employee Overview', icon: 'bar_chart' },
        { path: '/planning/project-overview', label: 'Project Overview', icon: 'analytics', roles: ['Admin', 'DepartmentManager', 'ProjectManager'] },
      ]
    },
    {
      label: 'Planning',
      items: [
        { path: '/planning', label: 'Employee Planning', icon: 'calendar_month', roles: ['Admin', 'DepartmentManager'] },
        { path: '/planning/projects', label: 'Project Planning', icon: 'assignment', roles: ['Admin', 'ProjectManager'] },
        { path: '/absences', label: 'Absences', icon: 'event_busy', roles: ['Admin', 'DepartmentManager'] },
      ]
    },
    {
      label: 'Master Data',
      items: [
        { path: '/employees', label: 'Employees', icon: 'people', roles: ['Admin', 'DepartmentManager'] },
        { path: '/departments', label: 'Departments', icon: 'business', roles: ['Admin', 'DepartmentManager'] },
        { path: '/projects', label: 'Projects', icon: 'folder', roles: ['Admin', 'DepartmentManager', 'ProjectManager'] },
        { path: '/users', label: 'Users', icon: 'manage_accounts', roles: ['Admin'] },
      ]
    },
  ];

  navGroups = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];

    return this.allNavGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          !item.roles || item.roles.some(role => user.roles.includes(role))
        )
      }))
      .filter(group => group.items.length > 0);
  });

  ngOnInit() {
    this.breakpointObserver.observe('(max-width: 1024px)').subscribe(result => {
      this.isTablet = result.matches;
      if (this.sidenav) {
        if (this.isTablet) {
          this.sidenav.close();
        } else {
          this.sidenav.open();
        }
      }
    });
  }

  onNavClick() {
    if (this.isTablet) {
      this.sidenav.close();
    }
  }

  logout() {
    this.authService.logout();
  }
}
