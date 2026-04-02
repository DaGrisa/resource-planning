using System.ComponentModel.DataAnnotations;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.DTOs;

public record AbsenceDto(
    int Id,
    int EmployeeId,
    string EmployeeName,
    int CalendarWeek,
    int Year,
    AbsenceType Type,
    decimal Hours,
    string? Note
);

public record AbsenceUpsertDto(
    [Required] int EmployeeId,
    [Range(1, 53)] int CalendarWeek,
    [Range(2000, 2100)] int Year,
    [Range(0, 168)] decimal Hours,
    [StringLength(500)] string? Note,
    AbsenceType Type = AbsenceType.Regular
);

public record HolidayUpsertDto(
    [Required] DateOnly Date,
    DateOnly? OriginalDate,
    [StringLength(500)] string? Note
);

public record HolidayDto(
    DateOnly Date,
    int CalendarWeek,
    int Year,
    string? Note
);
