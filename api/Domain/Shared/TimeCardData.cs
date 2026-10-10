using System.Globalization;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Shared;

internal static class TimeCardData
{
    public static string Date(DateOnly value) => value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    public static int Number(Dictionary<string, object> data, string key) =>
        Convert.ToInt32(data[key], CultureInfo.InvariantCulture);
    public static decimal Money(Dictionary<string, object> data, string key) =>
        Convert.ToDecimal(data[key], CultureInfo.InvariantCulture) / 100m;
    public static EmployeeTimeProfileReadDto Profile(StoredDocument document) => new(document.Id,
        Number(document.Data, "employeeId"), document.Data.Text("name"),
        Money(document.Data, "hourlyRateCents"), document.Data.Text("updatedAt"));

    public static TimeCardReadDto Report(StoredDocument document)
    {
        var data = document.Data;
        var shifts = ((IEnumerable<object>)data["shifts"]).Select(value =>
        {
            var shift = (Dictionary<string, object>)value;
            var regular = Number(shift, "regularMinutes") / 60m;
            var overtime = Number(shift, "overtimeMinutes") / 60m;
            return new WorkShiftReadDto(shift.Text("date"), shift.Text("beginTime"), shift.Text("endTime"),
                shift.Flag("endNextDay"), Number(shift, "unpaidBreakMinutes"),
                (Number(shift, "regularMinutes") + Number(shift, "overtimeMinutes")) / 60m,
                regular, overtime, overtime > 0);
        }).ToList();
        var regularHours = Number(data, "regularMinutes") / 60m;
        var overtimeHours = Number(data, "overtimeMinutes") / 60m;
        return new(document.Id, data.Text("employeeUid"), Number(data, "employeeId"), data.Text("name"),
            Money(data, "hourlyRateCents"), data.Text("weekStart"), data.Text("weekEnd"),
            shifts, regularHours, overtimeHours, regularHours + overtimeHours,
            Money(data, "estimatedGrossPayCents"), data.Text("status"), data.Text("submittedAt"),
            data.NullableText("reviewedAt"), data.NullableText("reviewedByUid"), data.NullableText("reviewNote"));
    }
}
