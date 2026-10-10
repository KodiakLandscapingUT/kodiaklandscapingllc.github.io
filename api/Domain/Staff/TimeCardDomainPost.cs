using System.Globalization;
using api.Domain.Models;
using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Staff;

public sealed class TimeCardDomainPost(IDocumentStore store)
{
    public Task<TimeCardReadDto> SubmitAsync(SubmitTimeCardWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin", "manager", "member");
        var week = DateOnly.ParseExact(input.WeekStart, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (week.DayOfWeek != DayOfWeek.Monday || week.Year < 2000 || week.Year > 2099 || input.Shifts.Count is < 1 or > 56)
            throw new ApiException(400, "Submit 1–56 shifts for a Monday–Sunday workweek");
        var shifts = input.Shifts.Select(shift => new WorkShift(
            DateOnly.ParseExact(shift.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture),
            TimeOnly.ParseExact(shift.BeginTime, "HH:mm", CultureInfo.InvariantCulture),
            TimeOnly.ParseExact(shift.EndTime, "HH:mm", CultureInfo.InvariantCulture),
            shift.EndNextDay, shift.UnpaidBreakMinutes)).ToList();
        var id = $"{actor.Uid}_{input.WeekStart}";
        return store.TransactAsync(async transaction =>
        {
            var profile = await transaction.GetAsync("employeeTimeProfiles", actor.Uid, ct)
                ?? throw new ApiException(409, "An administrator must set your employee ID and hourly rate before submission");
            if (await transaction.GetAsync("timecards", id, ct) is not null)
                throw new ApiException(409, "A timecard has already been submitted for this week");
            var employee = TimeCardData.Profile(profile);
            var report = new EmployeeTimeReport
            {
                EmployeeId = employee.EmployeeId, Name = employee.Name, HourlyRate = employee.HourlyRate,
                WeekStart = week, Shifts = shifts
            };
            var allocated = report.AllocateHours();
            var regularMinutes = allocated.Sum(shift => shift.RegularMinutes);
            var overtimeMinutes = allocated.Sum(shift => shift.OvertimeMinutes);
            // Store integer cents/minutes, never Firestore floating-point payroll values.
            var rateCents = Convert.ToDecimal(profile.Data["hourlyRateCents"], CultureInfo.InvariantCulture);
            var grossCents = decimal.ToInt64(decimal.Round(
                rateCents * (regularMinutes * 2m + overtimeMinutes * 3m) / 120m,
                0, MidpointRounding.AwayFromZero));
            var data = new Dictionary<string, object>
            {
                ["employeeUid"] = actor.Uid, ["employeeId"] = employee.EmployeeId, ["name"] = employee.Name,
                ["hourlyRateCents"] = profile.Data["hourlyRateCents"],
                ["weekStart"] = input.WeekStart, ["weekEnd"] = TimeCardData.Date(week.AddDays(6)),
                ["regularMinutes"] = regularMinutes, ["overtimeMinutes"] = overtimeMinutes,
                ["estimatedGrossPayCents"] = grossCents, ["status"] = "submitted",
                ["submittedAt"] = DocumentValues.Iso(DateTime.UtcNow),
                ["shifts"] = allocated.Select(allocatedShift =>
                {
                    var shift = allocatedShift.Shift;
                    return (object)new Dictionary<string, object>
                    {
                        ["date"] = TimeCardData.Date(shift.Date),
                        ["beginTime"] = shift.BeginTime.ToString("HH:mm", CultureInfo.InvariantCulture),
                        ["endTime"] = shift.EndTime.ToString("HH:mm", CultureInfo.InvariantCulture),
                        ["endNextDay"] = shift.EndNextDay, ["unpaidBreakMinutes"] = shift.UnpaidBreakMinutes,
                        ["regularMinutes"] = allocatedShift.RegularMinutes, ["overtimeMinutes"] = allocatedShift.OvertimeMinutes
                    };
                }).ToList()
            };
            transaction.Set("timecards", id, data);
            return TimeCardData.Report(new(id, data));
        }, ct);
    }
}
