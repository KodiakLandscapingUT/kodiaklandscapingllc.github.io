using api.Authentication;
using api.Dtos.Read;
using api.Dtos.Write;
using api.Infrastructure;

namespace api.Domain.Shared;

// Role-specific POST domains choose the allowed invitation role.
// This helper shares only the persistence and identity-provider workflow.
public sealed class StaffInvitationWriter(IDocumentStore store, IIdentityProvider identity)
{
    internal async Task<StaffInvitationReadDto> InviteAsync(
        InviteStaffWriteDto input, StaffReadDto actor, string role, CancellationToken ct)
    {
        var email = input.Email.Trim().ToLowerInvariant();
        var name = input.DisplayName.Trim();
        if (name.Length < 2) throw new ApiException(400, "A valid name is required");
        var uid = await identity.GetOrCreateUserAsync(email, name, ct);
        var existing = await store.GetAsync("staffUsers", uid, ct);
        if (existing?.Data.Text("role") is "admin" or "manager")
            throw new ApiException(409, "This user already has an elevated staff role");
        // Generate the private setup link before granting app access. A provider
        // failure must not leave an elevated account without a usable invitation.
        var setupLink = await identity.PasswordResetLinkAsync(email, ct);
        return await store.TransactAsync<StaffInvitationReadDto>(async transaction =>
        {
            var current = await transaction.GetAsync("staffUsers", uid, ct);
            if (current?.Data.Text("role") is "admin" or "manager")
                throw new ApiException(409, "This user already has an elevated staff role");
            transaction.Set("staffUsers", uid, new()
            {
                ["email"] = email, ["displayName"] = name, ["role"] = role, ["active"] = true,
                ["invitedByUid"] = actor.Uid, ["updatedAt"] = DocumentValues.Iso(DateTime.UtcNow)
            });
            return new(uid, email, name, role, setupLink);
        }, ct);
    }
}
