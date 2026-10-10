using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;

namespace api.Dtos.Write;

public sealed class InviteStaffWriteDto
{
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(200, MinimumLength = 2)] public string DisplayName { get; init; } = "";
    [RegularExpression("^(member|manager)$")] public string? Role { get; init; }
}

public sealed class CreateTaskWriteDto : IValidatableObject
{
    [Required, StringLength(160, MinimumLength = 2)] public string Title { get; init; } = "";
    [StringLength(4000)] public string? Description { get; init; } = "";
    [Required] public string AssigneeUid { get; init; } = "";
    public string? DueDate { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Title.Trim().Length < 2) yield return new("A title is required", [nameof(Title)]);
        if (!ValidDate(DueDate)) yield return new("Invalid due date", [nameof(DueDate)]);
    }

    internal static bool ValidDate(string? value) => string.IsNullOrEmpty(value) ||
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}

public sealed class UpdateTaskWriteDto : IValidatableObject
{
    [JsonIgnore] public bool HasStatus { get; private set; }
    [RegularExpression("^(todo|in_progress|completed)$")]
    public string? Status { get => status; init { status = value; HasStatus = true; } }
    private readonly string? status;
    [StringLength(160, MinimumLength = 2)] public string? Title { get; init; }
    [StringLength(4000)] public string? Description { get; init; }
    public string? AssigneeUid { get; init; }
    // Explicit null clears a due date; omission must preserve the current due date.
    [JsonIgnore] public bool HasDueDate { get; private set; }
    public string? DueDate { get => dueDate; init { dueDate = value; HasDueDate = true; } }
    private readonly string? dueDate;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HasStatus && Status is null)
            yield return new("Invalid status", [nameof(Status)]);
        if (Title is not null && Title.Trim().Length < 2)
            yield return new("Invalid title", [nameof(Title)]);
        if (HasDueDate && !CreateTaskWriteDto.ValidDate(DueDate))
            yield return new("Invalid due date", [nameof(DueDate)]);
    }
}
