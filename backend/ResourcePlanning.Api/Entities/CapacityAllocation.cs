namespace ResourcePlanning.Api.Entities;

public class CapacityAllocation
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int ProjectId { get; set; }
    public int CalendarWeek { get; set; }
    public int Year { get; set; }
    public decimal PlannedHours { get; set; }

    public Employee Employee { get; set; } = null!;
    public Project Project { get; set; } = null!;
}
