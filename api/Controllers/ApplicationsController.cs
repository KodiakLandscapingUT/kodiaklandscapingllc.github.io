using api.Authentication;
using api.Dtos.Read;
using api.Dtos.Write;
using AdminDomains = api.Domain.Admin;
using PublicDomains = api.Domain.Public;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/applications")]
public sealed class ApplicationsController(
    PublicDomains.ApplicationDomainPost submission,
    AdminDomains.ApplicationDomainGet read,
    AdminDomains.ApplicationDomainPost reveal) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ApplicationSubmissionReadDto>> Create(
        CreateApplicationWriteDto input, CancellationToken ct)
    {
        var result = await submission.CreateAsync(input, ct);
        return StatusCode(201, result);
    }

    [HttpGet]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<IReadOnlyList<ApplicationReadDto>>> List(CancellationToken ct) =>
        Ok(await read.ListAsync(User.Profile(), ct));

    [HttpGet("{id}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ApplicationReadDto>> Get(string id, CancellationToken ct) =>
        Ok(await read.GetAsync(id, User.Profile(), ct));

    [HttpPost("{id}/sensitive/{field}/reveal")]
    [Authorize(Policy = "Admin")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<SensitiveRevealReadDto>> Reveal(
        string id, string field, RevealSensitiveWriteDto input, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await reveal.RevealAsync(id, field, input, User.Profile(), ct));
    }
}
