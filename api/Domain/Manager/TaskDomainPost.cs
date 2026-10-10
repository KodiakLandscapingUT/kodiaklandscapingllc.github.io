using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Manager;

public sealed class TaskDomainPost(IDocumentStore store)
{
    public Task<TaskReadDto> CreateAsync(CreateTaskWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.RequireManagement(actor);
        var id = Guid.NewGuid().ToString("N");
        return store.TransactAsync(async transaction =>
        {
            var assignee = await TaskDomainSupport.ActiveAssigneeAsync(transaction, input.AssigneeUid, ct);
            var now = DocumentValues.Iso(DateTime.UtcNow);
            var data = new Dictionary<string, object>
            {
                ["title"] = input.Title.Trim(), ["description"] = input.Description?.Trim() ?? "",
                ["assigneeUid"] = assignee.Id, ["assigneeName"] = TaskDomainSupport.AssigneeName(assignee),
                ["dueDate"] = string.IsNullOrEmpty(input.DueDate) ? null! : input.DueDate,
                ["status"] = "todo", ["createdAt"] = now, ["updatedAt"] = now,
                ["createdByUid"] = actor.Uid, ["createdByName"] = actor.DisplayName
            };
            transaction.Set("tasks", id, data);
            transaction.Set($"tasks/{id}/activity", Guid.NewGuid().ToString("N"), new()
            {
                ["type"] = "created", ["actorUid"] = actor.Uid, ["at"] = now
            });
            return TaskDomainSupport.Map(new(id, data));
        }, ct);
    }
}
