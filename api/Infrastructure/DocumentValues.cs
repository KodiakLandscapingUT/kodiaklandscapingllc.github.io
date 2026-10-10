using System.Globalization;
using Google.Cloud.Firestore;

namespace api.Infrastructure;

public static class DocumentValues
{
    public static string Text(this IReadOnlyDictionary<string, object> data, string key, string fallback = "") =>
        data.TryGetValue(key, out var value) ? Convert.ToString(value, CultureInfo.InvariantCulture) ?? fallback : fallback;
    public static string? NullableText(this IReadOnlyDictionary<string, object> data, string key) =>
        data.TryGetValue(key, out var value) && value is not null ? Convert.ToString(value, CultureInfo.InvariantCulture) : null;
    public static bool Flag(this IReadOnlyDictionary<string, object> data, string key) =>
        data.TryGetValue(key, out var value) && value is true;
    public static IReadOnlyDictionary<string, object> Map(this IReadOnlyDictionary<string, object> data, string key) =>
        data.TryGetValue(key, out var value) && value is IReadOnlyDictionary<string, object> map
            ? map : new Dictionary<string, object>();
    public static string Iso(DateTime value) => value.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
    public static DateTime Date(object value) => value switch
    {
        Timestamp timestamp => timestamp.ToDateTime(),
        DateTime date => date.ToUniversalTime(),
        DateTimeOffset date => date.UtcDateTime,
        string text => DateTime.Parse(text, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal),
        _ => throw new ApiException(500, "Stored application date is invalid")
    };
}
