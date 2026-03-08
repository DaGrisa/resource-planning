using System.ComponentModel.DataAnnotations;

namespace ResourcePlanning.Api.DTOs;

public record EmployeeDto(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    decimal WeeklyHours,
    bool IsActive,
    int? DepartmentId,
    string? DepartmentName,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record EmployeeCreateDto(
    [Required][StringLength(100)] string FirstName,
    [Required][StringLength(100)] string LastName,
    [Required][EmailAddress][StringLength(200)] string Email,
    [Range(0, 168)] decimal WeeklyHours = 42.5m,
    int? DepartmentId = null
);

public record EmployeeUpdateDto(
    [Required][StringLength(100)] string FirstName,
    [Required][StringLength(100)] string LastName,
    [Required][EmailAddress][StringLength(200)] string Email,
    [Range(0, 168)] decimal WeeklyHours = 42.5m,
    int? DepartmentId = null,
    bool IsActive = true
);
