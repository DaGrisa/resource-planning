using Microsoft.Extensions.Configuration;
using ResourcePlanning.Api.DTOs;
using ResourcePlanning.Api.Entities;
using ResourcePlanning.Api.Services;

namespace ResourcePlanning.Tests;

public class AuthServiceTests : ServiceTestBase
{
    private readonly IConfiguration _config;

    public AuthServiceTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "TestSecretKeyAtLeast32CharactersLong!!",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
                ["Jwt:ExpirationMinutes"] = "60"
            })
            .Build();
    }

    private async Task<User> SeedUser(Api.Data.AppDbContext db)
    {
        var user = new User
        {
            Username = "testuser",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            DisplayName = "Test User"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.UserRoles.Add(new UserRole { UserId = user.Id, Role = Role.Admin });
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnToken_WhenCredentialsValid()
    {
        using var db = Factory.CreateContext();
        await SeedUser(db);
        var service = new AuthService(db, _config);

        var result = await service.LoginAsync(new LoginRequestDto("testuser", "password123"));

        Assert.NotNull(result);
        Assert.NotEmpty(result!.Token);
        Assert.Equal("testuser", result.User.Username);
        Assert.Contains("Admin", result.User.Roles);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnNull_WhenPasswordWrong()
    {
        using var db = Factory.CreateContext();
        await SeedUser(db);
        var service = new AuthService(db, _config);

        var result = await service.LoginAsync(new LoginRequestDto("testuser", "wrongpassword"));

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnNull_WhenUserNotFound()
    {
        using var db = Factory.CreateContext();
        var service = new AuthService(db, _config);

        var result = await service.LoginAsync(new LoginRequestDto("nonexistent", "password"));

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnNull_WhenUserInactive()
    {
        using var db = Factory.CreateContext();
        var user = await SeedUser(db);
        user.IsActive = false;
        await db.SaveChangesAsync();
        var service = new AuthService(db, _config);

        var result = await service.LoginAsync(new LoginRequestDto("testuser", "password123"));

        Assert.Null(result);
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldSucceed_WhenCurrentPasswordCorrect()
    {
        using var db = Factory.CreateContext();
        var user = await SeedUser(db);
        var service = new AuthService(db, _config);

        var result = await service.ChangePasswordAsync(user.Id, new ChangePasswordDto("password123", "newpassword"));

        Assert.True(result);

        // Verify can login with new password
        var loginResult = await service.LoginAsync(new LoginRequestDto("testuser", "newpassword"));
        Assert.NotNull(loginResult);
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldFail_WhenCurrentPasswordWrong()
    {
        using var db = Factory.CreateContext();
        var user = await SeedUser(db);
        var service = new AuthService(db, _config);

        var result = await service.ChangePasswordAsync(user.Id, new ChangePasswordDto("wrongpassword", "newpassword"));

        Assert.False(result);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ShouldReturnUser()
    {
        using var db = Factory.CreateContext();
        var user = await SeedUser(db);
        var service = new AuthService(db, _config);

        var result = await service.GetCurrentUserAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal("testuser", result!.Username);
        Assert.Equal("Test User", result.DisplayName);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ShouldReturnNull_WhenNotFound()
    {
        using var db = Factory.CreateContext();
        var service = new AuthService(db, _config);

        var result = await service.GetCurrentUserAsync(999);

        Assert.Null(result);
    }
}


