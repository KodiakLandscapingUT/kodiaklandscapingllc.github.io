using api.Domain.Public;
using api.Dtos.Read;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/healthz")]
public sealed class HealthController(HealthDomainGet domain) : ControllerBase
{
    [HttpGet]
    public ActionResult<HealthReadDto> Get() => Ok(domain.Get());
}
