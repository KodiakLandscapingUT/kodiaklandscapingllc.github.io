using System.Globalization;
using api.Dtos.Read;
using api.Infrastructure;

namespace api.Domain.Shared;

internal static class ApplicationReadMapper
{
    public static ApplicationReadDto Map(StoredDocument document)
    {
        var data = document.Data;
        var masks = data.Map("sensitiveMasks");
        return new(document.Id, DocumentValues.Iso(DocumentValues.Date(data["submittedAt"])),
            data.Text("firstName"), data.Text("lastName"), data.Text("phone"), data.Text("email"),
            data.Text("streetAddress"), data.Text("city"), data.Text("state"), data.Text("zip"),
            data.Text("emergencyName"), data.Text("emergencyRelation"), data.Text("emergencyPhone"),
            data.Text("position"), DocumentValues.Date(data["startDate"]).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            data.Flag("isH2b"), data.Flag("canLift"), data.Flag("understandsWork"), data.Flag("consent"),
            masks.NullableText("ssn"), masks.NullableText("passportNumber"));
    }
}
