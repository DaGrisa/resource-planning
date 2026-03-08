namespace ResourcePlanning.Api.Entities;

public class DepartmentManager
{
    public int Id { get; set; }
    public int DepartmentId { get; set; }
    public int EmployeeId { get; set; }

    public Department Department { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}
