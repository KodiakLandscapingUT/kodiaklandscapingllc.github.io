using System.Text.Json;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;

namespace api.Infrastructure;

// Lazy initialization keeps health checks working without credentials. Actual Firebase
// operations fail explicitly when configuration is missing; there is no mock fallback.
public sealed class FirebaseProvider
{
    private readonly Lazy<(FirebaseAuth Auth, FirestoreDb Db)> client = new(CreateClients);
    public FirebaseAuth Auth => client.Value.Auth;
    public FirestoreDb Db => client.Value.Db;

    private static (FirebaseAuth, FirestoreDb) CreateClients()
    {
        var json = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON");
        if (string.IsNullOrWhiteSpace(json))
            throw new ApiException(503, "Firebase is not configured");
        try
        {
            using var parsed = JsonDocument.Parse(json);
            var projectId = parsed.RootElement.GetProperty("project_id").GetString();
            if (string.IsNullOrWhiteSpace(projectId)) throw new FormatException();
            var credential = CredentialFactory.FromJson<ServiceAccountCredential>(json).ToGoogleCredential();
            var app = FirebaseApp.Create(new AppOptions { Credential = credential, ProjectId = projectId });
            var db = new FirestoreDbBuilder { ProjectId = projectId, Credential = credential }.Build();
            return (FirebaseAuth.GetAuth(app), db);
        }
        catch (Exception ex) when (ex is not ApiException)
        {
            throw new ApiException(503, "Firebase configuration is invalid");
        }
    }
}
