using api.Authentication;
using api.Dtos.Read;
using api.Dtos.Write;
using AdminDomains = api.Domain.Admin;
using ManagerDomains = api.Domain.Manager;
using StaffDomains = api.Domain.Staff;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/staff")]
public sealed class StaffController(
    StaffDomains.StaffDomainGet self,
    ManagerDomains.StaffDomainGet directory,
    AdminDomains.StaffDomainPost adminInvitations,
    ManagerDomains.StaffDomainPost managerInvitations) : ControllerBase
{
    [HttpGet("me")]
    public ActionResult<StaffReadDto> Me() => Ok(self.Me(User.Profile()));

    [HttpGet]
    [Authorize(Policy = "Manager")]
    public async Task<ActionResult<IReadOnlyList<StaffDirectoryReadDto>>> List(CancellationToken ct) =>
        Ok(await directory.ListAsync(User.Profile(), ct));

    [HttpPost("invite")]
    [Authorize(Policy = "Manager")]
    public async Task<ActionResult<StaffInvitationReadDto>> Invite(InviteStaffWriteDto input, CancellationToken ct)
    {
        var actor = User.Profile();
        var result = actor.Role == "admin"
            ? await adminInvitations.InviteAsync(input, actor, ct)
            : await managerInvitations.InviteAsync(input, actor, ct);
        return StatusCode(201, result);
    }
}
