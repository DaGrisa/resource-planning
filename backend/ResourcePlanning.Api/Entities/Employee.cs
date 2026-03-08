namespace ResourcePlanning.Api.Entities;

public class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public decimal WeeklyHours { get; set; } = 42.5m;
    public bool IsActive { get; set; } = true;
    public int? DepartmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Department? Department { get; set; }
    public ICollection<DepartmentManager> ManagedDepartments { get; set; } = new List<DepartmentManager>();
    public ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    public ICollection<CapacityAllocation> CapacityAllocations { get; set; } = new List<CapacityAllocation>();
    public ICollection<Absence> Absences { get; set; } = new List<Absence>();
    public User? User { get; set; }
}
