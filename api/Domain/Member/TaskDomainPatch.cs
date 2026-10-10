using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Member;

public sealed class TaskDomainPatch(TaskDomainSupport tasks)
{
    public Task<TaskReadDto> UpdateAsync(string id, UpdateTaskWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "member");
        return tasks.TransactAsync(async transaction =>
        {
            var document = await TaskDomainSupport.GetAsync(transaction, id, ct);
            if (document.Data.Text("assigneeUid") != actor.Uid)
                throw new ApiException(403, "Not assigned to this task");
            // Manager-only fields are ignored, matching the existing API contract.
            var updates = TaskDomainSupport.StatusUpdates(input.Status, DocumentValues.Iso(DateTime.UtcNow));
            return TaskDomainSupport.SaveUpdate(transaction, document, updates, actor, ct);
        }, ct);
    }
}
