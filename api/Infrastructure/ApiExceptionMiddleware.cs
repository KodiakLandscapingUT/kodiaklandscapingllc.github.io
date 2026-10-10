using api.Dtos.Read;

namespace api.Infrastructure;

public sealed class ApiException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
        catch (Exception exception)
        {
            if (context.Response.HasStarted) throw;
            var status = exception is ApiException api ? api.StatusCode : 500;
            // Never log credentials, request bodies, revealed values, or SDK exception contents.
            logger.LogError("API failure {Type} on {Method} {Path}; status {Status}",
                exception.GetType().Name, context.Request.Method, context.Request.Path, status);
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new ErrorReadDto(
                exception is ApiException known ? known.Message : "An unexpected server error occurred"));
        }
    }
}
