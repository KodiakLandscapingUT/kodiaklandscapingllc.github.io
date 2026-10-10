using System.Collections.Concurrent;
using Google.Cloud.Firestore;

namespace api.Services;

/// <summary>
/// The IRS serves the W-4 without CORS headers, so the browser cannot fetch it
/// directly — the request is proxied (and cached) here instead.
/// </summary>
public sealed class W4FormProxy(IHttpClientFactory httpClientFactory, FirebaseClients firebase, ILogger<W4FormProxy> logger)
{
    public static readonly IReadOnlyDictionary<string, string> Urls = new Dictionary<string, string>
    {
        ["en"] = "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
        ["es"] = "https://www.irs.gov/pub/irs-pdf/fw4sp.pdf",
    };

    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(12);
    private readonly ConcurrentDictionary<string, (byte[] Body, DateTimeOffset FetchedAt)> _cache = new();

    /// <summary>Returns null when the IRS could not be reached; the failure is recorded.</summary>
    public async Task<byte[]?> GetAsync(string lang)
    {
        if (_cache.TryGetValue(lang, out var cached) && DateTimeOffset.UtcNow - cached.FetchedAt < CacheTtl)
        {
            return cached.Body;
        }

        var url = Urls[lang];
        HttpResponseMessage response;
        try
        {
            response = await httpClientFactory.CreateClient().GetAsync(url);
        }
        catch (Exception ex)
        {
            await RecordFetchFailureAsync(lang, url, null, ex.Message);
            return null;
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                await RecordFetchFailureAsync(lang, url, status, $"IRS responded with {status} {response.ReasonPhrase}");
                return null;
            }

            var body = await response.Content.ReadAsByteArrayAsync();
            _cache[lang] = (body, DateTimeOffset.UtcNow);
            return body;
        }
    }

    // Failures are recorded for later review rather than surfaced to the applicant.
    private async Task RecordFetchFailureAsync(string lang, string url, int? status, string message)
    {
        logger.LogError("W-4 fetch failed: {Lang} {Url} {Status} {Message}", lang, url, status, message);
        try
        {
            var details = new Dictionary<string, object>
            {
                ["lang"] = lang,
                ["url"] = url,
                ["message"] = message,
                ["failedAt"] = FieldValue.ServerTimestamp,
            };
            if (status is { } code) details["status"] = code;
            await firebase.Db.Collection("w4FetchErrors").AddAsync(details);
        }
        catch (Exception ex)
        {
            // Never let the audit write mask the original failure.
            logger.LogError(ex, "Could not record W-4 fetch failure");
        }
    }
}
