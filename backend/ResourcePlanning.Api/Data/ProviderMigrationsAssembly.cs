using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Internal;

namespace ResourcePlanning.Api.Data;

/// <summary>
/// Filters discovered migrations to only those in the SQLite migrations namespace,
/// preventing the SQL Server migrations from being applied when using SQLite.
/// </summary>
#pragma warning disable EF1001 // MigrationsAssembly is internal API
public class SqliteMigrationsAssembly(
    ICurrentDbContext currentContext,
    IDbContextOptions options,
    IMigrationsIdGenerator idGenerator,
    IDiagnosticsLogger<DbLoggerCategory.Migrations> logger)
    : MigrationsAssembly(currentContext, options, idGenerator, logger)
{
    private IReadOnlyDictionary<string, TypeInfo>? _filtered;

    public override IReadOnlyDictionary<string, TypeInfo> Migrations =>
        _filtered ??= base.Migrations
            .Where(m => m.Value.Namespace == "ResourcePlanning.Api.Data.Migrations")
            .ToDictionary(m => m.Key, m => m.Value);
}

/// <summary>
/// Filters discovered migrations to only those in the SQL Server migrations namespace,
/// preventing the SQLite migrations from being applied when using SQL Server.
/// </summary>
public class SqlServerMigrationsAssembly(
    ICurrentDbContext currentContext,
    IDbContextOptions options,
    IMigrationsIdGenerator idGenerator,
    IDiagnosticsLogger<DbLoggerCategory.Migrations> logger)
    : MigrationsAssembly(currentContext, options, idGenerator, logger)
{
    private IReadOnlyDictionary<string, TypeInfo>? _filtered;

    public override IReadOnlyDictionary<string, TypeInfo> Migrations =>
        _filtered ??= base.Migrations
            .Where(m => m.Value.Namespace == "ResourcePlanning.Api.Data.MigrationsSqlServer")
            .ToDictionary(m => m.Key, m => m.Value);
}
#pragma warning restore EF1001
