import jsPDF from 'jspdf';
import { AnalysisResult } from '@/types';

export interface PDFReportOptions {
  brandName?: string;
  clientName?: string;
  reportTitle?: string;
  contactInfo?: string;
  showTrackingCheckerBranding?: boolean;
}

export async function exportAnalysisToPDF(
  result: AnalysisResult,
  options: PDFReportOptions = {}
): Promise<void> {
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

  const showBranding = options.showTrackingCheckerBranding !== false;
  const title = options.reportTitle ||
    (showBranding ? 'Tracking & Compliance Report' : `${options.brandName || 'Tracking'} Report`);

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPos);
  yPos += 10;

  // URL and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (options.clientName) {
    doc.text(`Client: ${options.clientName}`, margin, yPos);
    yPos += 5;
  }
  doc.text(`URL: ${result.url}`, margin, yPos);
  yPos += 5;
  doc.text(`Analysiert am: ${new Date(result.timestamp).toLocaleString('de-DE')}`, margin, yPos);
  yPos += 10;

  if (!showBranding && options.brandName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Erstellt von: ${options.brandName}`, margin, yPos);
    yPos += 6;
    if (options.contactInfo) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Kontakt: ${options.contactInfo}`, margin, yPos);
      yPos += 8;
    }
  }

  // Score
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance Score', margin, yPos);
  yPos += 8;
  doc.setFontSize(32);
  const scoreColor = result.score >= 80 ? [46, 125, 50] : result.score >= 50 ? [237, 108, 2] : [211, 47, 47];
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${result.score}/100`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  
  // GDPR Score
  if (result.gdprChecklist) {
    doc.setFontSize(12);
    doc.text(`DSGVO: ${result.gdprChecklist.score}%`, margin + 50, yPos);
  }
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

  // Cookie Consent Test
  if (result.cookieConsentTest) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cookie-Consent Test', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const test = result.cookieConsentTest;
    
    if (test.analysis.trackingBeforeConsent) {
      doc.setTextColor(211, 47, 47);
      doc.text('WARNUNG: Tracking-Cookies vor Einwilligung erkannt!', margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
    
    doc.text(`Vor Consent: ${test.beforeConsent.cookieCount} Cookies`, margin, yPos);
    yPos += 5;
    doc.text(`Nach Akzeptieren: ${test.afterAccept.cookieCount} Cookies (+${test.afterAccept.newCookies.length} neue)`, margin, yPos);
    yPos += 5;
    doc.text(`Nach Ablehnen: ${test.afterReject.cookieCount} Cookies (+${test.afterReject.newCookies.length} neue)`, margin, yPos);
    yPos += 5;
    
    if (test.analysis.consentWorksProperly && test.analysis.rejectWorksProperly) {
      doc.setTextColor(46, 125, 50);
      doc.text('Consent-Mechanismus funktioniert korrekt', margin, yPos);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 10;
  }

  // Google Consent Mode
  checkPageBreak(40);
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
  if (result.googleConsentMode.updateConsent?.detected) {
    doc.text(`Update-Funktion: Ja (${result.googleConsentMode.updateConsent.updateTrigger || 'Unbekannt'})`, margin, yPos);
    yPos += 5;
  }
  doc.text('Parameter:', margin, yPos);
  yPos += 5;
  Object.entries(result.googleConsentMode.parameters).forEach(([key, value]) => {
    doc.text(`  ${key}: ${value ? 'Ja' : 'Nein'}`, margin + 5, yPos);
    yPos += 4;
  });
  yPos += 5;

  // TCF
  if (result.tcf.detected) {
    checkPageBreak(25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('IAB TCF', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Version: ${result.tcf.version || 'Unbekannt'}`, margin, yPos);
    yPos += 5;
    if (result.tcf.cmpName) {
      doc.text(`CMP: ${result.tcf.cmpName}`, margin, yPos);
      yPos += 5;
    }
    doc.text(`Gültiger TC String: ${result.tcf.validTcString ? 'Ja' : 'Nein'}`, margin, yPos);
    yPos += 10;
  }

  // Tracking Tags
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tracking Tags', margin, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const trackingTags = [
    { name: 'Google Analytics', detected: result.trackingTags.googleAnalytics.detected, id: result.trackingTags.googleAnalytics.measurementId, version: result.trackingTags.googleAnalytics.version },
    { name: 'Google Tag Manager', detected: result.trackingTags.googleTagManager.detected, id: result.trackingTags.googleTagManager.containerId },
    { name: 'Google Ads', detected: result.trackingTags.googleAdsConversion?.detected, id: result.trackingTags.googleAdsConversion?.conversionId },
    { name: 'Meta Pixel', detected: result.trackingTags.metaPixel.detected, id: result.trackingTags.metaPixel.pixelId },
    { name: 'LinkedIn Insight', detected: result.trackingTags.linkedInInsight.detected, id: result.trackingTags.linkedInInsight.partnerId },
    { name: 'TikTok Pixel', detected: result.trackingTags.tiktokPixel.detected, id: result.trackingTags.tiktokPixel.pixelId },
    { name: 'Pinterest Tag', detected: result.trackingTags.pinterestTag?.detected, id: result.trackingTags.pinterestTag?.tagId },
    { name: 'Snapchat Pixel', detected: result.trackingTags.snapchatPixel?.detected, id: result.trackingTags.snapchatPixel?.pixelId },
    { name: 'Twitter/X Pixel', detected: result.trackingTags.twitterPixel?.detected, id: result.trackingTags.twitterPixel?.pixelId },
    { name: 'Bing Ads', detected: result.trackingTags.bingAds?.detected, id: result.trackingTags.bingAds?.tagId },
  ];

  trackingTags.forEach(tag => {
    if (tag.detected) {
      checkPageBreak(5);
      doc.text(`${tag.name}${tag.id ? ` (${tag.id})` : ''}${tag.version ? ` - ${tag.version}` : ''}`, margin, yPos);
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
      checkPageBreak(5);
      doc.text(`  ${tag.name}`, margin + 5, yPos);
      yPos += 5;
    });
  }

  // Server-Side Tracking
  if (result.trackingTags.serverSideTracking.detected) {
    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Server-Side Tracking:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    const sst = result.trackingTags.serverSideTracking.summary;
    if (sst.hasServerSideGTM) doc.text('  Server-Side GTM', margin + 5, yPos), yPos += 5;
    if (sst.hasMetaCAPI) doc.text('  Meta Conversions API', margin + 5, yPos), yPos += 5;
    if (sst.hasCookieBridging) doc.text('  Cookie Bridging', margin + 5, yPos), yPos += 5;
  }
  yPos += 5;

  // E-Commerce
  if (result.dataLayerAnalysis?.ecommerce?.detected) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('E-Commerce Tracking', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const ecom = result.dataLayerAnalysis.ecommerce;
    doc.text(`Plattform: ${ecom.platform?.toUpperCase() || 'Unbekannt'}`, margin, yPos);
    yPos += 5;
    doc.text(`Wertübergabe: ${ecom.valueTracking.hasTransactionValue ? 'Ja' : 'Nein'}`, margin, yPos);
    yPos += 5;
    doc.text(`Währung: ${ecom.valueTracking.hasCurrency ? 'Ja' : 'Nein'}`, margin, yPos);
    yPos += 5;
    
    if (ecom.events.length > 0) {
      doc.text(`Events: ${ecom.events.map(e => e.name).join(', ')}`, margin, yPos);
      yPos += 5;
    }
    
    if (ecom.valueTracking.missingRecommended.length > 0) {
      doc.setTextColor(237, 108, 2);
      doc.text(`Fehlende Parameter: ${ecom.valueTracking.missingRecommended.join(', ')}`, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
    yPos += 5;
  }

  // Conversion Tracking Audit (Performance Marketing)
  if (result.conversionTrackingAudit) {
    checkPageBreak(35);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Conversion Tracking Audit', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score: ${result.conversionTrackingAudit.overallScore}%`, margin, yPos);
    yPos += 5;
    if (result.conversionTrackingAudit.platforms.length > 0) {
      result.conversionTrackingAudit.platforms.forEach((platform) => {
        checkPageBreak(5);
        doc.text(
          `${platform.platform.toUpperCase()}: ${platform.coverageScore}% (Server-Side: ${platform.hasServerSide ? 'Ja' : 'Nein'})`,
          margin,
          yPos
        );
        yPos += 5;
      });
    }
    yPos += 5;
  }

  // Campaign Attribution
  if (result.campaignAttribution) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Campaign & Attribution', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score: ${result.campaignAttribution.overallScore}%`, margin, yPos);
    yPos += 5;
    const missingClickIds = result.campaignAttribution.clickIdStatus
      .filter(s => !s.detected)
      .map(s => s.signal)
      .join(', ');
    if (missingClickIds) {
      doc.text(`Fehlende Click-IDs: ${missingClickIds}`, margin, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  // GTM Audit
  if (result.gtmAudit) {
    checkPageBreak(25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GTM Audit', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score: ${result.gtmAudit.score}%`, margin, yPos);
    yPos += 5;
    doc.text(`Container: ${result.gtmAudit.containerIds.join(', ') || 'Nicht erkannt'}`, margin, yPos);
    yPos += 5;
    yPos += 5;
  }

  // Privacy Sandbox
  if (result.privacySandbox) {
    checkPageBreak(25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Privacy Sandbox', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Readiness: ${result.privacySandbox.summary.readinessScore}%`, margin, yPos);
    yPos += 5;
    yPos += 5;
  }

  // E-Commerce Deep Dive
  if (result.ecommerceDeepDive) {
    checkPageBreak(25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('E-Commerce Deep Dive', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Score: ${result.ecommerceDeepDive.overallScore}%`, margin, yPos);
    yPos += 5;
    if (result.ecommerceDeepDive.coverage.missingEvents.length > 0) {
      doc.text(`Fehlende Events: ${result.ecommerceDeepDive.coverage.missingEvents.join(', ')}`, margin, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  // Cookies Summary
  checkPageBreak(35);
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
    unknown: result.cookies.filter(c => c.category === 'unknown').length,
  };

  doc.text(`Notwendig: ${cookieCategories.necessary} | Funktional: ${cookieCategories.functional} | Analytics: ${cookieCategories.analytics} | Marketing: ${cookieCategories.marketing}`, margin, yPos);
  yPos += 10;

  // Third-Party Domains
  if (result.thirdPartyDomains) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Third-Party Domains', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Gesamt: ${result.thirdPartyDomains.totalCount}`, margin, yPos);
    yPos += 5;
    doc.text(`Advertising: ${result.thirdPartyDomains.categories.advertising} | Analytics: ${result.thirdPartyDomains.categories.analytics} | Social: ${result.thirdPartyDomains.categories.social}`, margin, yPos);
    yPos += 5;
    
    if (result.thirdPartyDomains.riskAssessment.highRiskDomains.length > 0) {
      doc.setTextColor(211, 47, 47);
      doc.text(`Hochrisiko: ${result.thirdPartyDomains.riskAssessment.highRiskDomains.join(', ')}`, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
    yPos += 5;
  }

  // GDPR Checklist
  if (result.gdprChecklist) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`DSGVO-Checkliste (Score: ${result.gdprChecklist.score}%)`, margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Bestanden: ${result.gdprChecklist.summary.passed} | Fehler: ${result.gdprChecklist.summary.failed} | Warnungen: ${result.gdprChecklist.summary.warnings}`, margin, yPos);
    yPos += 8;
    
    // Failed checks
    const failedChecks = result.gdprChecklist.checks.filter(c => c.status === 'failed');
    if (failedChecks.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Kritische Probleme:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      
      failedChecks.slice(0, 5).forEach(check => {
        checkPageBreak(10);
        doc.setTextColor(211, 47, 47);
        doc.text(`  ${check.title}`, margin + 5, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      });
    }
    yPos += 5;
  }

  // DMA Check
  if (result.dmaCheck?.applicable) {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DMA-Compliance', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Gatekeeper: ${result.dmaCheck.gatekeepersDetected.join(', ')}`, margin, yPos);
    yPos += 5;
    doc.text(`Konform: ${result.dmaCheck.summary.compliant} | Nicht konform: ${result.dmaCheck.summary.nonCompliant} | Prüfung erforderlich: ${result.dmaCheck.summary.requiresReview}`, margin, yPos);
    yPos += 10;
  }

  // Issues
  if (result.issues.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Probleme & Empfehlungen', margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    result.issues.slice(0, 15).forEach((issue, index) => {
      checkPageBreak(20);
      const severityColor = issue.severity === 'error' ? [211, 47, 47] : issue.severity === 'warning' ? [237, 108, 2] : [25, 118, 210];
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. [${issue.category.toUpperCase()}] ${issue.title}`, margin, yPos);
      yPos += 5;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const descriptionLines = doc.splitTextToSize(issue.description, pageWidth - 2 * margin);
      doc.text(descriptionLines, margin, yPos);
      yPos += descriptionLines.length * 4;
      if (issue.recommendation) {
        const recLines = doc.splitTextToSize(`Empfehlung: ${issue.recommendation}`, pageWidth - 2 * margin - 5);
        doc.setFont('helvetica', 'italic');
        doc.text(recLines, margin + 5, yPos);
        yPos += recLines.length * 4;
        doc.setFont('helvetica', 'normal');
      }
      yPos += 3;
    });
    
    if (result.issues.length > 15) {
      doc.text(`... und ${result.issues.length - 15} weitere Hinweise`, margin, yPos);
      yPos += 5;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Seite ${i} von ${totalPages} | ${showBranding ? 'Tracking Checker Report' : (options.brandName || 'Tracking Report')}`,
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
  const fileName = `tracking-report-${result.url.replace(/https?:\/\//, '').replace(/[/:]/g, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
}
