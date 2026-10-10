using Google.Cloud.Firestore;
using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;
using api.Services;

namespace api.Domain.Admin;

public sealed class ApplicationDomainPost(IDocumentStore store, SensitiveValueService encryption)
{
    public async Task<SensitiveRevealReadDto> RevealAsync(string id, string field,
        RevealSensitiveWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        if (field is not ("ssn" or "passportNumber"))
            throw new ApiException(400, "A valid field and reveal reason are required");
        var document = await store.GetAsync("applications", id, ct);
        var encrypted = document?.Data.Map("sensitive").Map(field);
        if (encrypted is null || encrypted.Count == 0)
            throw new ApiException(404, "Sensitive value not found");
        var value = encryption.Decrypt(encrypted);
        // Audit must persist before plaintext is returned.
        await store.AddAsync("sensitiveRevealAudit", new()
        {
            ["applicationId"] = id, ["field"] = field, ["reason"] = input.Reason,
            ["staffUid"] = actor.Uid, ["staffEmail"] = actor.Email,
            ["revealedAt"] = FieldValue.ServerTimestamp
        }, ct);
        return new(field, value);
    }
}
