using System.Text.Json;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;

namespace api.Services;

/// <summary>
/// Firebase Auth and Firestore clients built from FIREBASE_SERVICE_ACCOUNT_JSON.
/// Created on first use, so endpoints that never touch Firebase work without it.
/// </summary>
public sealed class FirebaseClients
{
    private readonly Lazy<FirestoreDb> _db;
    private readonly Lazy<FirebaseAuth> _auth;

    public FirebaseClients(IConfiguration configuration)
    {
        var account = new Lazy<(GoogleCredential Credential, string ProjectId)>(() => LoadServiceAccount(configuration));

        _db = new Lazy<FirestoreDb>(() => new FirestoreDbBuilder
        {
            ProjectId = account.Value.ProjectId,
            GoogleCredential = account.Value.Credential,
        }.Build());

        _auth = new Lazy<FirebaseAuth>(() => FirebaseAuth.GetAuth(FirebaseApp.Create(new AppOptions
        {
            Credential = account.Value.Credential,
            ProjectId = account.Value.ProjectId,
        }, nameof(FirebaseClients))));
    }

    public FirestoreDb Db => _db.Value;

    public FirebaseAuth Auth => _auth.Value;

    private static (GoogleCredential, string) LoadServiceAccount(IConfiguration configuration)
    {
        var raw = configuration["FIREBASE_SERVICE_ACCOUNT_JSON"];
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");

        string projectId;
        try
        {
            using var document = JsonDocument.Parse(raw);
            projectId = document.RootElement.GetProperty("project_id").GetString()
                ?? throw new InvalidOperationException("FIREBASE_SERVICE_ACCOUNT_JSON has no project_id");
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            throw new InvalidOperationException("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON", ex);
        }

        var credential = CredentialFactory.FromJson<ServiceAccountCredential>(raw).ToGoogleCredential();
        return (credential, projectId);
    }
}
