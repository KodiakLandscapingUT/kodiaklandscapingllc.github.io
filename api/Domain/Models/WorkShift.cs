namespace api.Domain.Models;

public sealed record WorkShift(DateOnly Date, TimeOnly BeginTime, TimeOnly EndTime,
    bool EndNextDay, int UnpaidBreakMinutes)
{
    public DateTime BeginsAt => Date.ToDateTime(BeginTime);
    public DateTime EndsAt => Date.AddDays(EndNextDay ? 1 : 0).ToDateTime(EndTime);
    public int NetMinutes => (int)(EndsAt - BeginsAt).TotalMinutes - UnpaidBreakMinutes;
    public decimal NetHours => NetMinutes / 60m;
}

public sealed record AllocatedWorkShift(WorkShift Shift, int RegularMinutes, int OvertimeMinutes)
{
    public decimal RegularHours => RegularMinutes / 60m;
    public decimal OvertimeHours => OvertimeMinutes / 60m;
    // A shift can contain both regular and overtime hours.
    public bool IsOvertime => OvertimeMinutes > 0;
}
