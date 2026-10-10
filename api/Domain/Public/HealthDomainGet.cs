using api.Dtos.Read;

namespace api.Domain.Public;

public sealed class HealthDomainGet
{
    public HealthReadDto Get() => new("ok");
}
