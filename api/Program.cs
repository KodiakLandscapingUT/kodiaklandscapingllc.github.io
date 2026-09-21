var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

var corsPolicyName = "_corsPolicy";
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi()
    .AddCors((options) =>
    {
        options.AddPolicy(corsPolicyName, (policyBuilder) =>
        {
            policyBuilder.WithOrigins([
                "http://localhost:5173"
            ]);
            policyBuilder.AllowAnyHeader();
            policyBuilder.AllowAnyMethod();
        });
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(corsPolicyName);

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
