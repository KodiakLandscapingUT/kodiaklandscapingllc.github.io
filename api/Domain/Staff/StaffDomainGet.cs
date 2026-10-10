using api.Domain.Shared;
using api.Dtos.Read;

namespace api.Domain.Staff;

// Shared self-service operation for every authenticated staff role.
public sealed class StaffDomainGet
{
    public StaffReadDto Me(StaffReadDto actor)
    {
        DomainAccess.Require(actor, "admin", "manager", "member");
        return actor;
    }
}
