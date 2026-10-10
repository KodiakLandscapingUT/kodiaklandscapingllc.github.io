using Google.Cloud.Firestore;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;
using api.Services;

namespace api.Domain.Public;

public sealed class ApplicationDomainPost(IDocumentStore store, SensitiveValueService encryption)
{
    public async Task<ApplicationSubmissionReadDto> CreateAsync(CreateApplicationWriteDto input, CancellationToken ct)
    {
        var submittedAt = DateTime.UtcNow;
        var sensitive = new Dictionary<string, object>();
        var masks = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(input.Ssn))
        {
            sensitive["ssn"] = encryption.Encrypt(input.Ssn);
            masks["ssn"] = SensitiveValueService.Mask(input.Ssn);
        }
        if (!string.IsNullOrEmpty(input.PassportNumber))
        {
            sensitive["passportNumber"] = encryption.Encrypt(input.PassportNumber);
            masks["passportNumber"] = SensitiveValueService.Mask(input.PassportNumber);
        }
        var data = new Dictionary<string, object>
        {
            ["firstName"] = input.FirstName, ["lastName"] = input.LastName,
            ["phone"] = input.Phone, ["email"] = input.Email, ["streetAddress"] = input.StreetAddress,
            ["city"] = input.City, ["state"] = input.State, ["zip"] = input.Zip,
            ["emergencyName"] = input.EmergencyName, ["emergencyRelation"] = input.EmergencyRelation,
            ["emergencyPhone"] = input.EmergencyPhone, ["position"] = input.Position,
            ["startDate"] = input.StartDate, ["isH2b"] = input.IsH2b!.Value,
            ["canLift"] = input.CanLift!.Value, ["understandsWork"] = input.UnderstandsWork!.Value,
            ["consent"] = input.Consent!.Value, ["submittedAt"] = Timestamp.FromDateTime(submittedAt),
            ["sensitive"] = sensitive, ["sensitiveMasks"] = masks
        };
        var id = await store.AddAsync("applications", data, ct);
        return new(id, DocumentValues.Iso(submittedAt));
    }
}
