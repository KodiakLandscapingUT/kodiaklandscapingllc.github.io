using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Admin;

public sealed class ApplicationDomainGet(IDocumentStore store)
{
    public async Task<IReadOnlyList<ApplicationReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        return (await store.ListAsync("applications", 200, "submittedAt", null, null, ct))
            .Select(ApplicationReadMapper.Map).ToList();
    }

    public async Task<ApplicationReadDto> GetAsync(string id, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        return ApplicationReadMapper.Map(await store.GetAsync("applications", id, ct)
            ?? throw new ApiException(404, "Application not found"));
    }
}
