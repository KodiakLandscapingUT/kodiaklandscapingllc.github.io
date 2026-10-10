using api.Infrastructure;

namespace api.Domain.Models;

public sealed class EmployeeTimeReport
{
    public required int EmployeeId { get; init; }
    public required string Name { get; init; }
    public required decimal HourlyRate { get; init; }
    public required DateOnly WeekStart { get; init; }
    public required IReadOnlyList<WorkShift> Shifts { get; init; }

    public IReadOnlyList<AllocatedWorkShift> AllocateHours()
    {
        var remainingRegularMinutes = 40 * 60;
        var result = new List<AllocatedWorkShift>();
        DateTime? previousEnd = null;
        foreach (var shift in Shifts.OrderBy(shift => shift.BeginsAt))
        {
            if (shift.Date < WeekStart || shift.Date > WeekStart.AddDays(6) ||
                shift.EndsAt > WeekStart.AddDays(7).ToDateTime(TimeOnly.MinValue))
                throw new ApiException(400, "Every shift must fall within the Monday–Sunday workweek");
            var duration = (int)(shift.EndsAt - shift.BeginsAt).TotalMinutes;
            if (duration <= 0 || duration > 24 * 60 || shift.UnpaidBreakMinutes < 0 ||
                shift.UnpaidBreakMinutes >= duration)
                throw new ApiException(400, "Shift duration must be positive and unpaid breaks must be shorter than the shift");
            if (previousEnd.HasValue && shift.BeginsAt < previousEnd.Value)
                throw new ApiException(400, "Work shifts cannot overlap");
            var regularMinutes = Math.Min(remainingRegularMinutes, shift.NetMinutes);
            result.Add(new(shift, regularMinutes, shift.NetMinutes - regularMinutes));
            remainingRegularMinutes -= regularMinutes;
            previousEnd = shift.EndsAt;
        }
        return result;
    }

    public decimal TotalRegularHours => AllocateHours().Sum(shift => shift.RegularMinutes) / 60m;
    public decimal TotalOvertimeHours => AllocateHours().Sum(shift => shift.OvertimeMinutes) / 60m;
}
