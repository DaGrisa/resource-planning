using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<DepartmentManager> DepartmentManagers => Set<DepartmentManager>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<CapacityAllocation> CapacityAllocations => Set<CapacityAllocation>();
    public DbSet<ProjectWeeklyBudget> ProjectWeeklyBudgets => Set<ProjectWeeklyBudget>();
    public DbSet<Absence> Absences => Set<Absence>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Employee
        modelBuilder.Entity<Employee>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.WeeklyHours).HasPrecision(5, 2);
            e.HasOne(x => x.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Department
        modelBuilder.Entity<Department>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasOne(x => x.LeadManager)
                .WithMany()
                .HasForeignKey(x => x.LeadManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // DepartmentManager
        modelBuilder.Entity<DepartmentManager>(e =>
        {
            e.HasIndex(x => new { x.DepartmentId, x.EmployeeId }).IsUnique();
            e.HasOne(x => x.Department)
                .WithMany(d => d.Managers)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Employee)
                .WithMany(emp => emp.ManagedDepartments)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Project
        modelBuilder.Entity<Project>(e =>
        {
            e.Property(x => x.ProjectType).HasConversion<string>();
            e.HasOne(x => x.ProjectLead)
                .WithMany()
                .HasForeignKey(x => x.ProjectLeadId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ProjectAssignment
        modelBuilder.Entity<ProjectAssignment>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.EmployeeId }).IsUnique();
            e.HasOne(x => x.Project)
                .WithMany(p => p.Assignments)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Employee)
                .WithMany(emp => emp.ProjectAssignments)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CapacityAllocation
        modelBuilder.Entity<CapacityAllocation>(e =>
        {
            e.HasIndex(x => new { x.EmployeeId, x.ProjectId, x.CalendarWeek, x.Year }).IsUnique();
            e.Property(x => x.PlannedHours).HasPrecision(5, 2);
            e.HasOne(x => x.Employee)
                .WithMany(emp => emp.CapacityAllocations)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Project)
                .WithMany(p => p.CapacityAllocations)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Absence
        modelBuilder.Entity<Absence>(e =>
        {
            e.HasIndex(x => new { x.EmployeeId, x.CalendarWeek, x.Year }).IsUnique();
            e.Property(x => x.Hours).HasPrecision(5, 2);
            e.HasOne(x => x.Employee)
                .WithMany(emp => emp.Absences)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ProjectWeeklyBudget
        modelBuilder.Entity<ProjectWeeklyBudget>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.CalendarWeek, x.Year }).IsUnique();
            e.Property(x => x.BudgetedHours).HasPrecision(5, 2);
            e.HasOne(x => x.Project)
                .WithMany(p => p.WeeklyBudgets)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasOne(x => x.Employee)
                .WithOne(emp => emp.User)
                .HasForeignKey<User>(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // UserRole
        modelBuilder.Entity<UserRole>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.Role }).IsUnique();
            e.Property(x => x.Role).HasConversion<string>();
            e.HasOne(x => x.User)
                .WithMany(u => u.Roles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override int SaveChanges()
    {
        SetTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is Employee emp)
            {
                emp.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added) emp.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is Department dept)
            {
                dept.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added) dept.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is Project proj)
            {
                proj.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added) proj.CreatedAt = DateTime.UtcNow;
            }
            else if (entry.Entity is User user)
            {
                user.UpdatedAt = DateTime.UtcNow;
                if (entry.State == EntityState.Added) user.CreatedAt = DateTime.UtcNow;
            }
        }
    }
}
