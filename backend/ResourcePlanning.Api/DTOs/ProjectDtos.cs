using System.ComponentModel.DataAnnotations;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.DTOs;

public record ProjectDto(
    int Id,
    string Name,
    string ProjectType,
    int? ProjectLeadId,
    string? ProjectLeadName,
    bool IsActive,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ProjectDetailDto(
    int Id,
    string Name,
    string ProjectType,
    int? ProjectLeadId,
    string? ProjectLeadName,
    bool IsActive,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<ProjectTeamMemberDto> TeamMembers
);

public record ProjectTeamMemberDto(int EmployeeId, string EmployeeName);

public record ProjectCreateDto(
    [Required][StringLength(200)] string Name,
    [Required] ProjectType ProjectType,
    int? ProjectLeadId = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null
);

public record ProjectUpdateDto(
    [Required][StringLength(200)] string Name,
    [Required] ProjectType ProjectType,
    int? ProjectLeadId = null,
    bool IsActive = true,
    DateTime? StartDate = null,
    DateTime? EndDate = null
);
