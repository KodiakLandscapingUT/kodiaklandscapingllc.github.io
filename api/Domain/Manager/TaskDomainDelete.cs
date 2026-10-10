using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Manager;

public sealed class TaskDomainDelete(IDocumentStore store)
{
    public Task DeleteAsync(string id, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.RequireManagement(actor);
        return store.TransactAsync(async transaction =>
        {
            // Reading before deletion conflicts with concurrent edits, avoiding
            // a stale update recreating a task after it has been deleted.
            await transaction.GetAsync("tasks", id, ct);
            transaction.Delete("tasks", id);
            return true;
        }, ct);
    }
}
