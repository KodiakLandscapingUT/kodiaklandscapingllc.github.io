using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;

namespace api.Domain.Admin;

public sealed class StaffDomainPost(StaffInvitationWriter invitations)
{
    public Task<StaffInvitationReadDto> InviteAsync(
        InviteStaffWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "admin");
        return invitations.InviteAsync(input, actor, input.Role == "manager" ? "manager" : "member", ct);
    }
}
