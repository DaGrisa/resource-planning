# Resource Planning Application

## Documentation Maintenance
**After any code change that affects architecture, features, endpoints, or patterns, update this file (CLAUDE.md) and `frontend/resource-planning/README.md` to reflect the current state.** Only update sections that are actually affected — do not rewrite unchanged sections.

## Project Overview
Employee capacity planning web app with .NET backend and Angular frontend.

## Tech Stack
- **Backend**: .NET 10 Web API, Entity Framework Core, SQLite
- **Frontend**: Angular 21, Angular Material, standalone components, SCSS

## Project Structure
```
backend/ResourcePlanning.Api/     # .NET Web API
  Controllers/                    # EmployeesController, DepartmentsController, ProjectsController, PlanningController, AbsencesController, AuthController, UsersController
  Data/                           # AppDbContext, Migrations/, SeedData
  DTOs/                           # EmployeeDtos, DepartmentDtos, ProjectDtos, PlanningDtos, AbsenceDtos, AuthDtos
  Entities/                       # Employee, Department, DepartmentManager, Project, ProjectType, ProjectAssignment, CapacityAllocation, ProjectWeeklyBudget, Absence, User, UserRole, Role
  Middleware/                     # ErrorHandlingMiddleware, ForbiddenException
  Services/                      # I*Service interfaces + implementations, IAuthService, ICurrentUserService, IAuthorizationHelper, IUserService

backend/ResourcePlanning.Tests/   # xUnit tests with in-memory SQLite

frontend/resource-planning/      # Angular workspace
  src/app/
    core/services/               # EmployeeService, DepartmentService, ProjectService, PlanningService, AbsenceService, AuthService
    core/models/                 # TypeScript interfaces (index.ts barrel export), auth.model (Role, User, LoginRequest, LoginResponse)
    core/interceptors/           # errorInterceptor (functional), authInterceptor (attaches Bearer token)
    core/guards/                 # authGuard (login redirect), roleGuard (role-based redirect)
    core/utils/                  # week.utils (getISOWeek, getWeekStart, formatShortDate)
    shared/components/           # ConfirmDialogComponent
    features/auth/login/         # LoginComponent
    features/employees/          # employee-list/, employee-form/
    features/departments/        # department-list/, department-form/
    features/projects/           # project-list/, project-form/, project-team/
    features/planning/           # capacity-grid/ (+ cell-editor, bulk-allocation), project-planning/, planning-overview/, project-overview/
    features/absences/           # absence-list/, absence-form/
    features/dashboard/          # dashboard component
    features/my-planning/        # my-planning component (per-employee schedule, visible to all roles)
    features/users/              # user-list/, user-form/
```

## Running the App
```bash
# Backend (port 5113, Swagger at /swagger)
cd backend/ResourcePlanning.Api && dotnet run

# Frontend (port 4200)
cd frontend/resource-planning && ng serve
```

## Key Commands
```bash
# Backend build
cd backend/ResourcePlanning.Api && dotnet build

# Frontend build
cd frontend/resource-planning && npx ng build

# Add EF migration
cd backend/ResourcePlanning.Api && dotnet ef migrations add <Name> --output-dir Data/Migrations

# Install frontend dependencies
cd frontend/resource-planning && npm install
```

## Authentication & Authorization

### Roles
Four roles defined as an enum (`Role.cs` / `auth.model.ts`):
| Role | Access |
|---|---|
| `Admin` | Full system access; manage users and all data |
| `DepartmentManager` | Manage assigned departments, employees, and all projects |
| `ProjectManager` | Manage projects they lead (as ProjectLead) |
| `Employee` | View own data only |

### JWT Flow
- **Login**: `POST /api/auth/login` → validates credentials with BCrypt, returns `{ token, user }`
- **Token claims**: `UserId`, `Username`, `displayName`, `employeeId`, `Role` (one per role)
- **Storage**: token + user object stored in `localStorage`
- **Requests**: `authInterceptor` attaches `Authorization: Bearer {token}` to every HTTP request
- **Config**: JWT key/issuer/audience in `appsettings.json`; expiration via `Jwt:ExpirationMinutes`

### Backend Enforcement
- `UsersController` uses `[Authorize(Roles = "Admin")]` attribute
- Other controllers inject `IAuthorizationHelper` for fine-grained checks:
  - `GetManagedDepartmentIdsAsync()` — Admin sees all; DeptManager sees led/supported depts
  - `GetManagedProjectIdsAsync()` — Admin sees all; ProjectManager sees their projects
  - `CanAccessEmployeeAsync()` — role-aware employee visibility
  - `CanManageDepartmentAsync()` / `CanManageProjectAsync()` — write-access checks
- Unauthorized access throws `ForbiddenException`, caught by `ErrorHandlingMiddleware` → HTTP 403
- `ICurrentUserService` extracts claims from JWT (`UserId`, `EmployeeId`, `Roles`, `IsAdmin`)

### Frontend Enforcement
- `authGuard` — redirects to `/login` if not logged in
- `roleGuard(...roles)` — redirects to `/dashboard` if user lacks required roles
- Routes in `app.routes.ts` combine both guards, e.g. `canActivate: [authGuard, roleGuard('Admin', 'DepartmentManager')]`
- `AuthService` helpers: `hasRole(role)`, `hasAnyRole(...roles)`, `isAdmin`, `isLoggedIn()`
- Sidenav items filtered by `navGroups` computed signal — only shows items the user can access

### Default Seed Credentials
- Username: `admin` / Password: `admin123` (seeded in Development mode)

## Architecture Patterns
- **Backend services**: Interface + implementation, registered as Scoped in Program.cs
- **Frontend components**: Standalone with lazy-loaded routes in app.routes.ts
- **Soft-delete**: Employees and Projects use IsActive flag (not removed from DB)
- **Hard-delete**: Departments only deletable when no active employees remain
- **Capacity allocations**: Upsert pattern — setting PlannedHours to 0 deletes the record
- **Absences**: Upsert pattern — similar to allocations, per employee/week
- **Percentages**: Computed on-the-fly as `PlannedHours / Employee.WeeklyHours * 100`
- **Error handling**: Backend middleware catches unhandled exceptions; frontend httpInterceptor shows snackbar
- **JSON enums**: ProjectType serialized as strings via JsonStringEnumConverter

## Database
- Provider selected via `Database:Provider` in appsettings (`Sqlite` | `SqlServer`)
- Development default: SQLite at `backend/ResourcePlanning.Api/resourceplanning.db`
- Production default: SQL Server (connection string via `ConnectionStrings:SqlServer`)
- SQLite migrations: `Data/Migrations/` — generated without env var
- SQL Server migrations: `Data/MigrationsSqlServer/` — generated with `$env:DB_PROVIDER="SqlServer"`
- `DesignTimeDbContextFactory` reads `DB_PROVIDER` env var to pick provider during migration generation
- Auto-migrates and seeds on startup in Development mode
- Seed data: 6 employees, 3 departments, 4 projects, 1 admin user; allocations/budgets/absences for 10 weeks starting from first-startup date (dynamic, handles year rollover)

## API Endpoints
- `POST /api/auth/login` — [AllowAnonymous] returns `{ token, user }`
- `POST /api/auth/change-password` — [Authorize] change own password
- `GET /api/auth/me` — [Authorize] current user profile
- `GET/POST /api/users` — [Admin] list all users / create user with roles
- `GET/PUT/DELETE /api/users/{id}` — [Admin] get / update / soft-delete user
- `GET/POST /api/employees` — list (filter: activeOnly, departmentId) / create
- `GET/PUT/DELETE /api/employees/{id}` — get / update / soft-delete
- `GET/POST /api/departments` — list with employee count / create
- `GET/PUT/DELETE /api/departments/{id}` — get with managers+employees / update / hard-delete
- `PUT /api/departments/{id}/managers` — set supporting manager list
- `GET/POST /api/projects` — list (filter: activeOnly, type) / create
- `GET/PUT/DELETE /api/projects/{id}` — get with team / update / soft-delete
- `PUT /api/projects/{id}/team` — set team member list
- `GET /api/planning/allocations` — filter by year, weekFrom, weekTo, employeeId, projectId, departmentId
- `PUT /api/planning/allocations` — batch upsert (array of allocations)
- `GET /api/planning/overview` — per-employee/week aggregation with status (filter: departmentId)
- `GET /api/planning/project-overview` — per-project/week aggregation with status
- `GET /api/planning/employee/{id}` — single employee allocations
- `GET /api/absences` — filter by year, weekFrom, weekTo, employeeId, departmentId
- `PUT /api/absences` — batch upsert (array of absences)
- `DELETE /api/absences/{id}` — delete single absence

## Testing
```bash
# Run backend tests
cd backend/ResourcePlanning.Tests && dotnet test

# Run frontend tests
cd frontend/resource-planning && npm test
```

### Testing Guidelines
- **Run tests periodically** during development to catch regressions early
- **Create tests for every change** where it makes sense — especially for services, business logic, and data flows
- **Backend tests** use xUnit + in-memory SQLite via `TestDbContextFactory`
- **Frontend tests** use vitest via `@angular/build:unit-test` builder (run with `ng test`)
- **Frontend component tests**: Use `autoDetectChanges(true)` instead of manual `detectChanges()` when flushing HTTP mocks to avoid `ExpressionChangedAfterItHasBeenCheckedError`
- **Frontend component tests**: `fakeAsync`/`tick` is NOT available (no zone.js/testing) — use async/await with `fixture.whenStable()` if needed
- Test files: `*.spec.ts` (frontend), `*Tests.cs` (backend)

## Environment Config
- Backend port: 5113 (configured in Properties/launchSettings.json)
- Frontend API URL: `src/environments/environment.ts` → `http://localhost:5113/api`
- CORS: allows `http://localhost:4200`
- Angular bundle budget: 1MB warning / 1MB error (angular.json)
