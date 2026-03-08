using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ResourcePlanning.Api.Data;

/// <summary>
/// Used by EF Core CLI tools (dotnet ef migrations add) to create the DbContext.
/// Supports both providers via the DB_PROVIDER environment variable (Sqlite | SqlServer).
///
/// Generate SQLite migrations (default):
///   dotnet ef migrations add &lt;Name&gt; --output-dir Data/Migrations
///
/// Generate SQL Server migrations:
///   $env:DB_PROVIDER="SqlServer"
///   dotnet ef migrations add &lt;Name&gt; --output-dir Data/MigrationsSqlServer
///   $env:DB_PROVIDER=""
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var provider = Environment.GetEnvironmentVariable("DB_PROVIDER") ?? "Sqlite";
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        if (provider == "SqlServer")
        {
            optionsBuilder.UseSqlServer(
                "Server=.;Database=ResourcePlanning;Trusted_Connection=True;TrustServerCertificate=True;",
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory")
                          .MigrationsAssembly(typeof(DesignTimeDbContextFactory).Assembly.GetName().Name));
        }
        else
        {
            optionsBuilder.UseSqlite("Data Source=resourceplanning.db");
        }

        return new AppDbContext(optionsBuilder.Options);
    }
}
