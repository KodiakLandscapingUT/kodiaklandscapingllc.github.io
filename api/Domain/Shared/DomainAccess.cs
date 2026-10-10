using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Shared;

// Keep role checks in the domain as well as at the HTTP boundary, so calling
// a domain directly cannot bypass the controller's authorization policy.
internal static class DomainAccess
{
    public static void Require(StaffReadDto actor, params string[] roles)
    {
        if (string.IsNullOrWhiteSpace(actor.Uid) || !roles.Contains(actor.Role, StringComparer.Ordinal))
            throw new ApiException(403, "Staff role does not permit this action");
    }

    public static void RequireManagement(StaffReadDto actor) => Require(actor, "admin", "manager");
}
