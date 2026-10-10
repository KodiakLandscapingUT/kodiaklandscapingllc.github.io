using System.Globalization;
using System.Text;
using System.Text.Json;
using api.Infrastructure;
using Google.Cloud.Firestore;

namespace api.Services;

public sealed record PdfTemplate(
    string Id,
    string Name,
    string Lang,
    bool Active,
    double Order,
    long Size,
    int PageCount,
    string UploadedByEmail,
    string? UpdatedAt);

[FirestoreData(UnknownPropertyHandling = UnknownPropertyHandling.Ignore)]
public sealed class StoredTemplate
{
    [FirestoreProperty("name")] public string Name { get; set; } = "";
    [FirestoreProperty("lang")] public string Lang { get; set; } = "";
    [FirestoreProperty("active")] public bool Active { get; set; }
    [FirestoreProperty("order")] public double Order { get; set; }
    [FirestoreProperty("size")] public long Size { get; set; }
    [FirestoreProperty("pageCount")] public int PageCount { get; set; }
    [FirestoreProperty("chunkCount")] public int ChunkCount { get; set; }
    [FirestoreProperty("uploadedByUid")] public string UploadedByUid { get; set; } = "";
    [FirestoreProperty("uploadedByEmail")] public string UploadedByEmail { get; set; } = "";
    [FirestoreProperty("createdAt")] public Timestamp? CreatedAt { get; set; }
    [FirestoreProperty("updatedAt")] public Timestamp? UpdatedAt { get; set; }
}

public sealed record NewTemplate(
    string Name,
    string Lang,
    bool Active,
    double Order,
    int PageCount,
    byte[] Bytes,
    string UploadedByUid,
    string UploadedByEmail);

public sealed record TemplatePatch(string? Name, string? Lang, bool? Active, double? Order)
{
    public bool IsEmpty => Name is null && Lang is null && Active is null && Order is null;
}

public sealed class PdfTemplateStore(FirebaseClients firebase)
{
    public static readonly string[] Languages = ["en", "es", "both"];

    // A Firestore document is capped at 1 MiB, so file bytes are stored base64 in
    // chunk documents rather than on the template document itself.
    private const int ChunkLength = 500_000;

    public static List<string> EncodeChunks(byte[] bytes)
    {
        var encoded = Convert.ToBase64String(bytes);
        var parts = new List<string>();
        for (var i = 0; i < encoded.Length; i += ChunkLength)
        {
            parts.Add(encoded.Substring(i, Math.Min(ChunkLength, encoded.Length - i)));
        }
        return parts;
    }

    // Returns null when a chunk is missing, i.e. a partial or corrupted upload.
    public static byte[]? DecodeChunks(IReadOnlyDictionary<int, string> byIndex, int chunkCount)
    {
        var encoded = new StringBuilder();
        for (var index = 0; index < chunkCount; index++)
        {
            if (!byIndex.TryGetValue(index, out var part)) return null;
            encoded.Append(part);
        }
        return Convert.FromBase64String(encoded.ToString());
    }

    private CollectionReference Templates => firebase.Db.Collection("pdfTemplates");

    private static PdfTemplate PublicTemplate(string id, StoredTemplate stored) => new(
        id,
        stored.Name,
        stored.Lang,
        stored.Active,
        stored.Order,
        stored.Size,
        stored.PageCount,
        stored.UploadedByEmail,
        stored.UpdatedAt is { } updatedAt ? DateTime.UtcNow.ToString("o") : null);

    // Queried unfiltered and sorted in memory: the collection is small, and this
    // avoids requiring a composite Firestore index for lang + active + order.
    public async Task<List<PdfTemplate>> ListAsync(string? activeForLanguage = null)
    {
        var snapshot = await Templates.GetSnapshotAsync();
        return snapshot.Documents
            .Select(doc => PublicTemplate(doc.Id, doc.ConvertTo<StoredTemplate>()))
            .Where(template => activeForLanguage is null ||
                (template.Active && (template.Lang == "both" || template.Lang == activeForLanguage)))
            .OrderBy(template => template.Order)
            .ThenBy(template => template.Name, StringComparer.Create(CultureInfo.InvariantCulture, false))
            .ToList();
    }

    public async Task<PdfTemplate> CreateAsync(NewTemplate input)
    {
        var parts = EncodeChunks(input.Bytes);

        var reference = Templates.Document();
        var batch = firebase.Db.StartBatch();
        batch.Set(reference, new Dictionary<string, object>
        {
            ["name"] = input.Name,
            ["lang"] = input.Lang,
            ["active"] = input.Active,
            ["order"] = Convert.ToDouble(input.Order),
            ["size"] = input.Bytes.LongLength,
            ["pageCount"] = input.PageCount,
            ["chunkCount"] = parts.Count,
            ["uploadedByUid"] = input.UploadedByUid,
            ["uploadedByEmail"] = input.UploadedByEmail,
            ["createdAt"] = FieldValue.ServerTimestamp,
            ["updatedAt"] = FieldValue.ServerTimestamp,
        });
        for (var index = 0; index < parts.Count; index++)
        {
            batch.Set(reference.Collection("chunks").Document(index.ToString(CultureInfo.InvariantCulture)),
                new Dictionary<string, object> { ["data"] = parts[index] });
        }
        await batch.CommitAsync();

        var created = await reference.GetSnapshotAsync();
        return PublicTemplate(reference.Id, created.ConvertTo<StoredTemplate>());
    }

    public async Task<PdfTemplate?> UpdateAsync(string id, TemplatePatch patch)
    {
        var reference = Templates.Document(id);
        if (!(await reference.GetSnapshotAsync()).Exists) return null;

        var updates = new Dictionary<string, object> { ["updatedAt"] = FieldValue.ServerTimestamp };
        if (patch.Name is not null) updates["name"] = patch.Name;
        if (patch.Lang is not null) updates["lang"] = patch.Lang;
        if (patch.Active is { } active) updates["active"] = active;
        if (patch.Order is { } order) updates["order"] = Convert.ToDouble(order);
        await reference.UpdateAsync(updates);

        var updated = await reference.GetSnapshotAsync();
        return PublicTemplate(id, updated.ConvertTo<StoredTemplate>());
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var reference = Templates.Document(id);
        if (!(await reference.GetSnapshotAsync()).Exists) return false;

        var stored = await reference.Collection("chunks").GetSnapshotAsync();
        var batch = firebase.Db.StartBatch();
        foreach (var chunk in stored.Documents) batch.Delete(chunk.Reference);
        batch.Delete(reference);
        await batch.CommitAsync();
        return true;
    }

    public async Task<byte[]?> ReadBytesAsync(string id)
    {
        var reference = Templates.Document(id);
        var doc = await reference.GetSnapshotAsync();
        if (!doc.Exists) return null;

        var chunkCount = doc.ConvertTo<StoredTemplate>().ChunkCount;
        var stored = await reference.Collection("chunks").GetSnapshotAsync();
        var byIndex = new Dictionary<int, string>();
        foreach (var chunk in stored.Documents)
        {
            if (int.TryParse(chunk.Id, NumberStyles.None, CultureInfo.InvariantCulture, out var index))
            {
                byIndex[index] = JsonSerializer.Serialize(chunk.GetValue<object?>("data"));
            }
        }
        return DecodeChunks(byIndex, chunkCount);
    }
}
