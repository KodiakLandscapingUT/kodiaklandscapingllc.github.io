namespace api.Infrastructure;

public sealed record StoredDocument(string Id, Dictionary<string, object> Data);

public interface IDocumentStore
{
    Task<StoredDocument?> GetAsync(string collection, string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<StoredDocument>> ListAsync(string collection, int? limit,
        string? orderBy, string? whereField, object? whereValue, CancellationToken cancellationToken);
    Task<string> AddAsync(string collection, Dictionary<string, object> data, CancellationToken cancellationToken);
    Task SetAsync(string collection, string id, Dictionary<string, object> data, CancellationToken cancellationToken);
    Task DeleteAsync(string collection, string id, CancellationToken cancellationToken);
    Task<T> TransactAsync<T>(Func<IDocumentTransaction, Task<T>> action, CancellationToken cancellationToken);
}

public interface IDocumentTransaction
{
    Task<StoredDocument?> GetAsync(string collection, string id, CancellationToken cancellationToken);
    void Set(string collection, string id, Dictionary<string, object> data);
    void Delete(string collection, string id);
}
