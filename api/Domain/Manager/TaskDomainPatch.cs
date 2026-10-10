using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Manager;

public sealed class TaskDomainPatch(TaskDomainSupport tasks)
{
    public Task<TaskReadDto> UpdateAsync(string id, UpdateTaskWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.RequireManagement(actor);
        return tasks.TransactAsync(async transaction =>
        {
            var document = await TaskDomainSupport.GetAsync(transaction, id, ct);
            var updates = TaskDomainSupport.StatusUpdates(input.Status, DocumentValues.Iso(DateTime.UtcNow));
            if (input.Title is not null) updates["title"] = input.Title.Trim();
            if (input.Description is not null) updates["description"] = input.Description.Trim();
            if (input.HasDueDate) updates["dueDate"] = string.IsNullOrEmpty(input.DueDate) ? null! : input.DueDate;
            if (!string.IsNullOrEmpty(input.AssigneeUid))
            {
                var assignee = await TaskDomainSupport.ActiveAssigneeAsync(transaction, input.AssigneeUid, ct);
                updates["assigneeUid"] = assignee.Id;
                updates["assigneeName"] = TaskDomainSupport.AssigneeName(assignee);
            }
            return TaskDomainSupport.SaveUpdate(transaction, document, updates, actor, ct);
        }, ct);
    }
}
