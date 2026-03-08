using System.ComponentModel.DataAnnotations;

namespace ResourcePlanning.Api.DTOs;

public record DepartmentDto(
    int Id,
    string Name,
    int? LeadManagerId,
    string? LeadManagerName,
    int EmployeeCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record DepartmentDetailDto(
    int Id,
    string Name,
    int? LeadManagerId,
    string? LeadManagerName,
    int EmployeeCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<DepartmentManagerDto> Managers,
    List<DepartmentEmployeeDto> Employees
);

public record DepartmentManagerDto(int EmployeeId, string EmployeeName);

public record DepartmentEmployeeDto(int Id, string FirstName, string LastName, string Email);

public record DepartmentCreateDto(
    [Required][StringLength(200)] string Name,
    int? LeadManagerId = null
);

public record DepartmentUpdateDto(
    [Required][StringLength(200)] string Name,
    int? LeadManagerId = null
);
