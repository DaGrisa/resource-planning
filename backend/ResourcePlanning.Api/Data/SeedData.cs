using ResourcePlanning.Api.Entities;
using System.Globalization;

namespace ResourcePlanning.Api.Data;

public static class SeedData
{
    public static void Initialize(AppDbContext context, bool seedSampleData = false)
    {
        // Always seed admin user if no users exist
        if (!context.Users.Any())
        {
            var admin = new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                DisplayName = "Administrator"
            };
            context.Users.Add(admin);
            context.SaveChanges();

            context.UserRoles.Add(new UserRole { UserId = admin.Id, Role = Role.Admin });
            context.SaveChanges();
        }

        if (!seedSampleData || context.Employees.Any()) return;

        // --- Departments ---
        var engineering = new Department { Name = "Engineering" };
        var marketing = new Department { Name = "Marketing" };
        var administration = new Department { Name = "Administration" };

        context.Departments.AddRange(engineering, marketing, administration);
        context.SaveChanges();

        // --- Employees ---
        var employees = new List<Employee>
        {
            new() { FirstName = "Anna",  LastName = "Schmidt", Email = "anna.schmidt@company.com",  DepartmentId = engineering.Id,   WeeklyHours = 42.5m },
            new() { FirstName = "Max",   LastName = "Müller",  Email = "max.mueller@company.com",   DepartmentId = engineering.Id,   WeeklyHours = 42.5m },
            new() { FirstName = "Lisa",  LastName = "Weber",   Email = "lisa.weber@company.com",    DepartmentId = engineering.Id,   WeeklyHours = 40m   },
            new() { FirstName = "Tom",   LastName = "Fischer", Email = "tom.fischer@company.com",   DepartmentId = marketing.Id,     WeeklyHours = 42.5m },
            new() { FirstName = "Sarah", LastName = "Koch",    Email = "sarah.koch@company.com",    DepartmentId = marketing.Id,     WeeklyHours = 30m   },
            new() { FirstName = "Jan",   LastName = "Bauer",   Email = "jan.bauer@company.com",     DepartmentId = administration.Id, WeeklyHours = 42.5m },
        };

        context.Employees.AddRange(employees);
        context.SaveChanges();

        engineering.LeadManagerId   = employees[0].Id;
        marketing.LeadManagerId     = employees[3].Id;
        administration.LeadManagerId = employees[5].Id;
        context.SaveChanges();

        context.DepartmentManagers.AddRange(
            new DepartmentManager { DepartmentId = engineering.Id, EmployeeId = employees[0].Id },
            new DepartmentManager { DepartmentId = engineering.Id, EmployeeId = employees[1].Id },
            new DepartmentManager { DepartmentId = marketing.Id,   EmployeeId = employees[3].Id }
        );
        context.SaveChanges();

        // --- Projects ---
        var projects = new List<Project>
        {
            new() { Name = "Customer Portal",        ProjectType = ProjectType.Customer, ProjectLeadId = employees[0].Id, StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 12, 31) },
            new() { Name = "Internal Tools",          ProjectType = ProjectType.Internal, ProjectLeadId = employees[1].Id, StartDate = new DateTime(2026, 1, 1) },
            new() { Name = "Marketing Campaign Q1",  ProjectType = ProjectType.Internal, ProjectLeadId = employees[3].Id, StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 12, 31) },
            new() { Name = "Office Renovation",      ProjectType = ProjectType.Internal, ProjectLeadId = employees[5].Id, StartDate = new DateTime(2026, 2, 1), EndDate = new DateTime(2026, 12, 31) },
        };

        context.Projects.AddRange(projects);
        context.SaveChanges();

        context.ProjectAssignments.AddRange(
            new ProjectAssignment { ProjectId = projects[0].Id, EmployeeId = employees[0].Id },
            new ProjectAssignment { ProjectId = projects[0].Id, EmployeeId = employees[1].Id },
            new ProjectAssignment { ProjectId = projects[0].Id, EmployeeId = employees[2].Id },
            new ProjectAssignment { ProjectId = projects[1].Id, EmployeeId = employees[1].Id },
            new ProjectAssignment { ProjectId = projects[1].Id, EmployeeId = employees[2].Id },
            new ProjectAssignment { ProjectId = projects[2].Id, EmployeeId = employees[3].Id },
            new ProjectAssignment { ProjectId = projects[2].Id, EmployeeId = employees[4].Id },
            new ProjectAssignment { ProjectId = projects[3].Id, EmployeeId = employees[5].Id }
        );
        context.SaveChanges();

        // --- 10 weeks starting from today (handles year rollover) ---
        var weeks = Enumerable.Range(0, 10)
            .Select(i => DateTime.Today.AddDays(i * 7))
            .Select(d => (year: d.Year, week: ISOWeek.GetWeekOfYear(d)))
            .ToList();

        // --- Capacity allocations ---
        //
        // Anna  (42.5h) on Customer Portal only
        //   w0-2: 36h  → 84.7%  optimal
        //   w3-4: 45h  → 105.9% over
        //   w5-7: 36h  → 84.7%  optimal
        //   w8-9: 25h  → 58.8%  under
        //
        // Max   (42.5h) on Customer Portal + Internal Tools
        //   w0-1: CP 20h + IT 24h = 44h  → 103.5% over
        //   w2-4: CP 20h + IT 22h = 42h  → 98.8%  optimal
        //   w5-6: CP 22h + IT 22h = 44h  → 103.5% over
        //   w7:   CP 18h + IT 20h = 38h  → 89.4%  optimal
        //   w8-9: CP 15h + IT 18h = 33h  → 77.6%  under
        //
        // Lisa  (40h) on Internal Tools only
        //   w0-1: 28h → 70%   under
        //   w2-3: 36h → 90%   optimal  (w2 gets +20h absence → 56h = 140% over)
        //   w4-6: 28h → 70%   under
        //   w7-9: 15h → 37.5% under
        //
        // Tom   (42.5h) on Marketing Campaign only
        //   w0-2: 38h → 89.4%  optimal
        //   w3-4: 44h → 103.5% over
        //   w5-7: 38h → 89.4%  optimal  (w5 gets +16h absence → 54h = 127% over)
        //   w8-9: 28h → 65.9%  under
        //
        // Sarah (30h) on Marketing Campaign only
        //   w0-1: 32h → 106.7% over
        //   w2-3: 20h → 66.7%  under   (w3 gets +8h absence → 28h = 93.3% optimal)
        //   w4-5: 32h → 106.7% over
        //   w6-9: 20h → 66.7%  under
        //
        // Jan   (42.5h) on Office Renovation only
        //   w0-2: 20h → 47.1% under
        //   w3-5: 25h → 58.8% under
        //   w6-9: 15h → 35.3% under

        decimal[] annaHours  = [36, 36, 36, 45, 45, 36, 36, 36, 25, 25];
        decimal[] maxCpHours = [20, 20, 20, 20, 20, 22, 22, 18, 15, 15];
        decimal[] maxItHours = [24, 24, 22, 22, 22, 22, 22, 20, 18, 18];
        decimal[] lisaHours  = [28, 28, 36, 36, 28, 28, 28, 15, 15, 15];
        decimal[] tomHours   = [38, 38, 38, 44, 44, 38, 38, 38, 28, 28];
        decimal[] sarahHours = [32, 32, 20, 20, 32, 32, 20, 20, 20, 20];
        decimal[] janHours   = [20, 20, 20, 25, 25, 25, 15, 15, 15, 15];

        var allocations = new List<CapacityAllocation>();
        for (int i = 0; i < 10; i++)
        {
            var (year, week) = weeks[i];
            allocations.AddRange([
                new() { EmployeeId = employees[0].Id, ProjectId = projects[0].Id, CalendarWeek = week, Year = year, PlannedHours = annaHours[i]  },
                new() { EmployeeId = employees[1].Id, ProjectId = projects[0].Id, CalendarWeek = week, Year = year, PlannedHours = maxCpHours[i] },
                new() { EmployeeId = employees[1].Id, ProjectId = projects[1].Id, CalendarWeek = week, Year = year, PlannedHours = maxItHours[i] },
                new() { EmployeeId = employees[2].Id, ProjectId = projects[1].Id, CalendarWeek = week, Year = year, PlannedHours = lisaHours[i]  },
                new() { EmployeeId = employees[3].Id, ProjectId = projects[2].Id, CalendarWeek = week, Year = year, PlannedHours = tomHours[i]   },
                new() { EmployeeId = employees[4].Id, ProjectId = projects[2].Id, CalendarWeek = week, Year = year, PlannedHours = sarahHours[i] },
                new() { EmployeeId = employees[5].Id, ProjectId = projects[3].Id, CalendarWeek = week, Year = year, PlannedHours = janHours[i]   },
            ]);
        }
        context.CapacityAllocations.AddRange(allocations);
        context.SaveChanges();

        // --- Project weekly budgets ---
        //
        // Customer Portal  (budget 60h):
        //   w0-2: Anna 36 + Max 20 = 56h → 93.3%  optimal
        //   w3-4: Anna 45 + Max 20 = 65h → 108.3% over
        //   w5-6: Anna 36 + Max 22 = 58h → 96.7%  optimal
        //   w7:   Anna 36 + Max 18 = 54h → 90%    optimal
        //   w8-9: Anna 25 + Max 15 = 40h → 66.7%  under
        //
        // Internal Tools   (budget 52h):
        //   w0-1: Max 24 + Lisa 28 = 52h → 100%   optimal
        //   w2-3: Max 22 + Lisa 36 = 58h → 111.5% over
        //   w4-6: Max 22 + Lisa 28 = 50h → 96.2%  optimal
        //   w7:   Max 20 + Lisa 15 = 35h → 67.3%  under
        //   w8-9: Max 18 + Lisa 15 = 33h → 63.5%  under
        //
        // Marketing Campaign (budget 75h):
        //   w0-1: Tom 38 + Sarah 32 = 70h → 93.3%  optimal
        //   w2:   Tom 38 + Sarah 20 = 58h → 77.3%  under
        //   w3:   Tom 44 + Sarah 20 = 64h → 85.3%  optimal
        //   w4:   Tom 44 + Sarah 32 = 76h → 101.3% over
        //   w5:   Tom 38 + Sarah 32 = 70h → 93.3%  optimal
        //   w6-9: Tom 38/28 + Sarah 20 = 58/48h → 77/64%  under
        //
        // Office Renovation (budget 22h):
        //   w0-2: Jan 20h → 90.9%  optimal
        //   w3-5: Jan 25h → 113.6% over
        //   w6-9: Jan 15h → 68.2%  under

        var budgets = new List<ProjectWeeklyBudget>();
        for (int i = 0; i < 10; i++)
        {
            var (year, week) = weeks[i];
            budgets.AddRange([
                new() { ProjectId = projects[0].Id, CalendarWeek = week, Year = year, BudgetedHours = 60m },
                new() { ProjectId = projects[1].Id, CalendarWeek = week, Year = year, BudgetedHours = 52m },
                new() { ProjectId = projects[2].Id, CalendarWeek = week, Year = year, BudgetedHours = 75m },
                new() { ProjectId = projects[3].Id, CalendarWeek = week, Year = year, BudgetedHours = 22m },
            ]);
        }
        context.ProjectWeeklyBudgets.AddRange(budgets);
        context.SaveChanges();

        // --- Absences (all within the default 6-week view: weeks[0]–[5]) ---
        //
        // Lisa  w+2: 20h vacation → allocation 36h + absence 20h = 56h / 40h  = 140%  over  (was optimal)
        // Sarah w+3:  8h sick     → allocation 20h + absence  8h = 28h / 30h  =  93.3% optimal (was under)
        // Tom   w+5: 16h vacation → allocation 38h + absence 16h = 54h / 42.5h = 127%  over  (was optimal)

        context.Absences.AddRange(
            new Absence { EmployeeId = employees[2].Id, CalendarWeek = weeks[2].week, Year = weeks[2].year, Hours = 20, Note = "Vacation" },
            new Absence { EmployeeId = employees[4].Id, CalendarWeek = weeks[3].week, Year = weeks[3].year, Hours = 8,  Note = "Sick leave" },
            new Absence { EmployeeId = employees[3].Id, CalendarWeek = weeks[5].week, Year = weeks[5].year, Hours = 16, Note = "Vacation" }
        );
        context.SaveChanges();
    }
}
