namespace api.Dtos.Read;

public sealed record EmployeeTimeProfileReadDto(
    string Uid, int EmployeeId, string Name, decimal HourlyRate, string UpdatedAt);
public sealed record EmployeeTimeDirectoryReadDto(
    string Uid, string Name, string Email, int? EmployeeId, decimal? HourlyRate);
public sealed record WorkShiftReadDto(
    string Date, string BeginTime, string EndTime, bool EndNextDay, int UnpaidBreakMinutes,
    decimal NetHours, decimal RegularHours, decimal OvertimeHours, bool IsOvertime);
public sealed record TimeCardReadDto(
    string Id, string EmployeeUid, int EmployeeId, string Name, decimal HourlyRate,
    string WeekStart, string WeekEnd, IReadOnlyList<WorkShiftReadDto> Shifts,
    decimal TotalRegularHours, decimal TotalOvertimeHours, decimal TotalHours,
    decimal EstimatedGrossPay, string Status, string SubmittedAt,
    string? ReviewedAt, string? ReviewedByUid, string? ReviewNote);
