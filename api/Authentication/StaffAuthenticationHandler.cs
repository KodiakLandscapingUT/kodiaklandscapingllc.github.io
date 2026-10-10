using System.Security.Claims;
using System.Text.Encodings.Web;
using api.Dtos.Read;
using api.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace api.Authentication;

public sealed class StaffAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger, UrlEncoder encoder, StaffAuthenticationService staff)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Firebase";
    private int failureStatus = 401;
    private string failureMessage = "Invalid or expired authentication";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();
        try
        {
            var profile = await staff.AuthenticateAsync(authorization[7..], Context.RequestAborted);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, profile.Uid),
                new Claim(ClaimTypes.Email, profile.Email),
                new Claim(ClaimTypes.Role, profile.Role),
                new Claim(ClaimTypes.Name, profile.DisplayName)
            };
            return AuthenticateResult.Success(new AuthenticationTicket(
                new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName)), SchemeName));
        }
        catch (ApiException exception)
        {
            failureStatus = exception.StatusCode;
            failureMessage = exception.Message;
            return AuthenticateResult.Fail(failureMessage);
        }
        catch (Exception)
        {
            return AuthenticateResult.Fail(failureMessage);
        }
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = failureStatus;
        Response.Headers.WWWAuthenticate = "Bearer";
        await Response.WriteAsJsonAsync(new ErrorReadDto(
            Request.Headers.Authorization.Count == 0 ? "Authentication required" : failureMessage));
    }

    protected override async Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 403;
        await Response.WriteAsJsonAsync(new ErrorReadDto("Staff role does not permit this action"));
    }
}

public static class StaffPrincipal
{
    public static StaffReadDto Profile(this ClaimsPrincipal user) => new(
        user.FindFirstValue(ClaimTypes.NameIdentifier)!,
        user.FindFirstValue(ClaimTypes.Email)!,
        user.FindFirstValue(ClaimTypes.Role)!,
        user.FindFirstValue(ClaimTypes.Name)!);
}
