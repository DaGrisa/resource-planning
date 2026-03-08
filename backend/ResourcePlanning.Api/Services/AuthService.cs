using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username == dto.Username && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        var token = GenerateJwtToken(user);
        return new LoginResponseDto(token, MapToDto(user));
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user == null ? null : MapToDto(user);
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("displayName", user.DisplayName)
        };

        if (user.EmployeeId.HasValue)
            claims.Add(new Claim("employeeId", user.EmployeeId.Value.ToString()));

        foreach (var role in user.Roles)
            claims.Add(new Claim(ClaimTypes.Role, role.Role.ToString()));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpirationMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    internal static UserDto MapToDto(User user) => new(
        user.Id,
        user.Username,
        user.DisplayName,
        user.IsActive,
        user.EmployeeId,
        user.Employee != null ? $"{user.Employee.FirstName} {user.Employee.LastName}" : null,
        user.Roles.Select(r => r.Role.ToString()).ToArray(),
        user.CreatedAt,
        user.UpdatedAt
    );
}
