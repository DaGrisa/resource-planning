using System.ComponentModel.DataAnnotations;

namespace ResourcePlanning.Api.DTOs;

public record LoginRequestDto(
    [Required] string Username,
    [Required] string Password
);

public record LoginResponseDto(
    string Token,
    UserDto User
);

public record UserDto(
    int Id,
    string Username,
    string DisplayName,
    bool IsActive,
    int? EmployeeId,
    string? EmployeeName,
    string[] Roles,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UserCreateDto(
    [Required][MinLength(3)] string Username,
    [Required][MinLength(8)] string Password,
    [Required] string DisplayName,
    int? EmployeeId,
    string[]? Roles
);

public record UserUpdateDto(
    [Required] string DisplayName,
    int? EmployeeId,
    bool IsActive,
    string[]? Roles
);

public record ChangePasswordDto(
    [Required] string CurrentPassword,
    [Required][MinLength(8)] string NewPassword
);
