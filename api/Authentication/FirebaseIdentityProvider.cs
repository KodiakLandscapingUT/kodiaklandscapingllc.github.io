using FirebaseAdmin.Auth;
using api.Infrastructure;

namespace api.Authentication;

public sealed class FirebaseIdentityProvider(FirebaseProvider firebase) : IIdentityProvider
{
    public async Task<VerifiedIdentity> VerifyAsync(string token, CancellationToken cancellationToken)
    {
        var verified = await firebase.Auth.VerifyIdTokenAsync(token, cancellationToken);
        return new(verified.Uid,
            verified.Claims.TryGetValue("email", out var email) ? email as string : null,
            verified.Claims.TryGetValue("email_verified", out var emailVerified) && emailVerified is true,
            verified.Claims.TryGetValue("name", out var name) ? name as string : null);
    }

    public async Task<string> GetOrCreateUserAsync(string email, string displayName, CancellationToken cancellationToken)
    {
        try { return (await firebase.Auth.GetUserByEmailAsync(email, cancellationToken)).Uid; }
        catch (FirebaseAuthException exception) when (exception.AuthErrorCode == AuthErrorCode.UserNotFound)
        {
            return (await firebase.Auth.CreateUserAsync(new UserRecordArgs
            {
                Email = email, DisplayName = displayName, EmailVerified = true
            }, cancellationToken)).Uid;
        }
    }

    public Task<string> PasswordResetLinkAsync(string email, CancellationToken cancellationToken) =>
        firebase.Auth.GeneratePasswordResetLinkAsync(email, settings: null, cancellationToken: cancellationToken);
}
