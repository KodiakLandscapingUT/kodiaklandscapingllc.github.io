using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace api.Dtos.Write;

public sealed class CreateApplicationWriteDto : IValidatableObject
{
    [Required, StringLength(100, MinimumLength = 1)] public string FirstName { get; init; } = "";
    [Required, StringLength(100, MinimumLength = 1)] public string LastName { get; init; } = "";
    [Required, StringLength(30, MinimumLength = 7)] public string Phone { get; init; } = "";
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = "";
    [Required, StringLength(200, MinimumLength = 1)] public string StreetAddress { get; init; } = "";
    [Required, StringLength(100, MinimumLength = 1)] public string City { get; init; } = "";
    [Required, StringLength(50, MinimumLength = 2)] public string State { get; init; } = "";
    [Required, StringLength(15, MinimumLength = 3)] public string Zip { get; init; } = "";
    [Required, StringLength(200, MinimumLength = 1)] public string EmergencyName { get; init; } = "";
    [Required, StringLength(100, MinimumLength = 1)] public string EmergencyRelation { get; init; } = "";
    [Required, StringLength(30, MinimumLength = 7)] public string EmergencyPhone { get; init; } = "";
    [Required, StringLength(100, MinimumLength = 1)] public string Position { get; init; } = "";
    [Required] public string StartDate { get; init; } = "";
    [Required] public bool? IsH2b { get; init; }
    [Required] public bool? CanLift { get; init; }
    [Required] public bool? UnderstandsWork { get; init; }
    [Required] public bool? Consent { get; init; }
    [StringLength(20, MinimumLength = 4)] public string? Ssn { get; init; }
    [StringLength(30, MinimumLength = 3)] public string? PassportNumber { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!DateOnly.TryParseExact(StartDate, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out _))
            yield return new("A valid start date is required", [nameof(StartDate)]);
        if (CanLift != true) yield return new("Confirmation is required", [nameof(CanLift)]);
        if (UnderstandsWork != true) yield return new("Confirmation is required", [nameof(UnderstandsWork)]);
        if (Consent != true) yield return new("Consent is required", [nameof(Consent)]);
    }
}

public sealed class RevealSensitiveWriteDto
{
    [Required, StringLength(300, MinimumLength = 5)] public string Reason { get; init; } = "";
}
