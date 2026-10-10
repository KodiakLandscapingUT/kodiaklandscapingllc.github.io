using System.Security.Cryptography;
using System.Text;
using api.Infrastructure;

namespace api.Services;

public sealed class SensitiveValueService(IConfiguration configuration)
{
    private byte[] Key()
    {
        try
        {
            var key = Convert.FromBase64String(configuration["APPLICATION_ENCRYPTION_KEY"] ?? "");
            if (key.Length != 32) throw new FormatException();
            return key;
        }
        catch (FormatException) { throw new ApiException(503, "Application encryption is not configured"); }
    }

    // Identical envelope and AES-GCM parameters to the previous Node implementation.
    public Dictionary<string, object> Encrypt(string value)
    {
        var iv = RandomNumberGenerator.GetBytes(12);
        var input = Encoding.UTF8.GetBytes(value);
        var ciphertext = new byte[input.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(Key(), 16);
        aes.Encrypt(iv, input, ciphertext, tag);
        return new()
        {
            ["algorithm"] = "aes-256-gcm", ["iv"] = Convert.ToBase64String(iv),
            ["ciphertext"] = Convert.ToBase64String(ciphertext), ["tag"] = Convert.ToBase64String(tag)
        };
    }

    public string Decrypt(IReadOnlyDictionary<string, object> value)
    {
        if (value.Text("algorithm") != "aes-256-gcm")
            throw new ApiException(500, "Unsupported encrypted value");
        var ciphertext = Convert.FromBase64String(value.Text("ciphertext"));
        var plaintext = new byte[ciphertext.Length];
        using var aes = new AesGcm(Key(), 16);
        aes.Decrypt(Convert.FromBase64String(value.Text("iv")), ciphertext,
            Convert.FromBase64String(value.Text("tag")), plaintext);
        return Encoding.UTF8.GetString(plaintext);
    }

    public static string Mask(string value) => new string('•', Math.Max(4, value.Length - 4)) + value[^Math.Min(4, value.Length)..];
}
