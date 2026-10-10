using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Member;

public sealed class TaskDomainGet(IDocumentStore store)
{
    public async Task<IReadOnlyList<TaskReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "member");
        return TaskDomainSupport.MapList(await store.ListAsync("tasks", null, null, "assigneeUid", actor.Uid, ct));
    }
}
