# Kodiak API (.NET)

ASP.NET Core Web API that replaces the Express server in `../server`. It serves the
same `/api/*` routes and reads and writes the same Firestore collections.

## Configuration

These settings use the same names as the Node server. They can come from environment
variables, from `dotnet user-secrets`, or from a `.env` file in this folder, which is
gitignored and loaded the same way Node's `--env-file` loads it:

| Setting | Purpose |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service-account JSON on one line |
| `APPLICATION_ENCRYPTION_KEY` | Base64 32-byte AES key. It must be the same key already used, or stored SSNs and passport numbers cannot be decrypted |
| `STAFF_EMAILS` | Comma-separated emails that are always granted admin |
| `PORT` | Optional. Defaults to 5000 (from `launchSettings.json`) |

## Run and test

```sh
dotnet run            # http://localhost:5000, where the Vite dev proxy already points
dotnet test ../api.Tests
```
