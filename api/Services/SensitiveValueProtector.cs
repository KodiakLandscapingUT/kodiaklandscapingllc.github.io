using System.Security.Cryptography;
using System.Text;
using Google.Cloud.Firestore;

namespace api.Services;

[FirestoreData(UnknownPropertyHandling = UnknownPropertyHandling.Ignore)]
public sealed class EncryptedValue
{
    [FirestoreProperty("algorithm")] public string Algorithm { get; set; } = SensitiveValueProtector.Algorithm;
    [FirestoreProperty("ciphertext")] public string Ciphertext { get; set; } = "";
    [FirestoreProperty("iv")] public string Iv { get; set; } = "";
    [FirestoreProperty("tag")] public string Tag { get; set; } = "";
}

/// <summary>
/// AES-256-GCM with a 12-byte IV and 16-byte tag, base64 encoded — the same
/// format the Node server wrote, so existing ciphertext stays readable.
/// </summary>
public sealed class SensitiveValueProtector(IConfiguration configuration)
{
    public const string Algorithm = "aes-256-gcm";
    private const int IvLength = 12;
    private const int TagLength = 16;

    public EncryptedValue Encrypt(string value)
    {
        var iv = RandomNumberGenerator.GetBytes(IvLength);
        var plaintext = Encoding.UTF8.GetBytes(value);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagLength];

        using var aes = new AesGcm(GetKey(), TagLength);
        aes.Encrypt(iv, plaintext, ciphertext, tag);

        return new EncryptedValue
        {
            Ciphertext = Convert.ToBase64String(ciphertext),
            Iv = Convert.ToBase64String(iv),
            Tag = Convert.ToBase64String(tag),
        };
    }

    public string Decrypt(EncryptedValue value)
    {
        var ciphertext = Convert.FromBase64String(value.Ciphertext);
        var plaintext = new byte[ciphertext.Length];

        using var aes = new AesGcm(GetKey(), TagLength);
        aes.Decrypt(Convert.FromBase64String(value.Iv), ciphertext, Convert.FromBase64String(value.Tag), plaintext);
        return Encoding.UTF8.GetString(plaintext);
    }

    public static string? Mask(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var visible = value.Length <= 4 ? value : value[^4..];
        return new string('•', Math.Max(4, value.Length - 4)) + visible;
    }

    private byte[] GetKey()
    {
        var encoded = configuration["APPLICATION_ENCRYPTION_KEY"];
        if (string.IsNullOrEmpty(encoded))
            throw new InvalidOperationException("APPLICATION_ENCRYPTION_KEY is not configured");

        byte[] key;
        try
        {
            key = Convert.FromBase64String(encoded);
        }
        catch (FormatException)
        {
            key = [];
        }
        if (key.Length != 32)
            throw new InvalidOperationException("APPLICATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
        return key;
    }
}
