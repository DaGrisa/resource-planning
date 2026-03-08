namespace ResourcePlanning.Api.Entities;

public class ProjectWeeklyBudget
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int CalendarWeek { get; set; }
    public int Year { get; set; }
    public decimal BudgetedHours { get; set; }

    public Project Project { get; set; } = null!;
}
