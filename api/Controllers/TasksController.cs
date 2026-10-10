using api.Authentication;
using api.Dtos.Read;
using api.Dtos.Write;
using ManagerDomains = api.Domain.Manager;
using MemberDomains = api.Domain.Member;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/tasks")]
public sealed class TasksController(
    ManagerDomains.TaskDomainGet managementRead,
    ManagerDomains.TaskDomainPost create,
    ManagerDomains.TaskDomainPatch managementUpdate,
    ManagerDomains.TaskDomainDelete delete,
    MemberDomains.TaskDomainGet memberRead,
    MemberDomains.TaskDomainPatch memberUpdate) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskReadDto>>> List(CancellationToken ct)
    {
        var actor = User.Profile();
        return Ok(actor.Role == "member"
            ? await memberRead.ListAsync(actor, ct)
            : await managementRead.ListAsync(actor, ct));
    }

    [HttpPost]
    [Authorize(Policy = "Manager")]
    public async Task<ActionResult<TaskReadDto>> Create(CreateTaskWriteDto input, CancellationToken ct) =>
        StatusCode(201, await create.CreateAsync(input, User.Profile(), ct));

    [HttpPatch("{id}")]
    public async Task<ActionResult<TaskReadDto>> Update(string id, UpdateTaskWriteDto input, CancellationToken ct)
    {
        var actor = User.Profile();
        return Ok(actor.Role == "member"
            ? await memberUpdate.UpdateAsync(id, input, actor, ct)
            : await managementUpdate.UpdateAsync(id, input, actor, ct));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "Manager")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await delete.DeleteAsync(id, User.Profile(), ct);
        return NoContent();
    }
}
