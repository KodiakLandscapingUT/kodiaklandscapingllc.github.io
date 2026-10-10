using api.Domain.Shared;
using api.Dtos.Read;
using api.Dtos.Write;

namespace api.Domain.Manager;

public sealed class StaffDomainPost(StaffInvitationWriter invitations)
{
    public Task<StaffInvitationReadDto> InviteAsync(
        InviteStaffWriteDto input, StaffReadDto actor, CancellationToken ct)
    {
        DomainAccess.Require(actor, "manager");
        return invitations.InviteAsync(input, actor, "member", ct);
    }
}
