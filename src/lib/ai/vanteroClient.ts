// Vantero KI API Client (OpenAI-kompatibel)
import { reduceAnalysisResultForAI, reduceForQuestion, reduceForSection } from './dataReducer';
import { getCachedReducedData, setCachedReducedData } from '@/lib/cache/analysisCache';
import { AnalysisResult } from '@/types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class VanteroClient {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.VANTERO_API_KEY || 'sk_vantero_nzmqq8WzNqkg5O_orLgeC6_1u80Q1xnU';
    this.apiUrl = process.env.VANTERO_API_URL || 'https://api.vantero.de/v1';
    this.model = process.env.VANTERO_MODEL || 'gpt-4o-mini';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk_vantero_');
  }

  async chat(messages: ChatMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Vantero API ist nicht konfiguriert. Bitte VANTERO_API_KEY in .env.local setzen.');
    }

    const url = `${this.apiUrl}/chat/completions`;
    
    // Timeout Controller für Serverless-Umgebungen
    const controller = new AbortController();
    const configuredTimeoutMs = Number(process.env.VANTERO_TIMEOUT_MS ?? 120000);
    const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
      ? configuredTimeoutMs
      : 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2000,
          // Kompaktes JSON ohne Formatierung spart Token
          // JSON.stringify ohne null, 2
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Network-Error oder Timeout
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout') || fetchError.message.includes('aborted')) {
          const timeoutSeconds = Math.round(timeoutMs / 1000);
          throw new Error(`API-Timeout: Die Anfrage dauerte zu lange (${timeoutSeconds}s). Modell: ${this.model}, URL: ${this.apiUrl}`);
        }
        if (fetchError.message.includes('fetch') || fetchError.message.includes('network') || fetchError.message.includes('ECONNREFUSED')) {
          throw new Error(`Netzwerk-Fehler: Kann die Vantero API nicht erreichen (${this.apiUrl}). Bitte prüfe:\n- Ist die API-URL korrekt?\n- Ist die API erreichbar?\n- Gibt es Firewall/CORS-Probleme?`);
        }
        throw new Error(`API-Verbindungsfehler: ${fetchError.message}`);
      }
      throw new Error('Unbekannter Netzwerk-Fehler beim Verbinden zur Vantero API');
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Keine Fehlerdetails verfügbar';
      }
      
      // Versuche JSON-Fehler zu parsen
      let errorMessage = `Vantero API Fehler: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = `${errorMessage} - ${errorJson.error.message}`;
        } else if (errorJson.message) {
          errorMessage = `${errorMessage} - ${errorJson.message}`;
        } else {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      } catch {
        errorMessage = `${errorMessage} - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Sicher JSON parsen
    let data: ChatCompletionResponse;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        const errorText = await response.text();
        throw new Error(`Vantero API: Antwort konnte nicht als JSON gelesen werden. Status: ${response.status}, Antwort: ${errorText.substring(0, 200)}`);
      }
    } else {
      const errorText = await response.text();
      throw new Error(`Vantero API: Unerwartetes Antwortformat. Status: ${response.status}, Content-Type: ${contentType}, Antwort: ${errorText.substring(0, 200)}`);
    }
    
    // Prüfe ob Antwort-Struktur korrekt ist
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error(`Unerwartete API-Antwort-Struktur. Modell: ${this.model}`);
    }
    
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`Keine Antwort vom Modell erhalten. Modell: ${this.model}, Finish Reason: ${data.choices[0]?.finish_reason}`);
    }
    
    return content;
  }

  async analyzeTrackingResults(analysisData: unknown): Promise<string> {
    // Cache-Check: Prüfe ob reduzierte Daten bereits gecacht sind
    const dataUrl = (analysisData as AnalysisResult)?.url;
    const cacheKey = dataUrl ? `reduced:${dataUrl}` : null;
    
    let reducedData: Partial<AnalysisResult>;
    if (cacheKey) {
      const cached = getCachedReducedData(cacheKey);
      if (cached) {
        reducedData = cached;
      } else {
        reducedData = reduceAnalysisResultForAI(analysisData as AnalysisResult);
        setCachedReducedData(cacheKey, reducedData);
      }
    } else {
      reducedData = reduceAnalysisResultForAI(analysisData as AnalysisResult);
    }

    const systemPrompt = `Du bist ein erfahrener Experte für Web-Tracking, DSGVO-Compliance, Consent Management und Datenschutz-Audits.
Du erstellst ausführliche, professionelle Analyse-Berichte für Website-Betreiber, Marketing-Verantwortliche und Datenschutzbeauftragte.

Deine Berichte sind:
- Ausführlich und detailliert - jeder Punkt wird erklärt
- Verständlich - auch für Nicht-Techniker nachvollziehbar
- Handlungsorientiert - mit konkreten Schritt-für-Schritt Anleitungen
- Priorisiert - kritische Probleme werden zuerst behandelt

Antworte immer auf Deutsch und strukturiere deine Antwort klar mit Überschriften (##), Unterüberschriften (###), Aufzählungen und nummerierten Listen.`;

    const userPrompt = `Hier sind die Analyse-Ergebnisse einer Website:

${JSON.stringify(reducedData)}

Erstelle einen **ausführlichen und professionellen Analyse-Bericht** mit folgender Struktur:

## 1. Executive Summary
- Gesamtbewertung der Datenschutz-Compliance (gut/mittel/kritisch)
- Die 3 wichtigsten Erkenntnisse in einem Satz
- Dringendster Handlungsbedarf

## 2. Cookie-Banner & Consent Management
### Was wurde gefunden?
- Beschreibe detailliert, welches Cookie-Banner/CMP erkannt wurde
- Erkläre, was ein Cookie-Banner macht und warum es wichtig ist
### Bewertung
- Ist das Banner DSGVO-konform implementiert?
- Werden alle Anforderungen erfüllt (Ablehnen-Button, granulare Einwilligung, etc.)?
### Handlungsempfehlungen
- Konkrete Schritte zur Verbesserung mit Priorität (Hoch/Mittel/Niedrig)

## 3. Google Consent Mode V2
### Was ist Google Consent Mode?
- Kurze Erklärung der Funktionsweise und warum es wichtig ist (ab März 2024 Pflicht für personalisierte Werbung)
### Was wurde gefunden?
- Welche Consent-Signale werden gesendet?
- Werden ad_storage, analytics_storage, ad_user_data, ad_personalization korrekt implementiert?
### Handlungsempfehlungen
- Falls nicht implementiert: Schritt-für-Schritt Anleitung zur Implementierung
- Falls implementiert: Optimierungsmöglichkeiten

## 4. TCF 2.2 (Transparency & Consent Framework)
### Was ist TCF?
- Erklärung des IAB TCF Standards und wann er benötigt wird
### Analyseergebnis
- Ist TCF implementiert? Welche Version?
- Werden alle Vendor-Consent-Strings korrekt generiert?
### Handlungsempfehlungen
- Konkrete Schritte je nach Ergebnis

## 5. Tracking-Tags & Drittanbieter
### Gefundene Tracking-Implementierungen
- Liste alle gefundenen Tags mit Erklärung (z.B. "Google Analytics 4 - misst Besucherverhalten")
- Kategorisierung: Analytics, Marketing, Funktional, Unbekannt
### Datenschutz-Bewertung
- Welche Tags sind kritisch? Warum?
- Werden Tags vor Consent geladen (Problem!)?
### Handlungsempfehlungen
- Welche Tags müssen angepasst werden?
- Wie integriert man Tags korrekt mit dem Consent-Management?

## 6. DataLayer-Analyse
### Was ist der DataLayer?
- Kurze Erklärung für Nicht-Techniker
### Gefundene Daten
- Welche Events und Variablen wurden gefunden?
- Werden sensible Daten übertragen?
### Handlungsempfehlungen
- Optimierungen für besseres Tracking bei gleichzeitiger Compliance

## 7. Drittanbieter-Requests
### Externe Verbindungen
- Zu welchen externen Servern werden Daten gesendet?
- Welche davon sind problematisch (z.B. USA ohne Standardvertragsklauseln)?
### Handlungsempfehlungen
- Welche Verbindungen sollten überprüft oder entfernt werden?

## 8. Prioritäten-Matrix
Erstelle eine klare Prioritätenliste:

### 🔴 Sofort erledigen (Kritisch)
- Punkte die rechtliche Risiken bergen und sofort behoben werden müssen

### 🟡 Zeitnah umsetzen (Wichtig)  
- Verbesserungen die innerhalb von 2-4 Wochen erfolgen sollten

### 🟢 Optimierung (Nice-to-have)
- Empfehlungen für eine optimale Umsetzung

## 9. Konkrete nächste Schritte
Nummerierte Liste mit den genauen Aktionen, die der Website-Betreiber durchführen sollte:
1. [Schritt] - [Verantwortlich] - [Zeitrahmen]
2. ...

Sei ausführlich, erkläre Fachbegriffe und gib konkrete, umsetzbare Handlungsempfehlungen!`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.5,
      maxTokens: 6000,
    });
  }

  async answerQuestion(question: string, context: unknown): Promise<string> {
    // Reduziere Kontext basierend auf der Frage (nur relevante Teile)
    const reducedContext = reduceForQuestion(context as AnalysisResult, question);

    const systemPrompt = `Du bist ein Experte für Web-Tracking und DSGVO-Compliance.
Dir liegen Analyse-Ergebnisse einer Website vor. Beantworte Fragen basierend auf diesen Daten.
Antworte präzise, hilfreich und auf Deutsch.`;

    const userPrompt = `Analyse-Kontext:
${JSON.stringify(reducedContext)}

Frage des Nutzers: ${question}`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 1500,
    });
  }

  async validateAndReviewAnalysis(
    analysisData: unknown,
    initialAnalysis: string
  ): Promise<string> {
    // Reduziere analysisData - keine Notwendigkeit für vollständige Daten bei Validierung
    // Die initialAnalysis enthält bereits alle relevanten Informationen
    const reducedData = reduceAnalysisResultForAI(analysisData as AnalysisResult);
    
    // Kürze initialAnalysis auf max. 2000 Wörter (ca. 2500 Token) wenn zu lang
    let analysisSummary = initialAnalysis;
    if (initialAnalysis.length > 8000) { // ~1000 Wörter
      const sentences = initialAnalysis.split(/[.!?]\s+/);
      analysisSummary = sentences.slice(0, Math.ceil(sentences.length * 0.7)).join('. ') + '.';
      analysisSummary += '\n\n[Hinweis: Bericht wurde gekürzt, da zu lang für Validierung]';
    }

    const systemPrompt = `Du bist ein kritischer Datenschutz-Auditor und QA-Experte für Web-Tracking und DSGVO-Compliance.
Deine Aufgabe ist es, Analyse-Berichte kritisch zu überprüfen und zusätzliche wichtige Hinweise zu geben.

Du bist:
- Gründlich und detailorientiert
- Konstruktiv aber kritisch
- Praxisorientiert mit Fokus auf umsetzbare Verbesserungen

Antworte auf Deutsch mit klarer Struktur.`;

    const userPrompt = `Hier sind die reduzierten Analyse-Ergebnisse einer Website (für Kontext):

${JSON.stringify(reducedData)}

Und hier ist der Analyse-Bericht zum Überprüfen:

${analysisSummary}

Erstelle eine **Qualitätssicherungs-Überprüfung** mit folgender Struktur:

## ✅ Bestätigte Erkenntnisse
- Welche Punkte im Bericht sind korrekt und wichtig?
- Was wurde besonders gut erkannt?

## ⚠️ Zusätzliche Hinweise
- Gibt es Aspekte, die im Bericht noch ergänzt werden sollten?
- Welche zusätzlichen Risiken oder Chancen wurden möglicherweise übersehen?
- Gibt es branchenspezifische Anforderungen zu beachten?

## 🔍 Manuelle Prüfung empfohlen
- Welche Punkte sollte der Website-Betreiber zusätzlich manuell prüfen?
- Welche Informationen können durch automatische Analyse nicht erfasst werden?
- z.B.: Datenschutzerklärung prüfen, Auftragsverarbeitungsverträge checken, etc.

## 📋 Compliance-Checkliste
Erstelle eine kurze Checkliste zum Abhaken:
- [ ] Punkt 1
- [ ] Punkt 2
- usw.

## 💡 Profi-Tipps
- Zusätzliche Best Practices und Expertentipps
- Tools und Ressourcen die helfen können
- Häufige Fehler die vermieden werden sollten

Halte diese Überprüfung kompakt aber informativ!`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.3,
      maxTokens: 3000,
    });
  }
}

// Singleton Instance
let clientInstance: VanteroClient | null = null;

export function getVanteroClient(): VanteroClient {
  if (!clientInstance) {
    clientInstance = new VanteroClient();
  }
  return clientInstance;
}
