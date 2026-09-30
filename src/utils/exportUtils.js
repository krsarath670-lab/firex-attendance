import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data array to Excel (.xlsx)
 */
export function exportToExcel(data, fileName = 'FIREX-Attendance-Report') {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Export data array to CSV (.csv)
 */
export function exportToCSV(data, fileName = 'FIREX-Attendance-Report') {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export formatted PDF report with FIREX Branding header and table
 */
export function exportToPDF({ title, subtitle, columns, rows, fileName = 'FIREX-Attendance-Report' }) {
  const doc = new jsPDF('landscape');

  // Header background
  doc.setFillColor(183, 28, 28); // FIREX Dark Red
  doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');

  // Brand title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FIREX ATTENDANCE MANAGEMENT SYSTEM', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Labour Attendance & Workforce Verification | Bahrain', 14, 18);

  // Document metadata
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 40);
  }

  const generatedDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bahrain' });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${generatedDate} (Bahrain Time)`, doc.internal.pageSize.width - 14, 34, { align: 'right' });

  // AutoTable
  doc.autoTable({
    startY: subtitle ? 45 : 38,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38], // FIREX Red
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FIREX Fire & Safety Service • Confidential Attendance Record • Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }

  doc.save(`${fileName}.pdf`);
}
