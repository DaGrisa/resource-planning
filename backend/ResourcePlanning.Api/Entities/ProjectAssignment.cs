namespace ResourcePlanning.Api.Entities;

public class ProjectAssignment
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int EmployeeId { get; set; }

    public Project Project { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
