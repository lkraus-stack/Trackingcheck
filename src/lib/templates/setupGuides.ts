// Setup-Guides und Templates für verschiedene Plattformen und CMPs

export interface SetupGuide {
  id: string;
  title: string;
  category: 'cmp' | 'ecommerce' | 'platform' | 'tracking';
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedTime: string;
  steps: SetupStep[];
  codeSnippets: CodeSnippet[];
  requirements?: string[];
  warnings?: string[];
  relatedGuides?: string[];
}

export interface SetupStep {
  number: number;
  title: string;
  description: string;
  substeps?: string[];
  image?: string;
  tip?: string;
  warning?: string;
}

export interface CodeSnippet {
  id: string;
  title: string;
  language: 'html' | 'javascript' | 'php' | 'liquid' | 'json';
  description?: string;
  code: string;
  placement?: string;
}

// CMP Setup Guides
export const cmpGuides: SetupGuide[] = [
  {
    id: 'cookiebot-setup',
    title: 'Cookiebot + Google Consent Mode v2',
    category: 'cmp',
    description: 'Komplette Einrichtung von Cookiebot mit Google Consent Mode v2 für DSGVO-Compliance',
    difficulty: 'easy',
    estimatedTime: '30 Minuten',
    requirements: [
      'Cookiebot Account (kostenlos für kleine Websites)',
      'Google Tag Manager Container',
      'Zugriff auf Website-Header',
    ],
    steps: [
      {
        number: 1,
        title: 'Cookiebot Account erstellen',
        description: 'Erstelle einen Account auf cookiebot.com und füge deine Domain hinzu.',
        substeps: [
          'Gehe zu cookiebot.com und registriere dich',
          'Füge deine Domain unter "Domains" hinzu',
          'Warte auf den ersten Cookie-Scan (kann bis zu 24h dauern)',
        ],
        tip: 'Für bis zu 1 Seite/Domain ist Cookiebot kostenlos.',
      },
      {
        number: 2,
        title: 'Cookie-Kategorien konfigurieren',
        description: 'Weise deine Cookies den richtigen Kategorien zu.',
        substeps: [
          'Gehe zu "Cookies" in deinem Cookiebot Dashboard',
          'Prüfe die automatisch erkannten Cookies',
          'Korrigiere falsch kategorisierte Cookies manuell',
        ],
        warning: 'Falsch kategorisierte Cookies können zu DSGVO-Verstößen führen!',
      },
      {
        number: 3,
        title: 'Banner anpassen',
        description: 'Passe das Aussehen des Cookie-Banners an dein Design an.',
        substeps: [
          'Wähle unter "Dialog" ein Template',
          'Passe Farben und Texte an',
          'Aktiviere den "Alle ablehnen" Button',
        ],
        tip: 'Der "Alle ablehnen" Button muss gleich prominent sein wie "Alle akzeptieren".',
      },
      {
        number: 4,
        title: 'Consent Mode v2 Code einbauen',
        description: 'Füge den Consent Mode Default Code VOR dem GTM ein.',
        substeps: [
          'Kopiere den Code-Snippet unten',
          'Füge ihn im <head> VOR dem GTM-Code ein',
          'Ersetze DEINE-COOKIEBOT-ID mit deiner ID',
        ],
      },
      {
        number: 5,
        title: 'Testen',
        description: 'Teste das Setup mit dem Tracking Checker.',
        substeps: [
          'Lösche alle Cookies und öffne die Seite',
          'Prüfe ob der Banner erscheint',
          'Teste "Alle akzeptieren" und "Alle ablehnen"',
          'Führe eine erneute Analyse durch',
        ],
      },
    ],
    codeSnippets: [
      {
        id: 'cookiebot-consent-mode',
        title: 'Consent Mode v2 + Cookiebot',
        language: 'html',
        placement: 'Im <head>, VOR dem GTM-Code',
        code: `<!-- Google Consent Mode v2 Default -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
</script>

<!-- Cookiebot -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" 
  data-cbid="DEINE-COOKIEBOT-ID" 
  data-blockingmode="auto" 
  type="text/javascript">
</script>

<!-- Consent Update nach Cookiebot -->
<script>
  window.addEventListener('CookiebotOnAccept', function() {
    gtag('consent', 'update', {
      'analytics_storage': Cookiebot.consent.statistics ? 'granted' : 'denied',
      'ad_storage': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'ad_user_data': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'ad_personalization': Cookiebot.consent.marketing ? 'granted' : 'denied',
      'functionality_storage': Cookiebot.consent.preferences ? 'granted' : 'denied',
      'personalization_storage': Cookiebot.consent.preferences ? 'granted' : 'denied'
    });
  });
  
  window.addEventListener('CookiebotOnDecline', function() {
    gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied'
    });
  });
</script>

<!-- GTM (NACH Consent Mode!) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>`,
      },
    ],
  },
  {
    id: 'usercentrics-setup',
    title: 'Usercentrics + Google Consent Mode v2',
    category: 'cmp',
    description: 'Professionelles CMP-Setup mit Usercentrics und vollständiger Consent Mode v2 Integration',
    difficulty: 'medium',
    estimatedTime: '45 Minuten',
    requirements: [
      'Usercentrics Account',
      'Google Tag Manager Container',
      'Zugriff auf Website-Header',
    ],
    steps: [
      {
        number: 1,
        title: 'Usercentrics Account & Settings-ID',
        description: 'Erstelle einen Usercentrics Account und hole deine Settings-ID.',
        substeps: [
          'Registriere dich auf usercentrics.com',
          'Erstelle eine neue Konfiguration für deine Domain',
          'Kopiere die Settings-ID aus dem Dashboard',
        ],
      },
      {
        number: 2,
        title: 'Services konfigurieren',
        description: 'Füge alle Tracking-Services hinzu und kategorisiere sie.',
        substeps: [
          'Gehe zu "Service Settings"',
          'Füge Google Analytics, GTM, etc. hinzu',
          'Weise die korrekte Kategorie zu (Essential, Functional, Marketing)',
        ],
      },
      {
        number: 3,
        title: 'Consent Mode v2 aktivieren',
        description: 'Aktiviere die native Consent Mode v2 Unterstützung.',
        substeps: [
          'Gehe zu "Implementation" > "Google Consent Mode"',
          'Aktiviere "Google Consent Mode v2"',
          'Konfiguriere die Parameter-Mappings',
        ],
        tip: 'Usercentrics hat eine native Integration - nutze diese statt eigenen Code!',
      },
      {
        number: 4,
        title: 'Code implementieren',
        description: 'Füge den Usercentrics Code in deine Website ein.',
      },
      {
        number: 5,
        title: 'Testen & Validieren',
        description: 'Teste das komplette Setup.',
        substeps: [
          'Öffne die Seite im Inkognito-Modus',
          'Teste alle Banner-Optionen',
          'Prüfe mit dem Tracking Checker',
        ],
      },
    ],
    codeSnippets: [
      {
        id: 'usercentrics-consent-mode',
        title: 'Consent Mode v2 + Usercentrics',
        language: 'html',
        placement: 'Im <head>, VOR dem GTM-Code',
        code: `<!-- Google Consent Mode v2 Default -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    'security_storage': 'granted',
    'wait_for_update': 2000
  });
</script>

<!-- Usercentrics CMP -->
<script id="usercentrics-cmp" 
  src="https://app.usercentrics.eu/browser-ui/latest/loader.js" 
  data-settings-id="DEINE-SETTINGS-ID" 
  async>
</script>

<!-- Consent Update Handler -->
<script>
  window.addEventListener('UC_UI_CMP_EVENT', function(event) {
    if (event.detail && (event.detail.type === 'ACCEPT_ALL' || 
        event.detail.type === 'DENY_ALL' || 
        event.detail.type === 'SAVE')) {
      updateConsentFromUsercentrics();
    }
  });
  
  window.addEventListener('UC_UI_INITIALIZED', function() {
    updateConsentFromUsercentrics();
  });
  
  function updateConsentFromUsercentrics() {
    if (typeof UC_UI !== 'undefined' && UC_UI.getServicesBaseInfo) {
      const services = UC_UI.getServicesBaseInfo();
      let analyticsConsent = false;
      let marketingConsent = false;
      
      services.forEach(function(service) {
        if (service.consent && service.consent.status) {
          const name = service.name.toLowerCase();
          if (name.includes('google analytics') || name.includes('analytics')) {
            analyticsConsent = true;
          }
          if (name.includes('google ads') || name.includes('facebook') || 
              name.includes('meta') || name.includes('marketing')) {
            marketingConsent = true;
          }
        }
      });
      
      gtag('consent', 'update', {
        'analytics_storage': analyticsConsent ? 'granted' : 'denied',
        'ad_storage': marketingConsent ? 'granted' : 'denied',
        'ad_user_data': marketingConsent ? 'granted' : 'denied',
        'ad_personalization': marketingConsent ? 'granted' : 'denied'
      });
      
      // DataLayer Event für GTM
      dataLayer.push({
        'event': 'consent_update',
        'consent_analytics': analyticsConsent,
        'consent_marketing': marketingConsent
      });
    }
  }
</script>

<!-- GTM (NACH Consent Mode!) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>`,
      },
    ],
  },
];

// E-Commerce Setup Guides
export const ecommerceGuides: SetupGuide[] = [
  {
    id: 'shopify-ga4-ecommerce',
    title: 'Shopify + GA4 E-Commerce Tracking',
    category: 'ecommerce',
    description: 'Vollständiges E-Commerce Tracking für Shopify mit GA4 und Consent Mode',
    difficulty: 'medium',
    estimatedTime: '60 Minuten',
    requirements: [
      'Shopify Store (Basic Plan oder höher)',
      'Google Analytics 4 Property',
      'Google Tag Manager Container',
    ],
    steps: [
      {
        number: 1,
        title: 'GA4 Property erstellen',
        description: 'Erstelle eine neue GA4 Property für deinen Shop.',
        substeps: [
          'Gehe zu analytics.google.com',
          'Erstelle eine neue Property',
          'Aktiviere "Enhanced Measurement" für automatische Events',
        ],
      },
      {
        number: 2,
        title: 'GTM in Shopify einbinden',
        description: 'Füge den GTM Container zu deinem Shopify Theme hinzu.',
        substeps: [
          'Gehe zu Online Store > Themes > Actions > Edit Code',
          'Öffne theme.liquid',
          'Füge den GTM Code im <head> ein',
          'Füge den noscript-Teil nach <body> ein',
        ],
        warning: 'Nutze NICHT die native Shopify-GTM Integration - sie unterstützt kein Consent Mode!',
      },
      {
        number: 3,
        title: 'DataLayer für E-Commerce',
        description: 'Implementiere den DataLayer für E-Commerce Events.',
        substeps: [
          'Erstelle ein neues Snippet in Shopify',
          'Füge den E-Commerce DataLayer Code ein',
          'Binde das Snippet in die relevanten Templates ein',
        ],
      },
      {
        number: 4,
        title: 'GTM Tags konfigurieren',
        description: 'Erstelle die GA4 E-Commerce Tags in GTM.',
        substeps: [
          'Erstelle GA4 Configuration Tag',
          'Erstelle Tags für: view_item, add_to_cart, begin_checkout, purchase',
          'Konfiguriere Consent-basierte Trigger',
        ],
      },
      {
        number: 5,
        title: 'Conversion Tracking',
        description: 'Richte das Purchase Tracking für Google Ads ein.',
        substeps: [
          'Erstelle Google Ads Conversion Tag',
          'Verknüpfe mit dem purchase Event',
          'Füge Enhanced Conversions hinzu',
        ],
      },
    ],
    codeSnippets: [
      {
        id: 'shopify-datalayer',
        title: 'Shopify DataLayer für GA4 E-Commerce',
        language: 'liquid',
        placement: 'theme.liquid, vor </head>',
        description: 'DataLayer Push für Product Pages, Cart und Checkout',
        code: `{% comment %} GA4 E-Commerce DataLayer {% endcomment %}
<script>
  window.dataLayer = window.dataLayer || [];
  
  {% if template contains 'product' %}
  dataLayer.push({
    'event': 'view_item',
    'ecommerce': {
      'currency': '{{ shop.currency }}',
      'value': {{ product.selected_or_first_available_variant.price | money_without_currency | remove: ',' }},
      'items': [{
        'item_id': '{{ product.selected_or_first_available_variant.sku | default: product.id }}',
        'item_name': '{{ product.title | escape }}',
        'item_brand': '{{ product.vendor | escape }}',
        'item_category': '{{ product.type | escape }}',
        'price': {{ product.selected_or_first_available_variant.price | money_without_currency | remove: ',' }},
        'quantity': 1
      }]
    }
  });
  {% endif %}
  
  {% if template contains 'cart' %}
  dataLayer.push({
    'event': 'view_cart',
    'ecommerce': {
      'currency': '{{ shop.currency }}',
      'value': {{ cart.total_price | money_without_currency | remove: ',' }},
      'items': [
        {% for item in cart.items %}
        {
          'item_id': '{{ item.sku | default: item.product_id }}',
          'item_name': '{{ item.product.title | escape }}',
          'item_brand': '{{ item.product.vendor | escape }}',
          'item_variant': '{{ item.variant.title | escape }}',
          'price': {{ item.final_price | money_without_currency | remove: ',' }},
          'quantity': {{ item.quantity }}
        }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ]
    }
  });
  {% endif %}
</script>`,
      },
      {
        id: 'shopify-purchase',
        title: 'Shopify Purchase Event (Checkout)',
        language: 'liquid',
        placement: 'Additional Scripts in Shopify Checkout Settings',
        description: 'Wird nach erfolgreichem Kauf ausgeführt',
        code: `{% if first_time_accessed %}
<script>
  window.dataLayer = window.dataLayer || [];
  dataLayer.push({
    'event': 'purchase',
    'ecommerce': {
      'transaction_id': '{{ order.order_number }}',
      'currency': '{{ shop.currency }}',
      'value': {{ total_price | money_without_currency | remove: ',' }},
      'tax': {{ tax_price | money_without_currency | remove: ',' }},
      'shipping': {{ shipping_price | money_without_currency | remove: ',' }},
      'items': [
        {% for item in line_items %}
        {
          'item_id': '{{ item.sku | default: item.product_id }}',
          'item_name': '{{ item.product.title | escape }}',
          'item_brand': '{{ item.vendor | escape }}',
          'item_variant': '{{ item.variant.title | escape }}',
          'price': {{ item.final_price | money_without_currency | remove: ',' }},
          'quantity': {{ item.quantity }}
        }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ]
    }
  });
</script>
{% endif %}`,
      },
      {
        id: 'shopify-add-to-cart',
        title: 'Add to Cart Event',
        language: 'javascript',
        placement: 'Theme-spezifisch, meist in product-form.liquid oder per Custom JS',
        code: `// Add to Cart Event für Shopify
document.addEventListener('DOMContentLoaded', function() {
  // Für Standard Shopify Themes
  const addToCartForms = document.querySelectorAll('form[action*="/cart/add"]');
  
  addToCartForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const productData = {
        item_id: form.querySelector('[name="id"]')?.value,
        item_name: document.querySelector('.product__title, .product-single__title, h1.title')?.textContent?.trim(),
        price: parseFloat(document.querySelector('.product__price, .price__regular .price-item')?.textContent?.replace(/[^0-9.,]/g, '')?.replace(',', '.')) || 0,
        quantity: parseInt(form.querySelector('[name="quantity"]')?.value) || 1
      };
      
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'add_to_cart',
        'ecommerce': {
          'currency': window.Shopify?.currency?.active || 'EUR',
          'value': productData.price * productData.quantity,
          'items': [productData]
        }
      });
    });
  });
});`,
      },
    ],
  },
  {
    id: 'woocommerce-ga4-ecommerce',
    title: 'WooCommerce + GA4 E-Commerce Tracking',
    category: 'ecommerce',
    description: 'E-Commerce Tracking für WooCommerce mit GA4 und GTM',
    difficulty: 'medium',
    estimatedTime: '45 Minuten',
    requirements: [
      'WordPress mit WooCommerce',
      'Google Analytics 4 Property',
      'Google Tag Manager Container',
      'Optional: GTM4WP Plugin',
    ],
    steps: [
      {
        number: 1,
        title: 'Plugin installieren',
        description: 'Installiere das GTM4WP Plugin für automatisches DataLayer.',
        substeps: [
          'Gehe zu Plugins > Installieren',
          'Suche nach "GTM4WP" oder "Google Tag Manager for WordPress"',
          'Installieren und aktivieren',
        ],
        tip: 'GTM4WP fügt automatisch alle E-Commerce Events zum DataLayer hinzu!',
      },
      {
        number: 2,
        title: 'GTM4WP konfigurieren',
        description: 'Richte das Plugin für GA4 E-Commerce ein.',
        substeps: [
          'Gehe zu Einstellungen > Google Tag Manager',
          'Gib deine GTM Container ID ein',
          'Aktiviere unter "Integration": WooCommerce',
          'Wähle "GA4" als E-Commerce Format',
        ],
      },
      {
        number: 3,
        title: 'Consent Management',
        description: 'Integriere ein CMP Plugin.',
        substeps: [
          'Installiere Complianz, Borlabs Cookie oder ähnliches',
          'Konfiguriere Consent Mode v2',
          'Verknüpfe mit GTM',
        ],
      },
      {
        number: 4,
        title: 'GTM Tags einrichten',
        description: 'Erstelle die notwendigen Tags in GTM.',
      },
    ],
    codeSnippets: [
      {
        id: 'woo-consent-mode',
        title: 'Consent Mode für WooCommerce (ohne Plugin)',
        language: 'php',
        placement: 'functions.php des Child-Themes',
        code: `<?php
// Google Consent Mode v2 für WooCommerce
add_action('wp_head', 'add_consent_mode_default', 1);
function add_consent_mode_default() {
    ?>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        
        gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'functionality_storage': 'denied',
            'personalization_storage': 'denied',
            'security_storage': 'granted',
            'wait_for_update': 500
        });
    </script>
    <?php
}

// Purchase Event auf Thank You Page
add_action('woocommerce_thankyou', 'ga4_purchase_tracking', 10, 1);
function ga4_purchase_tracking($order_id) {
    if (!$order_id) return;
    
    $order = wc_get_order($order_id);
    if ($order->get_meta('_ga4_tracked')) return;
    
    $items = array();
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $items[] = array(
            'item_id' => $product->get_sku() ?: $product->get_id(),
            'item_name' => $item->get_name(),
            'price' => floatval($item->get_subtotal() / $item->get_quantity()),
            'quantity' => $item->get_quantity(),
        );
    }
    
    ?>
    <script>
        window.dataLayer = window.dataLayer || [];
        dataLayer.push({
            'event': 'purchase',
            'ecommerce': {
                'transaction_id': '<?php echo $order->get_order_number(); ?>',
                'currency': '<?php echo $order->get_currency(); ?>',
                'value': <?php echo $order->get_total(); ?>,
                'tax': <?php echo $order->get_total_tax(); ?>,
                'shipping': <?php echo $order->get_shipping_total(); ?>,
                'items': <?php echo json_encode($items); ?>
            }
        });
    </script>
    <?php
    
    $order->update_meta_data('_ga4_tracked', true);
    $order->save();
}
?>`,
      },
    ],
  },
];

// Alle Guides zusammengefasst
export const allGuides: SetupGuide[] = [
  ...cmpGuides,
  ...ecommerceGuides,
];

// Guide nach ID finden
export function getGuideById(id: string): SetupGuide | undefined {
  return allGuides.find(g => g.id === id);
}

// Guides nach Kategorie filtern
export function getGuidesByCategory(category: SetupGuide['category']): SetupGuide[] {
  return allGuides.filter(g => g.category === category);
}
