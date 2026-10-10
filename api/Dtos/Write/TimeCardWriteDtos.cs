using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace api.Dtos.Write;

public sealed class WorkShiftWriteDto
{
    [Required] public string Date { get; init; } = "";
    [Required] public string BeginTime { get; init; } = "";
    [Required] public string EndTime { get; init; } = "";
    public bool EndNextDay { get; init; }
    [Range(0, 1439)] public int UnpaidBreakMinutes { get; init; }
}

public sealed class SubmitTimeCardWriteDto : IValidatableObject
{
    [Required] public string WeekStart { get; init; } = "";
    [Required, MinLength(1), MaxLength(56)] public List<WorkShiftWriteDto> Shifts { get; init; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!DateOnly.TryParseExact(WeekStart, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var week) || week.DayOfWeek != DayOfWeek.Monday ||
            week.Year < 2000 || week.Year > 2099)
            yield return new("Week start must be a Monday between 2000 and 2099", [nameof(WeekStart)]);
        if (Shifts is null) yield break;
        foreach (var shift in Shifts)
        {
            if (shift is null || !DateOnly.TryParseExact(shift.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out _) ||
                !TimeOnly.TryParseExact(shift.BeginTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _) ||
                !TimeOnly.TryParseExact(shift.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                yield return new("Each shift needs a valid date and HH:mm times", [nameof(Shifts)]);
        }
    }
}

public sealed class EmployeeTimeProfileWriteDto : IValidatableObject
{
    [Range(1, int.MaxValue)] public int EmployeeId { get; init; }
    [Required, Range(typeof(decimal), "0", "10000")] public decimal? HourlyRate { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (HourlyRate.HasValue && decimal.Round(HourlyRate.Value, 2) != HourlyRate.Value)
            yield return new("Hourly rate must have at most two decimal places", [nameof(HourlyRate)]);
    }
}

public sealed class ReviewTimeCardWriteDto : IValidatableObject
{
    [Required, RegularExpression("^(approved|rejected)$")] public string Status { get; init; } = "";
    [StringLength(1000)] public string? Note { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Status == "rejected" && (Note?.Trim().Length ?? 0) < 3)
            yield return new("A rejection needs an explanation", [nameof(Note)]);
    }
}
