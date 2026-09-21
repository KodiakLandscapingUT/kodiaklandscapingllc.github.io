import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { ApplicationData } from '../App.tsx';

const translations = {
  en: {
    profile: 'Employee Profile',
    name: 'Full Name',
    address: 'Address',
    city: 'City / State / ZIP',
    phone: 'Phone',
    email: 'Email',
    emergency: 'Emergency Contact',
    relation: 'Relationship',
    position: 'Position',
    startDate: 'Available Start Date',
    h2bStatus: 'H-2B Worker',
    yes: 'Yes',
    no: 'No',
    h2bAgreement: 'H-2B Worker Agreement',
    h2bText: 'I understand the terms of the H-2B employment program as provided by Kodiak Landscaping and Construction. I acknowledge that specific forms and official documents (including SSN, I-9, and passport details) will be collected securely in-person.',
    signature: 'Applicant Signature',
    date: 'Date',
  },
  es: {
    profile: 'Perfil del Empleado',
    name: 'Nombre Completo',
    address: 'Dirección',
    city: 'Ciudad / Estado / Código Postal',
    phone: 'Teléfono',
    email: 'Correo Electrónico',
    emergency: 'Contacto de Emergencia',
    relation: 'Relación',
    position: 'Puesto',
    startDate: 'Fecha de Inicio Disponible',
    h2bStatus: 'Trabajador H-2B',
    yes: 'Sí',
    no: 'No',
    h2bAgreement: 'Acuerdo de Trabajador H-2B',
    h2bText: 'Entiendo los términos del programa de empleo H-2B proporcionados por Kodiak Landscaping and Construction. Reconozco que los formularios específicos y los documentos oficiales (incluidos SSN, I-9 y detalles del pasaporte) se recopilarán de forma segura en persona.',
    signature: 'Firma del Solicitante',
    date: 'Fecha',
  }
};

export async function generateProfilePDF(data: ApplicationData, lang: 'en' | 'es'): Promise<Uint8Array> {
  const t = translations[lang];
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  
  let y = height - 50;
  
  const drawText = (text: string, x: number, isBold = false, size = 11) => {
    page.drawText(text, { x, y, size, font: isBold ? boldFont : font });
  };

  const drawRow = (label: string, value: string) => {
    drawText(label + ':', 50, true);
    drawText(value, 200, false);
    y -= 25;
  };

  // Header
  drawText('KODIAK LANDSCAPING AND CONSTRUCTION', 50, true, 16);
  y -= 30;
  drawText(t.profile, 50, true, 14);
  y -= 40;

  // Profile Data
  drawRow(t.name, `${data.firstName} ${data.lastName}`);
  drawRow(t.address, data.streetAddress);
  drawRow(t.city, `${data.city}, ${data.state} ${data.zip}`);
  drawRow(t.phone, data.phone);
  drawRow(t.email, data.email);
  drawRow(t.position, data.position);
  drawRow(t.startDate, data.startDate);
  
  y -= 15;
  drawText(t.emergency, 50, true, 14);
  y -= 30;
  drawRow(t.name, data.emergencyName);
  drawRow(t.relation, data.emergencyRelation);
  drawRow(t.phone, data.emergencyPhone);

  y -= 15;
  drawText(t.h2bAgreement, 50, true, 14);
  y -= 30;
  drawRow(t.h2bStatus, data.isH2b ? t.yes : t.no);

  if (data.isH2b) {
    y -= 10;
    // Poor man's text wrapping for the agreement
    const words = t.h2bText.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 80) {
        drawText(line, 50, false, 10);
        y -= 15;
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    drawText(line, 50, false, 10);
    y -= 40;
  }

  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 300, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: 350, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  y -= 15;
  drawText(t.signature, 50, false, 10);
  drawText(t.date, 350, false, 10);

  return pdfDoc.save();
}

export async function mergePDFs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const pdfBytes of pdfs) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }
  return mergedPdf.save();
}
