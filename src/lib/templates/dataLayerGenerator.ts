// DataLayer Event Generator
// Generiert korrekten DataLayer Code für verschiedene Events und Plattformen

export interface DataLayerEvent {
  event: string;
  category: 'pageview' | 'ecommerce' | 'engagement' | 'conversion' | 'custom';
  description: string;
  requiredParams: string[];
  optionalParams: string[];
  ga4EventName: string;
}

export const standardEvents: DataLayerEvent[] = [
  // Pageview Events
  {
    event: 'page_view',
    category: 'pageview',
    description: 'Wird bei jedem Seitenaufruf ausgelöst',
    requiredParams: [],
    optionalParams: ['page_title', 'page_location', 'page_path'],
    ga4EventName: 'page_view',
  },
  
  // E-Commerce Events
  {
    event: 'view_item_list',
    category: 'ecommerce',
    description: 'Produktliste wurde angezeigt (Kategorieseite, Suchergebnisse)',
    requiredParams: ['items'],
    optionalParams: ['item_list_id', 'item_list_name'],
    ga4EventName: 'view_item_list',
  },
  {
    event: 'view_item',
    category: 'ecommerce',
    description: 'Einzelnes Produkt wurde angezeigt (Produktdetailseite)',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: [],
    ga4EventName: 'view_item',
  },
  {
    event: 'select_item',
    category: 'ecommerce',
    description: 'Produkt wurde aus einer Liste ausgewählt',
    requiredParams: ['items'],
    optionalParams: ['item_list_id', 'item_list_name'],
    ga4EventName: 'select_item',
  },
  {
    event: 'add_to_cart',
    category: 'ecommerce',
    description: 'Produkt wurde zum Warenkorb hinzugefügt',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: [],
    ga4EventName: 'add_to_cart',
  },
  {
    event: 'remove_from_cart',
    category: 'ecommerce',
    description: 'Produkt wurde aus dem Warenkorb entfernt',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: [],
    ga4EventName: 'remove_from_cart',
  },
  {
    event: 'view_cart',
    category: 'ecommerce',
    description: 'Warenkorb wurde angezeigt',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: [],
    ga4EventName: 'view_cart',
  },
  {
    event: 'begin_checkout',
    category: 'ecommerce',
    description: 'Checkout-Prozess wurde gestartet',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: ['coupon'],
    ga4EventName: 'begin_checkout',
  },
  {
    event: 'add_shipping_info',
    category: 'ecommerce',
    description: 'Versandinformationen wurden eingegeben',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: ['shipping_tier', 'coupon'],
    ga4EventName: 'add_shipping_info',
  },
  {
    event: 'add_payment_info',
    category: 'ecommerce',
    description: 'Zahlungsinformationen wurden eingegeben',
    requiredParams: ['items', 'currency', 'value'],
    optionalParams: ['payment_type', 'coupon'],
    ga4EventName: 'add_payment_info',
  },
  {
    event: 'purchase',
    category: 'ecommerce',
    description: 'Kauf wurde abgeschlossen',
    requiredParams: ['transaction_id', 'items', 'currency', 'value'],
    optionalParams: ['tax', 'shipping', 'coupon', 'affiliation'],
    ga4EventName: 'purchase',
  },
  {
    event: 'refund',
    category: 'ecommerce',
    description: 'Bestellung wurde erstattet',
    requiredParams: ['transaction_id', 'currency', 'value'],
    optionalParams: ['items'],
    ga4EventName: 'refund',
  },
  
  // Engagement Events
  {
    event: 'login',
    category: 'engagement',
    description: 'Nutzer hat sich eingeloggt',
    requiredParams: [],
    optionalParams: ['method'],
    ga4EventName: 'login',
  },
  {
    event: 'sign_up',
    category: 'engagement',
    description: 'Nutzer hat sich registriert',
    requiredParams: [],
    optionalParams: ['method'],
    ga4EventName: 'sign_up',
  },
  {
    event: 'search',
    category: 'engagement',
    description: 'Suche wurde durchgeführt',
    requiredParams: ['search_term'],
    optionalParams: [],
    ga4EventName: 'search',
  },
  {
    event: 'share',
    category: 'engagement',
    description: 'Inhalt wurde geteilt',
    requiredParams: [],
    optionalParams: ['method', 'content_type', 'item_id'],
    ga4EventName: 'share',
  },
  
  // Conversion Events
  {
    event: 'generate_lead',
    category: 'conversion',
    description: 'Lead wurde generiert (z.B. Kontaktformular)',
    requiredParams: [],
    optionalParams: ['value', 'currency'],
    ga4EventName: 'generate_lead',
  },
];

// DataLayer Code Generator
export function generateDataLayerCode(
  eventType: string,
  params: Record<string, unknown>,
  options: {
    includeEcommerceClear?: boolean;
    format?: 'standard' | 'gtm';
  } = {}
): string {
  const { includeEcommerceClear = true, format = 'standard' } = options;
  
  const event = standardEvents.find(e => e.event === eventType);
  const isEcommerceEvent = event?.category === 'ecommerce';
  
  let code = 'window.dataLayer = window.dataLayer || [];\n';
  
  // Bei E-Commerce Events zuerst den alten ecommerce-Wert löschen
  if (isEcommerceEvent && includeEcommerceClear) {
    code += "dataLayer.push({ ecommerce: null }); // Clear previous ecommerce data\n";
  }
  
  // DataLayer Push
  const pushData: Record<string, unknown> = {
    event: eventType,
  };
  
  if (isEcommerceEvent) {
    pushData.ecommerce = params;
  } else {
    Object.assign(pushData, params);
  }
  
  code += `dataLayer.push(${JSON.stringify(pushData, null, 2)});`;
  
  return code;
}

// Beispiel-Code für verschiedene Events generieren
export function generateExampleCode(eventType: string): string {
  switch (eventType) {
    case 'view_item':
      return generateDataLayerCode('view_item', {
        currency: 'EUR',
        value: 99.99,
        items: [{
          item_id: 'SKU_12345',
          item_name: 'Produktname',
          item_brand: 'Markenname',
          item_category: 'Kategorie',
          item_category2: 'Unterkategorie',
          item_variant: 'Variante',
          price: 99.99,
          quantity: 1,
        }],
      });
      
    case 'add_to_cart':
      return generateDataLayerCode('add_to_cart', {
        currency: 'EUR',
        value: 99.99,
        items: [{
          item_id: 'SKU_12345',
          item_name: 'Produktname',
          item_brand: 'Markenname',
          item_category: 'Kategorie',
          price: 99.99,
          quantity: 1,
        }],
      });
      
    case 'purchase':
      return generateDataLayerCode('purchase', {
        transaction_id: 'T_12345',
        currency: 'EUR',
        value: 199.98,
        tax: 31.93,
        shipping: 4.99,
        coupon: 'SUMMER_SALE',
        items: [
          {
            item_id: 'SKU_12345',
            item_name: 'Produkt 1',
            item_brand: 'Marke',
            item_category: 'Kategorie',
            price: 99.99,
            quantity: 2,
          },
        ],
      });
      
    case 'generate_lead':
      return generateDataLayerCode('generate_lead', {
        value: 100,
        currency: 'EUR',
      });
      
    case 'search':
      return generateDataLayerCode('search', {
        search_term: 'Suchbegriff',
      });
      
    default:
      return generateDataLayerCode(eventType, {});
  }
}

// Consent Update DataLayer Code
export function generateConsentUpdateCode(
  analyticsConsent: boolean,
  marketingConsent: boolean,
  functionalConsent: boolean = false
): string {
  return `// Consent Update nach Nutzerinteraktion
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('consent', 'update', {
  'analytics_storage': ${analyticsConsent ? "'granted'" : "'denied'"},
  'ad_storage': ${marketingConsent ? "'granted'" : "'denied'"},
  'ad_user_data': ${marketingConsent ? "'granted'" : "'denied'"},
  'ad_personalization': ${marketingConsent ? "'granted'" : "'denied'"},
  'functionality_storage': ${functionalConsent ? "'granted'" : "'denied'"},
  'personalization_storage': ${functionalConsent ? "'granted'" : "'denied'"}
});

// Event für GTM Trigger
dataLayer.push({
  'event': 'consent_update',
  'consent_analytics': ${analyticsConsent},
  'consent_marketing': ${marketingConsent},
  'consent_functional': ${functionalConsent}
});`;
}

// Item-Array Generator für E-Commerce
export function generateItemsArray(items: Array<{
  id: string;
  name: string;
  brand?: string;
  category?: string;
  variant?: string;
  price: number;
  quantity: number;
}>): string {
  const formattedItems = items.map(item => ({
    item_id: item.id,
    item_name: item.name,
    item_brand: item.brand || undefined,
    item_category: item.category || undefined,
    item_variant: item.variant || undefined,
    price: item.price,
    quantity: item.quantity,
  }));
  
  return JSON.stringify(formattedItems, null, 2);
}

// Validiere DataLayer Push
export function validateDataLayerPush(
  eventType: string,
  params: Record<string, unknown>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const event = standardEvents.find(e => e.event === eventType);
  
  if (!event) {
    warnings.push(`Event "${eventType}" ist kein Standard-Event. Custom Events sind erlaubt, aber prüfe die Benennung.`);
    return { valid: true, errors, warnings };
  }
  
  // Prüfe erforderliche Parameter
  for (const param of event.requiredParams) {
    if (event.category === 'ecommerce') {
      if (!(param in params)) {
        errors.push(`Erforderlicher Parameter "${param}" fehlt.`);
      }
    } else {
      if (!(param in params)) {
        errors.push(`Erforderlicher Parameter "${param}" fehlt.`);
      }
    }
  }
  
  // E-Commerce spezifische Validierung
  if (event.category === 'ecommerce') {
    if (params.items && Array.isArray(params.items)) {
      const items = params.items as Array<Record<string, unknown>>;
      
      if (items.length === 0) {
        errors.push('Das items-Array darf nicht leer sein.');
      }
      
      items.forEach((item, index) => {
        if (!item.item_id && !item.item_name) {
          errors.push(`Item ${index + 1}: item_id oder item_name ist erforderlich.`);
        }
        if (typeof item.price !== 'number') {
          warnings.push(`Item ${index + 1}: price sollte eine Zahl sein.`);
        }
        if (typeof item.quantity !== 'number') {
          warnings.push(`Item ${index + 1}: quantity sollte eine Zahl sein.`);
        }
      });
    }
    
    if (params.value && typeof params.value !== 'number') {
      errors.push('value muss eine Zahl sein.');
    }
    
    if (!params.currency) {
      warnings.push('currency fehlt. Empfohlen: "EUR" oder ISO-4217 Code.');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
