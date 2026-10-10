using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Manager;

// Administrators inherit the same directory access as managers.
public sealed class StaffDomainGet(IDocumentStore store)
{
    public async Task<IReadOnlyList<StaffDirectoryReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.RequireManagement(actor);
        var documents = await store.ListAsync("staffUsers", null, null, "active", true, ct);
        return documents.Select(doc => new StaffDirectoryReadDto(doc.Id,
            doc.Data.Text("email"), doc.Data.Text("role", "member"), doc.Data.Text("displayName"),
            doc.Data.Flag("active"))).ToList();
    }
}
