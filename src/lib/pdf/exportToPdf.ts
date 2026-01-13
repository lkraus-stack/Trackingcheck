import jsPDF from 'jspdf';
import { AnalysisResult } from '@/types';

export async function exportAnalysisToPDF(result: AnalysisResult): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Tracking & Compliance Report', margin, yPos);
  yPos += 10;

  // URL and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`URL: ${result.url}`, margin, yPos);
  yPos += 5;
  doc.text(`Analysiert am: ${new Date(result.timestamp).toLocaleString('de-DE')}`, margin, yPos);
  yPos += 10;

  // Score
  checkPageBreak(20);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance Score', margin, yPos);
  yPos += 8;
  doc.setFontSize(32);
  const scoreColor = result.score >= 80 ? [46, 125, 50] : result.score >= 50 ? [237, 108, 2] : [211, 47, 47];
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${result.score}/100`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Cookie Banner Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cookie Banner', margin, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Erkannt: ${result.cookieBanner.detected ? 'Ja' : 'Nein'}`, margin, yPos);
  yPos += 5;
  if (result.cookieBanner.provider) {
    doc.text(`Provider: ${result.cookieBanner.provider}`, margin, yPos);
    yPos += 5;
  }
  doc.text(`Akzeptieren-Button: ${result.cookieBanner.hasAcceptButton ? 'Ja' : 'Nein'}`, margin, yPos);
  yPos += 5;
  doc.text(`Ablehnen-Button: ${result.cookieBanner.hasRejectButton ? 'Ja' : 'Nein'}`, margin, yPos);
  yPos += 5;
  doc.text(`Einstellungen: ${result.cookieBanner.hasSettingsOption ? 'Ja' : 'Nein'}`, margin, yPos);
  yPos += 10;

  // Google Consent Mode
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Google Consent Mode', margin, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Erkannt: ${result.googleConsentMode.detected ? 'Ja' : 'Nein'}`, margin, yPos);
  yPos += 5;
  if (result.googleConsentMode.version) {
    doc.text(`Version: ${result.googleConsentMode.version}`, margin, yPos);
    yPos += 5;
  }
  doc.text('Parameter:', margin, yPos);
  yPos += 5;
  Object.entries(result.googleConsentMode.parameters).forEach(([key, value]) => {
    doc.text(`  • ${key}: ${value ? '✓' : '✗'}`, margin + 5, yPos);
    yPos += 5;
  });
  yPos += 5;

  // TCF
  if (result.tcf.detected) {
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('IAB TCF', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Erkannt: Ja`, margin, yPos);
    yPos += 5;
    if (result.tcf.version) {
      doc.text(`Version: ${result.tcf.version}`, margin, yPos);
      yPos += 5;
    }
    if (result.tcf.cmpName) {
      doc.text(`CMP: ${result.tcf.cmpName}`, margin, yPos);
      yPos += 5;
    }
    doc.text(`Gültiger TC String: ${result.tcf.validTcString ? 'Ja' : 'Nein'}`, margin, yPos);
    yPos += 10;
  }

  // Tracking Tags
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tracking Tags', margin, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const trackingTags = [
    { name: 'Google Analytics', detected: result.trackingTags.googleAnalytics.detected, id: result.trackingTags.googleAnalytics.measurementId },
    { name: 'Google Tag Manager', detected: result.trackingTags.googleTagManager.detected, id: result.trackingTags.googleTagManager.containerId },
    { name: 'Meta Pixel', detected: result.trackingTags.metaPixel.detected, id: result.trackingTags.metaPixel.pixelId },
    { name: 'LinkedIn Insight', detected: result.trackingTags.linkedInInsight.detected, id: result.trackingTags.linkedInInsight.partnerId },
    { name: 'TikTok Pixel', detected: result.trackingTags.tiktokPixel.detected, id: result.trackingTags.tiktokPixel.pixelId },
  ];

  trackingTags.forEach(tag => {
    if (tag.detected) {
      doc.text(`✓ ${tag.name}${tag.id ? ` (${tag.id})` : ''}`, margin, yPos);
      yPos += 5;
    }
  });

  if (result.trackingTags.other.length > 0) {
    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Weitere erkannte Services:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    result.trackingTags.other.forEach(tag => {
      doc.text(`  • ${tag.name}`, margin + 5, yPos);
      yPos += 5;
    });
  }
  yPos += 10;

  // Cookies Summary
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cookies', margin, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gesamt: ${result.cookies.length}`, margin, yPos);
  yPos += 5;

  const cookieCategories = {
    necessary: result.cookies.filter(c => c.category === 'necessary').length,
    functional: result.cookies.filter(c => c.category === 'functional').length,
    analytics: result.cookies.filter(c => c.category === 'analytics').length,
    marketing: result.cookies.filter(c => c.category === 'marketing').length,
  };

  doc.text(`Notwendig: ${cookieCategories.necessary}`, margin, yPos);
  yPos += 5;
  doc.text(`Funktional: ${cookieCategories.functional}`, margin, yPos);
  yPos += 5;
  doc.text(`Analytics: ${cookieCategories.analytics}`, margin, yPos);
  yPos += 5;
  doc.text(`Marketing: ${cookieCategories.marketing}`, margin, yPos);
  yPos += 10;

  // Issues
  if (result.issues.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Probleme & Empfehlungen', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    result.issues.forEach((issue, index) => {
      checkPageBreak(15);
      const severityColor = issue.severity === 'error' ? [211, 47, 47] : issue.severity === 'warning' ? [237, 108, 2] : [25, 118, 210];
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${issue.title}`, margin, yPos);
      yPos += 5;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(issue.description, pageWidth - 2 * margin);
      doc.text(descriptionLines, margin, yPos);
      yPos += descriptionLines.length * 5;
      if (issue.recommendation) {
        doc.setFont('helvetica', 'italic');
        doc.text(`💡 ${issue.recommendation}`, margin + 5, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
      }
      yPos += 5;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Seite ${i} von ${totalPages} | Tracking Checker Report`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Erstellt am ${new Date().toLocaleString('de-DE')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `tracking-report-${result.url.replace(/https?:\/\//, '').replace(/\//g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
}
