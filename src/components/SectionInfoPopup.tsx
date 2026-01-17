'use client';

import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SectionInfoPopupProps {
  sectionName: string;
  trigger: React.ReactNode;
}

// Statische Informationen für jede Sektion
function getSectionInfo(sectionName: string): string {
  const normalizedName = sectionName.toLowerCase();

  if (normalizedName.includes('cookie') && normalizedName.includes('banner')) {
    return `## Cookie Banner & Consent Management

Ein **Cookie-Banner** (auch Consent-Banner genannt) ist eine rechtliche Anforderung nach der DSGVO und ePrivacy-Richtlinie. Es informiert Besucher über die Verwendung von Cookies und Tracking-Tools und ermöglicht ihnen, ihre Einwilligung zu geben oder zu verweigern.

### Was wird hier analysiert?

- **Erkennung**: Welches Cookie-Banner/CMP wurde gefunden?
- **Funktionen**: Hat das Banner einen "Ablehnen"-Button?
- **Granularität**: Können Besucher einzelne Cookie-Kategorien auswählen?
- **DSGVO-Konformität**: Erfüllt das Banner alle rechtlichen Anforderungen?

### Warum ist das wichtig?

Ohne DSGVO-konformes Cookie-Banner können Cookies und Tracking-Tools nicht rechtmäßig verwendet werden. Dies kann zu Abmahnungen und Bußgeldern führen.

### Was bedeuten die Ergebnisse?

- **✅ Erkannt mit Ablehnen-Button**: Gut - Besucher können Tracking ablehnen
- **⚠️ Erkannt ohne Ablehnen-Button**: Kritisch - rechtlich problematisch
- **❌ Nicht erkannt**: Kein Banner vorhanden - Tracking ohne Consent ist illegal`;
  }

  if (normalizedName.includes('consent') && normalizedName.includes('mode')) {
    return `## Google Consent Mode V2

**Google Consent Mode V2** ist seit März 2024 verpflichtend für personalisierte Werbung in Google Ads. Es ermöglicht Google-Tools (Analytics, Ads, Tag Manager), basierend auf der Cookie-Einwilligung unterschiedlich zu funktionieren.

### Was wird hier analysiert?

- **Version**: Wird Consent Mode V1 oder V2 verwendet?
- **Parameter**: Werden ad_storage, analytics_storage, ad_user_data, ad_personalization korrekt gesetzt?
- **Default-Consent**: Was passiert, bevor der Besucher eine Entscheidung trifft?
- **Update-Consent**: Wird die Einwilligung nach Banner-Klick aktualisiert?

### Warum ist das wichtig?

Ohne Consent Mode V2 können Sie keine personalisierte Werbung in Google Ads schalten. Außerdem hilft es, Tracking-Daten auch bei abgelehnten Cookies teilweise zu erhalten (anonymisiert).

### Was bedeuten die Ergebnisse?

- **✅ V2 erkannt**: Konsent Mode V2 ist implementiert
- **⚠️ V1 erkannt**: Veraltet - muss auf V2 aktualisiert werden
- **❌ Nicht erkannt**: Consent Mode fehlt - muss implementiert werden`;
  }

  if (normalizedName.includes('tcf') || normalizedName.includes('transparency')) {
    return `## TCF 2.2 (Transparency & Consent Framework)

Das **IAB Transparency & Consent Framework (TCF)** ist ein Standard für die Cookie-Einwilligung, der von der Werbeindustrie entwickelt wurde. Es ermöglicht die einheitliche Kommunikation zwischen Websites, Werbenetzwerken und Werbepartnern.

### Was wird hier analysiert?

- **Erkennung**: Wird TCF 2.2 implementiert?
- **CMP-ID**: Welcher Consent Management Provider (CMP) wird verwendet?
- **TC-String**: Wird ein gültiger Consent-String generiert?
- **GDPR-Applies**: Ist TCF für den Standort des Besuchers relevant?

### Warum ist das wichtig?

TCF ist besonders wichtig, wenn Sie Werbenetzwerke oder programmatische Werbung nutzen. Es standardisiert die Consent-Kommunikation zwischen vielen verschiedenen Partnern.

### Was bedeuten die Ergebnisse?

- **✅ TCF 2.2 erkannt**: Framework ist korrekt implementiert
- **⚠️ TCF V1 erkannt**: Veraltet - sollte auf 2.2 aktualisiert werden
- **❌ Nicht erkannt**: TCF nicht implementiert - nur relevant wenn programmatische Werbung genutzt wird`;
  }

  if (normalizedName.includes('tracking') && normalizedName.includes('tag')) {
    return `## Tracking Tags & Drittanbieter

**Tracking-Tags** sind Code-Snippets, die Daten an Marketing- und Analytics-Plattformen senden. Beispiele: Google Analytics, Meta Pixel, TikTok Pixel, LinkedIn Insight Tag.

### Was wird hier analysiert?

- **Erkannte Tags**: Welche Tracking-Tools wurden gefunden?
- **Ladezeitpunkt**: Werden Tags vor oder nach Cookie-Consent geladen?
- **Server-Side Tracking**: Wird Server-Side Tracking genutzt (besser für Datenschutz)?
- **Deduplizierung**: Werden Events zwischen Client- und Server-Side dedupliziert?

### Warum ist das wichtig?

Tags müssen **nach** der Cookie-Einwilligung geladen werden. Werden sie vorher geladen, verstößt das gegen die DSGVO und kann zu Abmahnungen führen.

### Was bedeuten die Ergebnisse?

- **✅ Nach Consent geladen**: Korrekt implementiert
- **⚠️ Vor Consent geladen**: Rechtswidrig - muss behoben werden
- **✅ Server-Side erkannt**: Moderne, datenschutzfreundliche Lösung`;
  }

  if (normalizedName.includes('e-commerce') || normalizedName.includes('ecommerce')) {
    return `## E-Commerce Tracking

**E-Commerce Tracking** erfasst Transaktionen, Produktansichten und Verkaufszahlen. Es ist essentiell für ROAS-Optimierung und Conversion-Tracking.

### Was wird hier analysiert?

- **Events**: Welche E-Commerce-Events werden getrackt? (purchase, add_to_cart, etc.)
- **Datenqualität**: Werden Wert, Währung, Artikel-Daten übertragen?
- **Plattform**: Google Analytics 4 oder Universal Analytics?
- **Vollständigkeit**: Fehlen wichtige Parameter?

### Warum ist das wichtig?

Ohne korrektes E-Commerce-Tracking können Sie keine ROAS (Return on Ad Spend) messen oder Optimierungen vornehmen. Unvollständige Daten führen zu falschen Geschäftsentscheidungen.

### Was bedeuten die Ergebnisse?

- **✅ Alle Events vorhanden**: E-Commerce-Tracking vollständig
- **⚠️ Einige Events fehlen**: Unvollständiges Tracking
- **❌ Keine E-Commerce-Daten**: Kein E-Commerce-Tracking implementiert`;
  }

  if (normalizedName.includes('third-party') || normalizedName.includes('domains')) {
    return `## Third-Party Domains

**Third-Party Domains** sind externe Server, zu denen Ihre Website Daten sendet. Beispiele: Google Analytics, Facebook, Ad-Netzwerke.

### Was wird hier analysiert?

- **Anzahl**: Wie viele Third-Party-Domains werden kontaktiert?
- **Kategorien**: Werden Domains kategorisiert? (Advertising, Analytics, Social, etc.)
- **Risiko-Bewertung**: Welche Domains sind problematisch? (z.B. USA ohne Standardvertragsklauseln)
- **Cross-Border**: Werden Daten in Länder ohne angemessenes Datenschutzniveau übertragen?

### Warum ist das wichtig?

Die DSGVO erfordert, dass Third-Party-Datenübertragungen rechtlich abgesichert sind (z.B. Standardvertragsklauseln). Ungesicherte Übertragungen können zu Bußgeldern führen.

### Was bedeuten die Ergebnisse?

- **✅ EU-basierte Domains**: Rechtlich unproblematisch
- **⚠️ USA-Domains ohne SCC**: Rechtlich problematisch - benötigt Standardvertragsklauseln
- **❌ Unbekannte Domains**: Unklare Datenübertragung - sollte geprüft werden`;
  }

  if (normalizedName.includes('cookie') && !normalizedName.includes('banner') && !normalizedName.includes('consent')) {
    return `## Cookies

**Cookies** sind kleine Textdateien, die im Browser gespeichert werden. Sie können für verschiedene Zwecke verwendet werden: Funktion, Analyse, Marketing.

### Was wird hier analysiert?

- **Anzahl**: Wie viele Cookies werden gesetzt?
- **Kategorien**: Notwendig, Funktional, Analytics, Marketing?
- **Lebensdauer**: Wie lange sind Cookies gültig? (ITP-betroffen bei Safari?)
- **Third-Party**: Sind Cookies von Drittanbietern?

### Warum ist das wichtig?

Marketing- und Analytics-Cookies benötigen eine Einwilligung nach DSGVO. Cookies ohne Einwilligung zu setzen ist rechtswidrig und kann zu Abmahnungen führen.

### Was bedeuten die Ergebnisse?

- **✅ Nur notwendige Cookies**: Rechtlich unproblematisch
- **⚠️ Marketing-Cookies vor Consent**: Rechtswidrig - muss behoben werden
- **✅ Third-Party Cookies erkannt**: Benötigen Einwilligung und Datenschutzerklärung`;
  }

  if (normalizedName.includes('gdpr') || normalizedName.includes('dsgvo')) {
    return `## DSGVO-Checkliste

Die **DSGVO-Checkliste** prüft, ob Ihre Website die Anforderungen der Datenschutz-Grundverordnung erfüllt.

### Was wird hier analysiert?

- **Consent Management**: Wird eine gültige Einwilligung eingeholt?
- **Transparenz**: Werden Besucher über Datenverarbeitung informiert?
- **Datenminimierung**: Werden nur notwendige Daten erhoben?
- **Sicherheit**: Werden Daten sicher übertragen?
- **Betroffenenrechte**: Können Besucher ihre Rechte ausüben?

### Warum ist das wichtig?

Nichtkonformität mit der DSGVO kann zu Bußgeldern von bis zu 4% des Jahresumsatzes oder 20 Mio. € führen.

### Was bedeuten die Ergebnisse?

- **✅ Score 80-100%**: Gut - die meisten Anforderungen erfüllt
- **⚠️ Score 50-79%**: Mittel - einige Verbesserungen nötig
- **❌ Score <50%**: Kritisch - sofortiger Handlungsbedarf`;
  }

  if (normalizedName.includes('dma')) {
    return `## DMA-Compliance (Digital Markets Act)

Der **Digital Markets Act (DMA)** regelt das Verhalten von "Gatekeepern" (Google, Meta, Apple, etc.) in der EU.

### Was wird hier analysiert?

- **Gatekeeper-Erkennung**: Welche Gatekeeper-Tools werden verwendet?
- **Compliance**: Werden DMA-Anforderungen erfüllt?
- **Daten-Portabilität**: Können Daten exportiert werden?
- **Interoperabilität**: Sind APIs verfügbar?

### Warum ist das wichtig?

Der DMA schafft Fair-Play-Regeln für große Tech-Plattformen. Als Website-Betreiber sind Sie indirekt betroffen, wenn Sie Gatekeeper-Dienste nutzen.

### Was bedeuten die Ergebnisse?

- **✅ Keine Gatekeeper erkannt**: Nicht direkt betroffen
- **⚠️ Gatekeeper erkannt**: Prüfen Sie Compliance-Anforderungen
- **ℹ️ Info**: DMA betrifft hauptsächlich die Plattformen selbst`;
  }

  if (normalizedName.includes('consent') && normalizedName.includes('test')) {
    return `## Cookie-Consent Test

Der **Cookie-Consent Test** prüft, ob Ihr Cookie-Banner tatsächlich funktioniert und Tracking vor der Einwilligung verhindert.

### Was wird hier analysiert?

- **Vor Consent**: Werden Cookies/Tracking vor dem Banner-Klick gesetzt?
- **Nach "Akzeptieren"**: Werden Tracking-Cookies korrekt gesetzt?
- **Nach "Ablehnen"**: Bleiben Tracking-Cookies blockiert?
- **Funktionalität**: Funktioniert der Banner wie erwartet?

### Warum ist das wichtig?

Ein defektes Cookie-Banner kann rechtswidrig sein, auch wenn es vorhanden ist. Tracking vor Consent ist immer illegal.

### Was bedeuten die Ergebnisse?

- **✅ Tracking nur nach Consent**: Korrekt implementiert
- **❌ Tracking vor Consent**: Rechtswidrig - muss sofort behoben werden
- **⚠️ Ablehnen funktioniert nicht**: Banner ist defekt - rechtlich problematisch`;
  }

  if (normalizedName.includes('problem') || normalizedName.includes('hinweis') || normalizedName.includes('issue')) {
    return `## Probleme & Hinweise

Diese Sektion listet alle identifizierten Probleme und Warnungen aus der Analyse auf.

### Was wird hier angezeigt?

- **Fehler**: Kritische Probleme, die sofort behoben werden müssen
- **Warnungen**: Probleme, die zeitnah behoben werden sollten
- **Hinweise**: Optimierungsmöglichkeiten und Best Practices

### Warum ist das wichtig?

Kritische Fehler können zu rechtlichen Problemen führen. Warnungen sollten nicht ignoriert werden, um Compliance sicherzustellen.

### Was bedeuten die Ergebnisse?

- **🔴 Fehler**: Sofort handeln - rechtliche Risiken
- **🟡 Warnung**: Zeitnah beheben - Verbesserung nötig
- **🔵 Hinweis**: Optimierungsmöglichkeit - nicht kritisch`;
  }

  // Fallback für unbekannte Sektionen
  return `## Informationen zu dieser Sektion

Diese Sektion zeigt Analysedaten zu **${sectionName}**.

Weitere Informationen finden Sie in der ausführlichen KI-Analyse (wenn aktiviert) oder in der Datenschutzerklärung Ihrer Website.`;
}

export function SectionInfoPopup({ sectionName, trigger }: SectionInfoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const explanation = getSectionInfo(sectionName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="text-slate-400 hover:text-slate-300 transition-colors"
        title="Informationen zu dieser Sektion"
      >
        {trigger}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Popup */}
          <div
            ref={popupRef}
            className="fixed z-50 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-lg w-[90vw] max-h-[80vh] overflow-hidden"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-slate-200">{sectionName}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-bold text-slate-200 mt-6 mb-3 pb-2 border-b border-slate-700">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold text-slate-200 mt-5 mb-3 pt-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold text-slate-300 mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-slate-300 text-sm mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-outside text-slate-300 text-sm mb-3 ml-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside text-slate-300 text-sm mb-3 ml-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300 leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="text-slate-200 font-semibold">{children}</strong>,
                    code: ({ children }) => <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs text-blue-300 font-mono">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 my-3 italic text-slate-400">{children}</blockquote>,
                  }}
                >
                  {explanation}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
