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
  const boxGap = 5;
  const boxWidth = (pageWidth - margin * 2 - boxGap) / 2;
  const boxHeight = 35;
  const qrSize = 30;
  const dividerX = boxWidth / 2;

  let currentY = margin;
  let pageNumber = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLeftBox = i % 2 === 0;

    // Add new page if needed (check before adding left box)
    if (isLeftBox && currentY + boxHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      pageNumber++;
    }

    // Calculate box X position
    const boxX = isLeftBox ? margin : margin + boxWidth + boxGap;

    // Draw rounded rectangle box
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(boxX, currentY, boxWidth, boxHeight, 3, 3);

    // Draw vertical divider
    pdf.line(boxX + dividerX, currentY, boxX + dividerX, currentY + boxHeight);

    // Left side - Item info
    const leftContentX = boxX + 3;
    const contentStartY = currentY + 10;

    // Item name
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    const itemNameLines = pdf.splitTextToSize(item.title, dividerX - 8);
    pdf.text(itemNameLines, leftContentX, contentStartY);

    // Username
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const usernameY = contentStartY + itemNameLines.length * 4 + 3;
    pdf.text(`@${username}`, leftContentX, usernameY);

    // Right side - QR code
    const qrCodeUrl = `${window.location.origin}/qr/item/${item.id}`;

    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Calculate QR code position (centered in right half)
      const qrX = boxX + dividerX + (dividerX - qrSize) / 2;
      const qrY = currentY + (boxHeight - qrSize) / 2;

      // Add QR code image to PDF
      pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error("Error generating QR code for item:", item.id, error);
      // Continue with next item even if QR generation fails
    }

    // Move to next box position (only after right box)
    if (!isLeftBox) {
      currentY += boxHeight + 5;
    }
  }

  // Save the PDF
  const filename = `library-of-stuff-qr-codes-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
}
