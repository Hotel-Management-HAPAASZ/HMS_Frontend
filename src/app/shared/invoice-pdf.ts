import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// --- helpers ---
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Embed /assets/Designer.png (or any image at that path). Tries PNG then JPG.
async function tryEmbedLogo(pdfDoc: PDFDocument, pageWidth: number, pageHeight: number) {
  try {
    const res = await fetch('assets/Designer.png');
    if (!res.ok) throw new Error(`Logo HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    const bytes = new Uint8Array(await res.arrayBuffer());

    let img: any;
    if (ct.includes('png')) {
      img = await pdfDoc.embedPng(bytes);
    } else if (ct.includes('jpeg') || ct.includes('jpg')) {
      img = await pdfDoc.embedJpg(bytes);
    } else {
      try { img = await pdfDoc.embedPng(bytes); }
      catch { img = await pdfDoc.embedJpg(bytes); }
    }

    const logoWidth = 90;
    const scale = logoWidth / img.width;
    const logoHeight = img.height * scale;

    return {
      draw: (xPad = 40, yPad = 20) => {
        const x = pageWidth - logoWidth - xPad;
        const y = pageHeight - logoHeight - yPad;
        return { x, y, width: logoWidth, height: logoHeight, img };
      }
    };
  } catch (e) {
    console.warn('[invoice-pdf] logo not found or failed to embed:', e);
    return null;
  }
}

export async function generateInvoicePdf(invoice: {
  invoiceNumber?: string|number;
  bookingId?: string|number; // kept for compatibility but not printed
  hotelName?: string;
  hotelAddress?: string;
  hotelEmail?: string;
  hotelSupportNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: any[];
  baseAmount?: number|string;
  taxAmount?: number|string;
  serviceCharges?: number|string;
  totalAmount?: number|string;
  paymentMethod?: string;
  transactionId?: string;
  /** Room numbers to print at the top */
  roomNumbers?: (string|number)[];
}): Promise<Blob> {
  const pageWidth = 600;
  const pageHeight = 780;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // ---- Fonts: try Unicode TTF; fallback to Helvetica & swap ₹ -> INR ----
  let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let rupee = '₹';
  try {
    const notoBytes = await fetchBytes('assets/fonts/NotoSans-Regular.ttf');
    font = await pdfDoc.embedFont(notoBytes, { subset: true });
    bold = font;
  } catch (e) {
    console.warn('[invoice-pdf] Unicode font missing; falling back to Helvetica. Replacing ₹ with INR.', e);
    rupee = 'INR ';
  }

  // ---- Optional logo ----
  const logo = await tryEmbedLogo(pdfDoc, pageWidth, pageHeight);
  if (logo) {
    const { img, x, y, width, height } = logo.draw();
    page.drawImage(img, { x, y, width, height });
  }

  let y = 750;

  // HEADER
  page.drawText(String(invoice.hotelName || 'Hotel'), { x: 40, y, size: 20, font: bold, color: rgb(0, 0, 0) });
  y -= 25;
  if (invoice.hotelAddress) { page.drawText(String(invoice.hotelAddress), { x: 40, y, size: 12, font }); y -= 15; }
  page.drawText(`Email: ${invoice.hotelEmail ?? '-'}`, { x: 40, y, size: 12, font }); y -= 15;
  page.drawText(`Support: ${invoice.hotelSupportNumber ?? '-'}`, { x: 40, y, size: 12, font }); y -= 30;

  // TITLE
  page.drawText('INVOICE', { x: 250, y, size: 22, font: bold });
  y -= 40;

  // BASIC INFO
  page.drawText(`Invoice #: ${invoice.invoiceNumber ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;

  // Print Room No instead of Booking ID
  const roomNoText = Array.isArray(invoice.roomNumbers) && invoice.roomNumbers.length
    ? String(invoice.roomNumbers.join(', '))
    : '-';
  page.drawText(`Room No: ${roomNoText}`, { x: 40, y, size: 12, font });
  y -= 15;

  page.drawText(`Payment Method: ${invoice.paymentMethod ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;
  page.drawText(`Transaction ID: ${invoice.transactionId ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 30;

  // CUSTOMER
  page.drawText('Customer Details', { x: 40, y, size: 14, font: bold });
  y -= 20;
  page.drawText(`Name: ${invoice.customerName ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;
  page.drawText(`Email: ${invoice.customerEmail ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;
  page.drawText(`Mobile: ${invoice.customerMobile ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 30;

  // STAY
  page.drawText('Stay', { x: 40, y, size: 14, font: bold });
  y -= 20;
  page.drawText(`Check-in: ${invoice.checkInDate ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;
  page.drawText(`Check-out: ${invoice.checkOutDate ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 30;

  // ROOMS
  page.drawText('Rooms', { x: 40, y, size: 14, font: bold });
  y -= 20;
  if (Array.isArray(invoice.rooms)) {
    invoice.rooms.forEach((r: any) => {
      const price = r?.roomPrice ?? '-';
      const type  = r?.roomType ?? '-';

      // robust room number detection
      const num =
        r?.roomNumber ?? r?.roomNo ?? r?.number ?? r?.no ??
        r?.room?.roomNumber ?? r?.room?.roomNo ?? r?.room?.number ?? r?.room?.no;

      const numText = num ? ` (No: ${num})` : '';
      page.drawText(`• ${type}${numText}  |  ${rupee}${price}`, { x: 50, y, size: 12, font });
      y -= 15;
    });
  }
  y -= 25;

  // PRICING
  page.drawText('Pricing Summary', { x: 40, y, size: 14, font: bold });
  y -= 20;

  page.drawText(`Base Amount: ${rupee}${invoice.baseAmount ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;
  page.drawText(`Tax: ${rupee}${invoice.taxAmount ?? '-'}`, { x: 40, y, size: 12, font });
  y -= 15;

  // serviceCharges is already forced to 0 by caller for now
  page.drawText(`Service Charges: ${rupee}${invoice.serviceCharges ?? 0}`, { x: 40, y, size: 12, font });
  y -= 20;

  page.drawText(`Total: ${rupee}${invoice.totalAmount ?? '-'}`, { x: 40, y, size: 14, font: bold });

  const pdfBytes = await pdfDoc.save();
  const clean = new Uint8Array(pdfBytes);
  return new Blob([clean.buffer], { type: 'application/pdf' });
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
