using System.Globalization;
using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Admin;

public sealed class TimeCardDomainPatch(IDocumentStore store)
{
    public Task<EmployeeTimeProfileReadDto> SetProfileAsync(
        string uid, EmployeeTimeProfileWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        if (input.EmployeeId < 1 || input.HourlyRate is null or < 0 or > 10000 ||
            decimal.Round(input.HourlyRate.Value, 2) != input.HourlyRate.Value)
            throw new ApiException(400, "A positive employee ID and a valid hourly rate are required");
        return store.TransactAsync(async transaction =>
        {
            var staff = await transaction.GetAsync("staffUsers", uid, ct);
            if (staff is null || !staff.Data.Flag("active")) throw new ApiException(400, "Employee must be active staff");
            var oldProfile = await transaction.GetAsync("employeeTimeProfiles", uid, ct);
            var numberId = input.EmployeeId.ToString(CultureInfo.InvariantCulture);
            var reserved = await transaction.GetAsync("employeeTimeNumbers", numberId, ct);
            if (reserved is not null && reserved.Data.Text("uid") != uid)
                throw new ApiException(409, "Employee ID is already assigned");
            // Firestore transactions require all reads to precede writes.
            if (oldProfile is not null && TimeCardData.Number(oldProfile.Data, "employeeId") != input.EmployeeId)
                transaction.Delete("employeeTimeNumbers", oldProfile.Data["employeeId"].ToString()!);
            var data = new Dictionary<string, object>
            {
                ["employeeId"] = input.EmployeeId,
                ["name"] = staff.Data.Text("displayName", staff.Data.Text("email")),
                ["hourlyRateCents"] = decimal.ToInt64(input.HourlyRate!.Value * 100m),
                ["updatedAt"] = DocumentValues.Iso(DateTime.UtcNow), ["updatedByUid"] = actor.Uid
            };
            transaction.Set("employeeTimeNumbers", numberId, new() { ["uid"] = uid });
            transaction.Set("employeeTimeProfiles", uid, data);
            return TimeCardData.Profile(new(uid, data));
        }, ct);
    }
    public Task<TimeCardReadDto> ReviewAsync(string id, ReviewTimeCardWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        if (input.Status is not ("approved" or "rejected") || (input.Note?.Length ?? 0) > 1000 ||
            input.Status == "rejected" && (input.Note?.Trim().Length ?? 0) < 3)
            throw new ApiException(400, "A valid review status and rejection explanation are required");
        return store.TransactAsync(async transaction =>
        {
            var document = await transaction.GetAsync("timecards", id, ct)
                ?? throw new ApiException(404, "Timecard not found");
            if (document.Data.Text("status") != "submitted")
                throw new ApiException(409, "This timecard has already been reviewed");
            var updates = new Dictionary<string, object>
            {
                ["status"] = input.Status, ["reviewNote"] = input.Note?.Trim() ?? "",
                ["reviewedAt"] = DocumentValues.Iso(DateTime.UtcNow), ["reviewedByUid"] = actor.Uid
            };
            transaction.Set("timecards", id, updates);
            foreach (var change in updates) document.Data[change.Key] = change.Value;
            return TimeCardData.Report(document);
        }, ct);
    }
}
