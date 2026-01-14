import { CrawlResult, WindowObjectData } from './crawler';
import { DataLayerAnalysisResult, DataLayerEvent, EcommerceAnalysis, EcommerceEvent, EcommerceIssue, DataLayerEntry } from '@/types';

// GA4 E-Commerce Events
const GA4_ECOMMERCE_EVENTS = [
  'view_item',
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'purchase',
  'refund',
  'view_promotion',
  'select_promotion',
];

// Universal Analytics E-Commerce Events
const UA_ECOMMERCE_EVENTS = [
  'productClick',
  'productDetail',
  'addToCart',
  'removeFromCart',
  'checkout',
  'checkoutOption',
  'purchase',
  'refund',
  'promoView',
  'promoClick',
];

// Empfohlene Parameter für Wertübergabe
const RECOMMENDED_VALUE_PARAMS = {
  purchase: ['value', 'currency', 'transaction_id', 'items', 'tax', 'shipping'],
  add_to_cart: ['value', 'currency', 'items'],
  begin_checkout: ['value', 'currency', 'items'],
  view_item: ['value', 'currency', 'items'],
  view_item_list: ['item_list_id', 'item_list_name', 'items'],
};

// Item-Parameter für E-Commerce
const ITEM_PARAMETERS = [
  'item_id',
  'item_name',
  'item_brand',
  'item_category',
  'item_variant',
  'price',
  'quantity',
  'index',
  'affiliation',
  'coupon',
  'discount',
];

export function analyzeDataLayer(crawlResult: CrawlResult): DataLayerAnalysisResult {
  const { windowObjects, scripts, html } = crawlResult;
  const combinedContent = html + scripts.join(' ');

  const hasDataLayer = windowObjects.hasDataLayer;
  const dataLayerContent = windowObjects.dataLayerContent || [];

  // Events analysieren
  const events = analyzeEvents(dataLayerContent, combinedContent);

  // E-Commerce analysieren
  const ecommerce = analyzeEcommerce(dataLayerContent, combinedContent, events);

  // Custom Dimensions finden
  const customDimensions = findCustomDimensions(dataLayerContent, combinedContent);

  // User Properties finden
  const userProperties = findUserProperties(dataLayerContent, combinedContent);

  // Raw DataLayer parsen für Anzeige
  const rawDataLayer = parseRawDataLayer(dataLayerContent);

  return {
    hasDataLayer,
    events,
    ecommerce,
    customDimensions,
    userProperties,
    rawDataLayer,
  };
}

// Parst den rohen DataLayer Inhalt für die Anzeige
function parseRawDataLayer(dataLayerContent: unknown[]): DataLayerEntry[] {
  const entries: DataLayerEntry[] = [];
  
  for (let i = 0; i < dataLayerContent.length; i++) {
    const item = dataLayerContent[i];
    
    if (typeof item !== 'object' || item === null) continue;
    
    const obj = item as Record<string, unknown>;
    const eventName = typeof obj.event === 'string' ? obj.event : undefined;
    
    // Bestimme den Typ des Eintrags
    let type: DataLayerEntry['type'] = 'custom';
    if (eventName === 'gtm.js') type = 'gtm.js';
    else if (eventName === 'gtm.dom') type = 'gtm.dom';
    else if (eventName === 'gtm.load') type = 'gtm.load';
    else if (eventName?.includes('consent') || obj[0] === 'consent') type = 'consent';
    else if (obj.ecommerce || GA4_ECOMMERCE_EVENTS.includes(eventName || '')) type = 'ecommerce';
    else if (eventName === 'page_view' || eventName === 'pageview' || obj.pagePath || obj.pageTitle) type = 'pageview';
    else if (obj[0] === 'config' || obj[0] === 'js') type = 'config';
    
    // Prüfe auf E-Commerce und Consent Daten
    const hasEcommerce = Boolean(
      obj.ecommerce || 
      obj.items || 
      obj.value !== undefined || 
      GA4_ECOMMERCE_EVENTS.includes(eventName || '')
    );
    
    const hasConsent = Boolean(
      obj[0] === 'consent' || 
      eventName?.includes('consent') ||
      obj.ad_storage !== undefined ||
      obj.analytics_storage !== undefined
    );
    
    // Bereinige die Daten für die Anzeige (entferne sehr lange Werte)
    const cleanedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 500) {
        cleanedData[key] = value.substring(0, 500) + '... (gekürzt)';
      } else if (Array.isArray(value) && value.length > 10) {
        cleanedData[key] = [...value.slice(0, 10), `... und ${value.length - 10} weitere`];
      } else {
        cleanedData[key] = value;
      }
    }
    
    entries.push({
      index: i,
      event: eventName,
      data: cleanedData,
      type,
      hasEcommerce,
      hasConsent,
    });
  }
  
  return entries;
}

function analyzeEvents(dataLayerContent: unknown[], content: string): DataLayerEvent[] {
  const eventCounts: Map<string, { count: number; hasEcommerceData: boolean; parameters: Set<string> }> = new Map();

  // Events aus DataLayer extrahieren
  for (const item of dataLayerContent) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      
      // Standard event Property
      if (obj.event && typeof obj.event === 'string') {
        const eventName = obj.event;
        const existing = eventCounts.get(eventName) || { count: 0, hasEcommerceData: false, parameters: new Set() };
        existing.count++;
        
        // Prüfe auf E-Commerce Daten
        if (obj.ecommerce || obj.items || obj.value || obj.currency) {
          existing.hasEcommerceData = true;
        }

        // Sammle Parameter
        Object.keys(obj).forEach(key => {
          if (key !== 'event' && key !== 'gtm.uniqueEventId') {
            existing.parameters.add(key);
          }
        });

        eventCounts.set(eventName, existing);
      }

      // gtag() Aufrufe (flache Struktur)
      if (obj[0] === 'event' && typeof obj[1] === 'string') {
        const eventName = obj[1] as string;
        const existing = eventCounts.get(eventName) || { count: 0, hasEcommerceData: false, parameters: new Set() };
        existing.count++;
        
        if (obj[2] && typeof obj[2] === 'object') {
          const params = obj[2] as Record<string, unknown>;
          if (params.value || params.items || params.currency) {
            existing.hasEcommerceData = true;
          }
          Object.keys(params).forEach(key => existing.parameters.add(key));
        }

        eventCounts.set(eventName, existing);
      }
    }
  }

  // Auch Events aus dem Quellcode suchen
  const eventPatterns = [
    /gtag\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/g,
    /dataLayer\.push\s*\(\s*\{[^}]*event\s*:\s*['"]([^'"]+)['"]/g,
    /['"]event['"]\s*:\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of eventPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const eventName = match[1];
      if (!eventCounts.has(eventName)) {
        eventCounts.set(eventName, { count: 1, hasEcommerceData: false, parameters: new Set() });
      }
    }
  }

  // Zu DataLayerEvent[] konvertieren
  return Array.from(eventCounts.entries()).map(([event, data]) => ({
    event,
    count: data.count,
    hasEcommerceData: data.hasEcommerceData,
    parameters: Array.from(data.parameters),
  }));
}

function analyzeEcommerce(
  dataLayerContent: unknown[], 
  content: string,
  events: DataLayerEvent[]
): EcommerceAnalysis {
  const ecommerceEvents: EcommerceEvent[] = [];
  const issues: EcommerceIssue[] = [];
  let platform: 'ga4' | 'ua' | 'both' | 'unknown' = 'unknown';
  
  // Plattform-Erkennung
  const hasGA4Events = events.some(e => GA4_ECOMMERCE_EVENTS.includes(e.event));
  const hasUAEvents = events.some(e => UA_ECOMMERCE_EVENTS.includes(e.event)) || 
                      content.includes('ec:') || 
                      content.includes('ecommerce');
  
  if (hasGA4Events && hasUAEvents) {
    platform = 'both';
  } else if (hasGA4Events) {
    platform = 'ga4';
  } else if (hasUAEvents) {
    platform = 'ua';
  }

  // E-Commerce Events analysieren
  const allEcommerceEvents = [...GA4_ECOMMERCE_EVENTS, ...UA_ECOMMERCE_EVENTS];
  
  for (const eventName of allEcommerceEvents) {
    const foundEvent = events.find(e => e.event === eventName);
    const detectedInCode = content.toLowerCase().includes(eventName.toLowerCase());
    
    if (foundEvent || detectedInCode) {
      const eventData = extractEventData(dataLayerContent, eventName);
      
      ecommerceEvents.push({
        name: eventName,
        detected: true,
        hasValue: eventData.hasValue,
        hasCurrency: eventData.hasCurrency,
        hasItems: eventData.hasItems,
        sampleData: eventData.sampleData,
      });

      // Issues für dieses Event generieren
      const eventIssues = checkEventIssues(eventName, eventData, platform);
      issues.push(...eventIssues);
    }
  }

  // Wertübergabe-Analyse
  const valueTracking = analyzeValueTracking(dataLayerContent, content, ecommerceEvents);

  return {
    detected: ecommerceEvents.length > 0,
    platform,
    events: ecommerceEvents,
    valueTracking,
    issues,
  };
}

function extractEventData(dataLayerContent: unknown[], eventName: string): {
  hasValue: boolean;
  hasCurrency: boolean;
  hasItems: boolean;
  sampleData?: Record<string, unknown>;
} {
  let hasValue = false;
  let hasCurrency = false;
  let hasItems = false;
  let sampleData: Record<string, unknown> | undefined;

  for (const item of dataLayerContent) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      
      if (obj.event === eventName) {
        // Direkte Properties prüfen
        if (obj.value !== undefined || obj.revenue !== undefined) hasValue = true;
        if (obj.currency) hasCurrency = true;
        if (obj.items || obj.products) hasItems = true;

        // Nested ecommerce Object prüfen
        if (obj.ecommerce && typeof obj.ecommerce === 'object') {
          const ecom = obj.ecommerce as Record<string, unknown>;
          if (ecom.value !== undefined || ecom.revenue !== undefined) hasValue = true;
          if (ecom.currency) hasCurrency = true;
          if (ecom.items || ecom.products) hasItems = true;
          
          // Sample Data
          sampleData = sanitizeSampleData(ecom);
        } else {
          // Sample Data aus flacher Struktur
          const { event, ...rest } = obj;
          sampleData = sanitizeSampleData(rest);
        }
        
        break;
      }

      // gtag() Array Format
      if (Array.isArray(item) && item[0] === 'event' && item[1] === eventName) {
        const params = item[2] as Record<string, unknown> | undefined;
        if (params) {
          if (params.value !== undefined) hasValue = true;
          if (params.currency) hasCurrency = true;
          if (params.items) hasItems = true;
          sampleData = sanitizeSampleData(params);
        }
      }
    }
  }

  return { hasValue, hasCurrency, hasItems, sampleData };
}

function sanitizeSampleData(data: Record<string, unknown>): Record<string, unknown> {
  // Sensitive Daten entfernen und Struktur vereinfachen
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Sensitive Keys überspringen
    if (['email', 'phone', 'address', 'user_id', 'customer_id', 'ip', 'password'].includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Items/Products vereinfachen
    if ((key === 'items' || key === 'products') && Array.isArray(value)) {
      sanitized[key] = `[${value.length} items]`;
      continue;
    }

    // Strings kürzen
    if (typeof value === 'string' && value.length > 50) {
      sanitized[key] = value.substring(0, 47) + '...';
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

function checkEventIssues(
  eventName: string, 
  eventData: { hasValue: boolean; hasCurrency: boolean; hasItems: boolean },
  platform: 'ga4' | 'ua' | 'both' | 'unknown'
): EcommerceIssue[] {
  const issues: EcommerceIssue[] = [];
  const recommended = RECOMMENDED_VALUE_PARAMS[eventName as keyof typeof RECOMMENDED_VALUE_PARAMS];

  // Purchase Event - kritisch für Wertübergabe
  if (eventName === 'purchase') {
    if (!eventData.hasValue) {
      issues.push({
        severity: 'error',
        event: eventName,
        issue: 'Kein Transaktionswert (value) im Purchase-Event',
        recommendation: 'Fügen Sie den "value" Parameter hinzu für korrekte Umsatzerfassung in Google Ads und Analytics.',
      });
    }
    if (!eventData.hasCurrency) {
      issues.push({
        severity: 'error',
        event: eventName,
        issue: 'Keine Währung (currency) im Purchase-Event',
        recommendation: 'Fügen Sie den "currency" Parameter (z.B. "EUR") hinzu. Ohne Währung werden Werte nicht korrekt verarbeitet.',
      });
    }
    if (!eventData.hasItems) {
      issues.push({
        severity: 'warning',
        event: eventName,
        issue: 'Keine Produktdaten (items) im Purchase-Event',
        recommendation: 'Fügen Sie das "items" Array mit Produktdetails hinzu für bessere Analytics-Berichte.',
      });
    }
  }

  // Add to Cart - wichtig für Conversion-Optimierung
  if (eventName === 'add_to_cart') {
    if (!eventData.hasValue) {
      issues.push({
        severity: 'warning',
        event: eventName,
        issue: 'Kein Wert im add_to_cart Event',
        recommendation: 'Der "value" Parameter ermöglicht bessere Conversion-Wert-Berichte in Google Ads.',
      });
    }
    if (!eventData.hasItems) {
      issues.push({
        severity: 'warning',
        event: eventName,
        issue: 'Keine Produktdaten im add_to_cart Event',
        recommendation: 'Fügen Sie "items" hinzu für produktspezifische Conversion-Daten.',
      });
    }
  }

  // Begin Checkout
  if (eventName === 'begin_checkout') {
    if (!eventData.hasValue) {
      issues.push({
        severity: 'warning',
        event: eventName,
        issue: 'Kein Warenkorbwert im begin_checkout Event',
        recommendation: 'Der "value" Parameter hilft bei der Analyse von Checkout-Abbrüchen.',
      });
    }
  }

  // View Item
  if (eventName === 'view_item') {
    if (!eventData.hasItems) {
      issues.push({
        severity: 'info',
        event: eventName,
        issue: 'Keine Produktdaten im view_item Event',
        recommendation: 'Produktdaten ermöglichen Remarketing-Listen basierend auf Produktansichten.',
      });
    }
  }

  return issues;
}

function analyzeValueTracking(
  dataLayerContent: unknown[], 
  content: string,
  events: EcommerceEvent[]
): EcommerceAnalysis['valueTracking'] {
  const valueParameters: Set<string> = new Set();
  const missingRecommended: string[] = [];

  // Sammle alle Wert-bezogenen Parameter
  const valuePatterns = [
    'value', 'revenue', 'total', 'price', 'amount',
    'transaction_id', 'order_id', 'currency',
    'tax', 'shipping', 'discount', 'coupon',
  ];

  for (const item of dataLayerContent) {
    if (typeof item === 'object' && item !== null) {
      const itemStr = JSON.stringify(item);
      for (const param of valuePatterns) {
        if (itemStr.includes(`"${param}"`) || itemStr.includes(`'${param}'`)) {
          valueParameters.add(param);
        }
      }
    }
  }

  // Auch im Content suchen
  for (const param of valuePatterns) {
    if (content.includes(param)) {
      valueParameters.add(param);
    }
  }

  // Prüfe auf Purchase Event
  const purchaseEvent = events.find(e => e.name === 'purchase');
  if (purchaseEvent) {
    if (!purchaseEvent.hasValue) missingRecommended.push('value');
    if (!purchaseEvent.hasCurrency) missingRecommended.push('currency');
    if (!valueParameters.has('transaction_id')) missingRecommended.push('transaction_id');
  }

  // Prüfe auf Add to Cart Event
  const addToCartEvent = events.find(e => e.name === 'add_to_cart');
  if (addToCartEvent && !addToCartEvent.hasValue) {
    missingRecommended.push('value (add_to_cart)');
  }

  return {
    hasTransactionValue: valueParameters.has('value') || valueParameters.has('revenue'),
    hasCurrency: valueParameters.has('currency'),
    hasItemData: events.some(e => e.hasItems),
    hasUserData: content.includes('user_id') || content.includes('customer_id'),
    valueParameters: Array.from(valueParameters),
    missingRecommended,
  };
}

function findCustomDimensions(dataLayerContent: unknown[], content: string): string[] {
  const dimensions: Set<string> = new Set();

  // GA4 User Properties Pattern
  const userPropPattern = /user_properties\s*:\s*\{([^}]+)\}/g;
  let match;
  while ((match = userPropPattern.exec(content)) !== null) {
    const props = match[1].match(/['"](\w+)['"]/g);
    if (props) {
      props.forEach(p => dimensions.add(p.replace(/['"]/g, '')));
    }
  }

  // Custom Parameter Pattern
  const customPattern = /dimension\d+|cd\d+|custom_/gi;
  const customMatches = content.match(customPattern);
  if (customMatches) {
    customMatches.forEach(m => dimensions.add(m));
  }

  // Aus DataLayer extrahieren
  for (const item of dataLayerContent) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      // Suche nach dimension* oder cd* Keys
      for (const key of Object.keys(obj)) {
        if (/^(dimension|cd)\d+$/i.test(key) || key.startsWith('custom_')) {
          dimensions.add(key);
        }
      }
    }
  }

  return Array.from(dimensions);
}

function findUserProperties(dataLayerContent: unknown[], content: string): string[] {
  const properties: Set<string> = new Set();

  // User ID Patterns
  const userIdPatterns = [
    'user_id', 'userId', 'customer_id', 'customerId',
    'member_id', 'memberId', 'account_id', 'accountId',
  ];

  for (const pattern of userIdPatterns) {
    if (content.includes(pattern)) {
      properties.add(pattern);
    }
  }

  // GA4 set user_properties
  const setUserPattern = /gtag\s*\(\s*['"]set['"]\s*,\s*['"]user_properties['"]\s*,\s*\{([^}]+)\}/g;
  let match;
  while ((match = setUserPattern.exec(content)) !== null) {
    const props = match[1].match(/['"](\w+)['"]\s*:/g);
    if (props) {
      props.forEach(p => properties.add(p.replace(/['":\s]/g, '')));
    }
  }

  // Aus DataLayer
  for (const item of dataLayerContent) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if (obj.user_properties && typeof obj.user_properties === 'object') {
        Object.keys(obj.user_properties as object).forEach(k => properties.add(k));
      }
      // User Data im Event
      for (const key of userIdPatterns) {
        if (obj[key] !== undefined) {
          properties.add(key);
        }
      }
    }
  }

  return Array.from(properties);
}
