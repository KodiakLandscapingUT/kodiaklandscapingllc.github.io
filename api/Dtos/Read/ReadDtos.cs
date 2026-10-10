namespace api.Dtos.Read;

public sealed record ErrorReadDto(string Error);
public sealed record HealthReadDto(string Status);
public sealed record ApplicationSubmissionReadDto(string Id, string SubmittedAt);
public sealed record SensitiveRevealReadDto(string Field, string Value);
public sealed record StaffReadDto(string Uid, string Email, string Role, string DisplayName);
public sealed record StaffDirectoryReadDto(
    string Uid, string Email, string Role, string DisplayName, bool Active);
public sealed record StaffInvitationReadDto(
    string Uid, string Email, string DisplayName, string Role, string SetupLink);

public sealed record ApplicationReadDto(
    string Id, string SubmittedAt, string FirstName, string LastName, string Phone,
    string Email, string StreetAddress, string City, string State, string Zip,
    string EmergencyName, string EmergencyRelation, string EmergencyPhone,
    string Position, string StartDate, bool IsH2b, bool CanLift, bool UnderstandsWork,
    bool Consent, string? SsnMasked, string? PassportNumberMasked);

public sealed record TaskReadDto(
    string Id, string Title, string Description, string AssigneeUid, string AssigneeName,
    string? DueDate, string Status, string CreatedAt, string UpdatedAt,
    string CreatedByUid, string CreatedByName, string? CompletedAt);
