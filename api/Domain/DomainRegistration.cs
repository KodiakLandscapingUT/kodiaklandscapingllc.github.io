using AdminDomains = api.Domain.Admin;
using ManagerDomains = api.Domain.Manager;
using MemberDomains = api.Domain.Member;
using PublicDomains = api.Domain.Public;
using SharedDomains = api.Domain.Shared;
using StaffDomains = api.Domain.Staff;

namespace api.Domain;

public static class DomainRegistration
{
    public static IServiceCollection AddDomains(this IServiceCollection services)
    {
        services.AddScoped<PublicDomains.ApplicationDomainPost>();
        services.AddScoped<PublicDomains.HealthDomainGet>();
        services.AddScoped<AdminDomains.ApplicationDomainGet>();
        services.AddScoped<AdminDomains.ApplicationDomainPost>();
        services.AddScoped<AdminDomains.StaffDomainPost>();
        services.AddScoped<ManagerDomains.StaffDomainGet>();
        services.AddScoped<ManagerDomains.StaffDomainPost>();
        services.AddScoped<ManagerDomains.TaskDomainGet>();
        services.AddScoped<ManagerDomains.TaskDomainPost>();
        services.AddScoped<ManagerDomains.TaskDomainPatch>();
        services.AddScoped<ManagerDomains.TaskDomainDelete>();
        services.AddScoped<MemberDomains.TaskDomainGet>();
        services.AddScoped<MemberDomains.TaskDomainPatch>();
        services.AddScoped<StaffDomains.StaffDomainGet>();
        services.AddScoped<StaffDomains.TimeCardDomainGet>();
        services.AddScoped<StaffDomains.TimeCardDomainPost>();
        services.AddScoped<AdminDomains.TimeCardDomainGet>();
        services.AddScoped<AdminDomains.TimeCardDomainPatch>();
        services.AddScoped<SharedDomains.StaffInvitationWriter>();
        services.AddScoped<SharedDomains.TaskDomainSupport>();
        return services;
    }
}
