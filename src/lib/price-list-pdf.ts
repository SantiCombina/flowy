import type { PriceListData } from '@/lib/price-list-data';

export class PriceListPdfError extends Error {}

function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function createPriceListPdf(data: PriceListData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 40;
  const gap = 22;
  const columnWidth = (width - margin * 2 - gap) / 2;
  const bottom = height - 60;
  const logoWidth = 73.7;
  let logo: Uint8Array;
  let logoHeight: number;
  try {
    const response = await fetch('/flowy.jpeg');
    if (!response.ok) throw new Error();
    logo = new Uint8Array(await response.arrayBuffer());
    const properties = doc.getImageProperties(logo);
    logoHeight = (logoWidth * properties.height) / properties.width;
  } catch {
    throw new PriceListPdfError('No se pudo cargar el logo de Flowy para la lista de precios');
  }
  const currency = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const title: string[] = doc.splitTextToSize(cleanText(data.businessName), width - margin * 2);
  const headerHeight = 48 + title.length * 22;
  const top = headerHeight + 18;
  if (top + 80 > bottom)
    throw new PriceListPdfError('El nombre del negocio es demasiado largo para la lista de precios');

  function drawPage() {
    doc.addImage(logo, 'JPEG', (width - logoWidth) / 2, height - logoHeight - 14, logoWidth, logoHeight, 'flowy-logo');
    doc.setFillColor('#e8622c');
    doc.rect(0, 0, width, headerHeight, 'F');
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(title, width / 2, 28, { align: 'center', lineHeightFactor: 1.1 });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text(`Lista de precios - ${cleanText(data.date)}`, width / 2, headerHeight - 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#2b2b2b');
    doc.text(`Página ${doc.getNumberOfPages()}`, width - margin, height - 22, {
      align: 'right',
    });
    for (let column = 0; column < 2; column += 1) {
      const x = margin + column * (columnWidth + gap);
      doc.setFillColor('#e8622c');
      doc.rect(x, top, columnWidth, 21, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor('#ffffff');
      doc.text('PRODUCTO', x + 5, top + 14);
      doc.text('PRECIO', x + columnWidth - 5, top + 14, { align: 'right' });
    }
  }

  drawPage();
  let column = 0;
  let y = top + 21;
  let rowIndex = 0;
  if (data.rows.length === 0) {
    doc.setTextColor('#2b2b2b');
    doc.setFont('helvetica', 'normal');
    doc.text('No hay productos para incluir en la lista.', margin, y + 22);
  }
  for (const row of data.rows) {
    const price = `$ ${currency.format(row.price)}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    const priceWidth = Math.max(65, doc.getTextWidth(price) + 10);
    if (!Number.isFinite(row.price) || row.price < 0 || priceWidth > 100) {
      throw new PriceListPdfError('Un precio es demasiado grande o inválido para la lista de precios');
    }
    doc.setFont('helvetica', 'normal');
    const lines: string[] = doc.splitTextToSize(cleanText(row.name), columnWidth - priceWidth - 15);
    const rowHeight = Math.max(16, lines.length * 10.2 + 6);
    if (rowHeight > bottom - top - 21)
      throw new PriceListPdfError('Un nombre de producto es demasiado largo para la lista de precios');
    if (y + rowHeight > bottom) {
      column += 1;
      if (column === 2) {
        doc.addPage();
        drawPage();
        column = 0;
      }
      y = top + 21;
      rowIndex = 0;
    }
    const x = margin + column * (columnWidth + gap);
    if (rowIndex % 2 === 1) {
      doc.setFillColor('#fbefe8');
      doc.rect(x, y, columnWidth, rowHeight, 'F');
    }
    doc.setTextColor('#2b2b2b');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.text(lines, x + 5, y + 11, { lineHeightFactor: 10.2 / 8.3 });
    doc.setFont('helvetica', 'bold');
    doc.text(price, x + columnWidth - 5, y + rowHeight / 2 + 3, {
      align: 'right',
    });
    doc.setDrawColor('#e0e0e0');
    doc.setLineWidth(0.4);
    doc.line(x, y + rowHeight, x + columnWidth, y + rowHeight);
    y += rowHeight;
    rowIndex += 1;
  }
  doc.setProperties({
    title: `Lista de precios - ${cleanText(data.businessName)}`,
  });
  return doc;
}
