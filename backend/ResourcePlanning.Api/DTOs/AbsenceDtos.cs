using System.ComponentModel.DataAnnotations;

namespace ResourcePlanning.Api.DTOs;

public record AbsenceDto(
    int Id,
    int EmployeeId,
    string EmployeeName,
    int CalendarWeek,
    int Year,
    decimal Hours,
    string? Note
);

public record AbsenceUpsertDto(
    [Required] int EmployeeId,
    [Range(1, 53)] int CalendarWeek,
    [Range(2000, 2100)] int Year,
    [Range(0, 168)] decimal Hours,
    [StringLength(500)] string? Note
);
