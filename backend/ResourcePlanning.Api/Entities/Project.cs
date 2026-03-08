namespace ResourcePlanning.Api.Entities;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ProjectType ProjectType { get; set; }
    public int? ProjectLeadId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee? ProjectLead { get; set; }
    public ICollection<ProjectAssignment> Assignments { get; set; } = new List<ProjectAssignment>();
    public ICollection<CapacityAllocation> CapacityAllocations { get; set; } = new List<CapacityAllocation>();
    public ICollection<ProjectWeeklyBudget> WeeklyBudgets { get; set; } = new List<ProjectWeeklyBudget>();
}
