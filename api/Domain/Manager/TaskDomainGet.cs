using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Manager;

public sealed class TaskDomainGet(IDocumentStore store)
{
    public async Task<IReadOnlyList<TaskReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.RequireManagement(actor);
        return TaskDomainSupport.MapList(await store.ListAsync("tasks", null, null, null, null, ct));
    }
}
