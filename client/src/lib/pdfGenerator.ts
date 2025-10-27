import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Item } from "@shared/schema";

export async function generateQRCodesPDF(items: Item[], username: string) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const boxWidth = pageWidth - (margin * 2);
  const boxHeight = 50;
  const qrSize = 40;
  const dividerX = boxWidth / 2;

  let currentY = margin;
  let pageNumber = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Add new page if needed
    if (currentY + boxHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      pageNumber++;
    }

    // Draw rounded rectangle box
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, currentY, boxWidth, boxHeight, 3, 3);

    // Draw vertical divider
    pdf.line(margin + dividerX, currentY, margin + dividerX, currentY + boxHeight);

    // Left side - Item info
    const leftContentX = margin + 5;
    const contentStartY = currentY + 15;

    // Item name
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    const itemNameLines = pdf.splitTextToSize(item.title, dividerX - 15);
    pdf.text(itemNameLines, leftContentX, contentStartY);

    // Username
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const usernameY = contentStartY + (itemNameLines.length * 6) + 5;
    pdf.text(`@${username}`, leftContentX, usernameY);

    // Right side - QR code
    const qrCodeUrl = `${window.location.origin}/qr/item/${item.id}`;
    
    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Calculate QR code position (centered in right half)
      const qrX = margin + dividerX + (dividerX - qrSize) / 2;
      const qrY = currentY + (boxHeight - qrSize) / 2;

      // Add QR code image to PDF
      pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error("Error generating QR code for item:", item.id, error);
      // Continue with next item even if QR generation fails
    }

    // Move to next box position
    currentY += boxHeight + 10;
  }

  // Save the PDF
  const filename = `library-of-stuff-qr-codes-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
