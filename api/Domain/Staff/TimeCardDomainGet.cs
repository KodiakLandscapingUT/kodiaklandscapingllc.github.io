using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Staff;

public sealed class TimeCardDomainGet(IDocumentStore store)
{
    public async Task<EmployeeTimeProfileReadDto?> ProfileAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin", "manager", "member");
        var profile = await store.GetAsync("employeeTimeProfiles", actor.Uid, ct);
        return profile is null ? null : TimeCardData.Profile(profile);
    }

    public async Task<IReadOnlyList<TimeCardReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin", "manager", "member");
        var documents = await store.ListAsync("timecards", null, null, "employeeUid", actor.Uid, ct);
        return documents.Select(TimeCardData.Report).OrderByDescending(report => report.WeekStart).ToList();
    }

    public async Task<TimeCardReadDto> GetAsync(string id, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin", "manager", "member");
        var document = await store.GetAsync("timecards", id, ct) ?? throw new ApiException(404, "Timecard not found");
        if (document.Data.Text("employeeUid") != actor.Uid) throw new ApiException(403, "This timecard belongs to another employee");
        return TimeCardData.Report(document);
    }
}
