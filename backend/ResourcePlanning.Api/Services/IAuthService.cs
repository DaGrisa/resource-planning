using ResourcePlanning.Api.DTOs;

namespace ResourcePlanning.Api.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto dto);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto);
    Task<UserDto?> GetCurrentUserAsync(int userId);
}
