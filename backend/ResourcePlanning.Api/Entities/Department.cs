namespace ResourcePlanning.Api.Entities;

public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? LeadManagerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee? LeadManager { get; set; }
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<DepartmentManager> Managers { get; set; } = new List<DepartmentManager>();
}
