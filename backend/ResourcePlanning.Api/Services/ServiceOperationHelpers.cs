using Microsoft.EntityFrameworkCore;
using ResourcePlanning.Api.Data;

namespace ResourcePlanning.Api.Services;

public static class ServiceOperationHelpers
{
    public static async Task BatchUpsertAsync<TDto, TEntity, TKey>(
        AppDbContext db,
        DbSet<TEntity> entitySet,
        List<TDto> dtos,
        Func<List<TDto>, Task<Dictionary<TKey, TEntity>>> loadExistingMapAsync,
        Func<TDto, TKey> keySelector,
        Func<TDto, bool> shouldDelete,
        Action<TEntity, TDto> updateExisting,
        Func<TDto, TEntity> createEntity)
        where TEntity : class
        where TKey : notnull
    {
        if (dtos.Count == 0) return;

        var existingMap = await loadExistingMapAsync(dtos);

        await using var tx = await db.Database.BeginTransactionAsync();

        foreach (var dto in dtos)
        {
            existingMap.TryGetValue(keySelector(dto), out var existing);

            if (shouldDelete(dto))
            {
                if (existing != null)
                {
                    entitySet.Remove(existing);
                }

                continue;
            }

            if (existing != null)
            {
                updateExisting(existing, dto);
                continue;
            }

            entitySet.Add(createEntity(dto));
        }

        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    public static async Task<bool> ReplaceRelationsAsync<TEntity, TRelation>(
        AppDbContext db,
        IQueryable<TEntity> entityQuery,
        Func<TEntity, IEnumerable<TRelation>> existingRelationsSelector,
        DbSet<TRelation> relationSet,
        IEnumerable<TRelation> newRelations)
        where TEntity : class
        where TRelation : class
    {
        var entity = await entityQuery.FirstOrDefaultAsync();
        if (entity == null) return false;

        await using var tx = await db.Database.BeginTransactionAsync();

        relationSet.RemoveRange(existingRelationsSelector(entity));
        relationSet.AddRange(newRelations);

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return true;
    }
}
