using api.Dtos.Read;
using api.Infrastructure;

namespace api.Authentication;

// Token verification/bootstrap is authentication infrastructure, not an HTTP domain.
public sealed class StaffAuthenticationService(
    IDocumentStore store, IIdentityProvider identity, IConfiguration configuration)
{
    public async Task<StaffReadDto> AuthenticateAsync(string token, CancellationToken ct)
    {
        var verified = await identity.VerifyAsync(token, ct);
        var email = verified.Email?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || !verified.EmailVerified)
            throw new ApiException(403, "Staff access required");
        var admins = (configuration["STAFF_EMAILS"] ?? "").Split(',')
            .Select(value => value.Trim().ToLowerInvariant()).ToHashSet();
        var bootstrap = admins.Contains(email);
        var document = await store.GetAsync("staffUsers", verified.Uid, ct);
        var data = document?.Data ?? new Dictionary<string, object>();
        if (!bootstrap && (document is null || !data.Flag("active")))
            throw new ApiException(403, "Staff access required");
        var storedRole = data.Text("role");
        var role = bootstrap ? "admin" : storedRole is "admin" or "manager" ? storedRole : "member";
        var name = data.Text("displayName");
        if (string.IsNullOrEmpty(name)) name = verified.Name ?? email;
        if (bootstrap && (document is null || storedRole != "admin"))
            await store.SetAsync("staffUsers", verified.Uid, new()
            {
                ["email"] = email, ["displayName"] = name, ["role"] = "admin",
                ["active"] = true, ["updatedAt"] = DocumentValues.Iso(DateTime.UtcNow)
            }, ct);
        return new(verified.Uid, email, role, name);
    }
}
