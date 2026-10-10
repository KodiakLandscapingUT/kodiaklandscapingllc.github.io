using api.Authentication;
using api.Dtos.Read;
using api.Dtos.Write;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AdminDomains = api.Domain.Admin;
using StaffDomains = api.Domain.Staff;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/timecards")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class TimeCardsController(
    StaffDomains.TimeCardDomainGet employeeGet,
    StaffDomains.TimeCardDomainPost employeePost,
    AdminDomains.TimeCardDomainGet adminGet,
    AdminDomains.TimeCardDomainPatch adminPatch) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<ActionResult<EmployeeTimeProfileReadDto?>> Profile(CancellationToken ct) =>
        new JsonResult(await employeeGet.ProfileAsync(User.Profile(), ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TimeCardReadDto>>> List(CancellationToken ct)
    {
        var actor = User.Profile();
        return Ok(actor.Role == "admin" ? await adminGet.ListAsync(actor, ct) : await employeeGet.ListAsync(actor, ct));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TimeCardReadDto>> Get(string id, CancellationToken ct)
    {
        var actor = User.Profile();
        return Ok(actor.Role == "admin" ? await adminGet.GetAsync(id, actor, ct) : await employeeGet.GetAsync(id, actor, ct));
    }

    [HttpPost]
    public async Task<ActionResult<TimeCardReadDto>> Submit(SubmitTimeCardWriteDto input, CancellationToken ct) =>
        StatusCode(201, await employeePost.SubmitAsync(input, User.Profile(), ct));

    [HttpGet("employees")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<IReadOnlyList<EmployeeTimeDirectoryReadDto>>> Employees(CancellationToken ct) =>
        Ok(await adminGet.EmployeesAsync(User.Profile(), ct));

    [HttpPatch("employees/{uid}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<EmployeeTimeProfileReadDto>> SetProfile(string uid,
        EmployeeTimeProfileWriteDto input, CancellationToken ct) =>
        Ok(await adminPatch.SetProfileAsync(uid, input, User.Profile(), ct));

    [HttpPatch("{id}/review")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<TimeCardReadDto>> Review(string id,
        ReviewTimeCardWriteDto input, CancellationToken ct) =>
        Ok(await adminPatch.ReviewAsync(id, input, User.Profile(), ct));
}
