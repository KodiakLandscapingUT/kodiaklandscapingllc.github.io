using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Shared;

// Common task persistence/projection; role and verb rules stay in their domains.
public sealed class TaskDomainSupport(IDocumentStore store)
{
    internal Task<T> TransactAsync<T>(Func<IDocumentTransaction, Task<T>> action, CancellationToken ct) =>
        store.TransactAsync(action, ct);

    internal static async Task<StoredDocument> GetAsync(IDocumentTransaction transaction, string id, CancellationToken ct) =>
        await transaction.GetAsync("tasks", id, ct) ?? throw new ApiException(404, "Task not found");

    internal static async Task<StoredDocument> ActiveAssigneeAsync(IDocumentTransaction transaction, string uid, CancellationToken ct)
    {
        var doc = await transaction.GetAsync("staffUsers", uid, ct);
        if (doc is null || !doc.Data.Flag("active")) throw new ApiException(400, "Assignee is not active");
        return doc;
    }

    internal static string AssigneeName(StoredDocument doc) =>
        string.IsNullOrEmpty(doc.Data.Text("displayName")) ? doc.Data.Text("email") : doc.Data.Text("displayName");

    internal static Dictionary<string, object> StatusUpdates(string? status, string now)
    {
        var updates = new Dictionary<string, object> { ["updatedAt"] = now };
        if (status is not null)
        {
            if (status is not ("todo" or "in_progress" or "completed"))
                throw new ApiException(400, "Invalid task status");
            updates["status"] = status;
            updates["completedAt"] = status == "completed" ? now : null!;
        }
        return updates;
    }

    internal static TaskReadDto SaveUpdate(IDocumentTransaction transaction, StoredDocument document,
        Dictionary<string, object> updates, StaffReadDto actor, CancellationToken ct)
    {
        transaction.Set("tasks", document.Id, updates);
        transaction.Set($"tasks/{document.Id}/activity", Guid.NewGuid().ToString("N"), new()
        {
            ["type"] = "updated", ["actorUid"] = actor.Uid,
            ["changes"] = updates.Keys.ToArray(), ["at"] = updates["updatedAt"]
        });
        foreach (var entry in updates) document.Data[entry.Key] = entry.Value;
        return Map(document);
    }

    internal static IReadOnlyList<TaskReadDto> MapList(IReadOnlyList<StoredDocument> documents) =>
        documents.Select(Map).OrderByDescending(task => task.CreatedAt, StringComparer.Ordinal).ToList();

    internal static TaskReadDto Map(StoredDocument doc)
    {
        var data = doc.Data;
        return new(doc.Id, data.Text("title"), data.Text("description"), data.Text("assigneeUid"),
            data.Text("assigneeName"), data.NullableText("dueDate"), data.Text("status"),
            data.Text("createdAt"), data.Text("updatedAt"), data.Text("createdByUid"),
            data.Text("createdByName"), data.NullableText("completedAt"));
    }
}
