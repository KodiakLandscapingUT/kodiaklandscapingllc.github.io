using api.Domain.Shared;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Admin;

public sealed class TimeCardDomainGet(IDocumentStore store)
{
    public async Task<IReadOnlyList<TimeCardReadDto>> ListAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        return (await store.ListAsync("timecards", null, null, null, null, ct))
            .Select(TimeCardData.Report).OrderByDescending(report => report.SubmittedAt).ToList();
    }
    public async Task<TimeCardReadDto> GetAsync(string id, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        return TimeCardData.Report(await store.GetAsync("timecards", id, ct) ?? throw new ApiException(404, "Timecard not found"));
    }
    public async Task<IReadOnlyList<EmployeeTimeDirectoryReadDto>> EmployeesAsync(StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        var staff = await store.ListAsync("staffUsers", null, null, "active", true, ct);
        var profiles = (await store.ListAsync("employeeTimeProfiles", null, null, null, null, ct))
            .ToDictionary(profile => profile.Id, TimeCardData.Profile);
        return staff.Select(person =>
        {
            profiles.TryGetValue(person.Id, out var profile);
            return new EmployeeTimeDirectoryReadDto(person.Id,
                person.Data.Text("displayName", person.Data.Text("email")), person.Data.Text("email"),
                profile?.EmployeeId, profile?.HourlyRate);
        }).OrderBy(person => person.Name).ToList();
    }
}
