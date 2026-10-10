namespace api.Authentication;

public sealed record VerifiedIdentity(string Uid, string? Email, bool EmailVerified, string? Name);

public interface IIdentityProvider
{
    Task<VerifiedIdentity> VerifyAsync(string token, CancellationToken cancellationToken);
    Task<string> GetOrCreateUserAsync(string email, string displayName, CancellationToken cancellationToken);
    Task<string> PasswordResetLinkAsync(string email, CancellationToken cancellationToken);
}
