using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace api.Services;

public static class PdfFiles
{
    /// <summary>Throws when the bytes cannot be opened as a PDF.</summary>
    public static int CountPages(byte[] bytes)
    {
        using var document = Open(bytes);
        return document.PageCount;
    }

    /// <summary>Throws, leaving the target untouched, when the source cannot be opened.</summary>
    public static void AppendPages(PdfDocument target, byte[] source)
    {
        using var document = Open(source);
        foreach (var page in document.Pages) target.AddPage(page);
    }

    public static byte[] Save(PdfDocument document)
    {
        using var output = new MemoryStream();
        document.Save(output, false);
        return output.ToArray();
    }

    private static PdfDocument Open(byte[] bytes) => PdfReader.Open(new MemoryStream(bytes), PdfDocumentOpenMode.Import);
}
