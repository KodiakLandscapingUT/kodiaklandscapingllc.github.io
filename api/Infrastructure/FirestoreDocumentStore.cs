using Google.Cloud.Firestore;

namespace api.Infrastructure;

public sealed class FirestoreDocumentStore(FirebaseProvider firebase) : IDocumentStore
{
    public async Task<StoredDocument?> GetAsync(string collection, string id, CancellationToken cancellationToken)
    {
        DocumentIds.Validate(id);
        var snapshot = await firebase.Db.Collection(collection).Document(id).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? new(snapshot.Id, snapshot.ToDictionary()) : null;
    }

    public async Task<IReadOnlyList<StoredDocument>> ListAsync(string collection, int? limit,
        string? orderBy, string? whereField, object? whereValue, CancellationToken cancellationToken)
    {
        Query query = firebase.Db.Collection(collection);
        if (whereField is not null) query = query.WhereEqualTo(whereField, whereValue);
        if (orderBy is not null) query = query.OrderByDescending(orderBy);
        if (limit.HasValue) query = query.Limit(limit.Value);
        var snapshot = await query.GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(doc => new StoredDocument(doc.Id, doc.ToDictionary())).ToList();
    }

    public async Task<string> AddAsync(string collection, Dictionary<string, object> data, CancellationToken cancellationToken)
    {
        var reference = await firebase.Db.Collection(collection).AddAsync(data, cancellationToken);
        return reference.Id;
    }

    public async Task SetAsync(string collection, string id, Dictionary<string, object> data, CancellationToken cancellationToken)
    {
        DocumentIds.Validate(id);
        await firebase.Db.Collection(collection).Document(id).SetAsync(data, SetOptions.MergeAll, cancellationToken);
    }

    public async Task DeleteAsync(string collection, string id, CancellationToken cancellationToken)
    {
        DocumentIds.Validate(id);
        await firebase.Db.Collection(collection).Document(id).DeleteAsync(cancellationToken: cancellationToken);
    }

    public Task<T> TransactAsync<T>(Func<IDocumentTransaction, Task<T>> action, CancellationToken cancellationToken) =>
        firebase.Db.RunTransactionAsync(transaction =>
            action(new FirestoreTransaction(firebase.Db, transaction)), cancellationToken: cancellationToken);

    private sealed class FirestoreTransaction(FirestoreDb db, Transaction transaction) : IDocumentTransaction
    {
        private DocumentReference Reference(string collection, string id)
        {
            DocumentIds.Validate(id);
            return db.Collection(collection).Document(id);
        }
        public async Task<StoredDocument?> GetAsync(string collection, string id, CancellationToken ct)
        {
            var snapshot = await transaction.GetSnapshotAsync(Reference(collection, id), ct);
            return snapshot.Exists ? new(snapshot.Id, snapshot.ToDictionary()) : null;
        }
        public void Set(string collection, string id, Dictionary<string, object> data) =>
            transaction.Set(Reference(collection, id), data, SetOptions.MergeAll);
        public void Delete(string collection, string id) => transaction.Delete(Reference(collection, id));
    }
}

public static class DocumentIds
{
    public static void Validate(string id)
    {
        if (string.IsNullOrWhiteSpace(id) || id.Contains('/') || id is "." or "..")
            throw new ApiException(400, "Invalid document ID");
    }
}
