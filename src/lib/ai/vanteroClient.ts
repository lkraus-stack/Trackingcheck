// Vantero KI API Client (OpenAI-kompatibel)

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
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 Sekunden
    
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
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Network-Error oder Timeout
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout') || fetchError.message.includes('aborted')) {
          throw new Error(`API-Timeout: Die Anfrage dauerte zu lange (30s). Modell: ${this.model}, URL: ${this.apiUrl}`);
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

    const data: ChatCompletionResponse = await response.json();
    
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
    const systemPrompt = `Du bist ein Experte für Web-Tracking, DSGVO-Compliance und Consent Management.
Analysiere die folgenden Tracking-Checker Ergebnisse und erstelle eine verständliche Zusammenfassung.

Deine Aufgaben:
1. Fasse die wichtigsten Erkenntnisse zusammen
2. Identifiziere kritische Probleme
3. Gib konkrete Handlungsempfehlungen
4. Erkläre technische Details verständlich

Antworte auf Deutsch und strukturiere deine Antwort mit Überschriften und Aufzählungen.`;

    const userPrompt = `Hier sind die Analyse-Ergebnisse einer Website:

${JSON.stringify(analysisData, null, 2)}

Bitte analysiere diese Daten und erstelle einen verständlichen Bericht mit:
1. Zusammenfassung des Compliance-Status
2. Gefundene Tracking-Implementierungen
3. Probleme und Risiken
4. Konkrete Handlungsempfehlungen zur Verbesserung`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.5,
      maxTokens: 2500,
    });
  }

  async answerQuestion(question: string, context: unknown): Promise<string> {
    const systemPrompt = `Du bist ein Experte für Web-Tracking und DSGVO-Compliance.
Dir liegen Analyse-Ergebnisse einer Website vor. Beantworte Fragen basierend auf diesen Daten.
Antworte präzise, hilfreich und auf Deutsch.`;

    const userPrompt = `Analyse-Kontext:
${JSON.stringify(context, null, 2)}

Frage des Nutzers: ${question}`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 1500,
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
