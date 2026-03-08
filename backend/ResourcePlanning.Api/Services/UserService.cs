using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;

namespace ResourcePlanning.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<List<UserDto>> GetAllAsync()
    {
        return await _db.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .Include(u => u.Employee)
            .OrderBy(u => u.Username)
            .Select(u => AuthService.MapToDto(u))
            .ToListAsync();
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == id);

        return user == null ? null : AuthService.MapToDto(user);
    }

    public async Task<UserDto> CreateAsync(UserCreateDto dto)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        // Attach roles to the entity before the first save — EF Core resolves the FK chain
        var roles = dto.Roles?
            .Select(r => Enum.TryParse<Role>(r, out var role) ? new UserRole { Role = role } : null)
            .Where(r => r != null)
            .Cast<UserRole>()
            .ToList() ?? [];

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            DisplayName = dto.DisplayName,
            EmployeeId = dto.EmployeeId,
            Roles = roles
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(); // single round-trip for user + roles
        await tx.CommitAsync();

        if (user.EmployeeId.HasValue)
            await _db.Entry(user).Reference(u => u.Employee).LoadAsync();

        return AuthService.MapToDto(user);
    }

    public async Task<bool> UpdateAsync(int id, UserUpdateDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return false;

        await using var tx = await _db.Database.BeginTransactionAsync();
        user.DisplayName = dto.DisplayName;
        user.EmployeeId = dto.EmployeeId;
        user.IsActive = dto.IsActive;

        // Replace roles
        if (dto.Roles != null)
        {
            _db.UserRoles.RemoveRange(user.Roles);
            foreach (var roleName in dto.Roles)
            {
                if (Enum.TryParse<Role>(roleName, out var role))
                    _db.UserRoles.Add(new UserRole { UserId = user.Id, Role = role });
            }
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        user.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }
}
