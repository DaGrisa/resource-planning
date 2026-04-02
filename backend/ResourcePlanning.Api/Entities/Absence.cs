namespace ResourcePlanning.Api.Entities;

public class Absence
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly? HolidayDate { get; set; }
    public int CalendarWeek { get; set; }
    public int Year { get; set; }
    public AbsenceType Type { get; set; } = AbsenceType.Regular;
    public decimal Hours { get; set; }
    public string? Note { get; set; }

    public Employee Employee { get; set; } = null!;
}
