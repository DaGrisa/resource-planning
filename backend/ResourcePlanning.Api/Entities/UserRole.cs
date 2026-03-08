namespace ResourcePlanning.Api.Entities;

public class UserRole
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public Role Role { get; set; }

    public User User { get; set; } = null!;
}
