// GTM Container Templates für verschiedene Setups
// Generiert importierbare GTM Container JSON-Dateien

import { AnalysisResult } from '@/types';

export interface GTMContainerTemplate {
  exportFormatVersion: number;
  exportTime: string;
  containerVersion: {
    tag: GTMTag[];
    trigger: GTMTrigger[];
    variable: GTMVariable[];
    folder: GTMFolder[];
  };
}

export interface GTMTag {
  accountId: string;
  containerId: string;
  tagId: string;
  name: string;
  type: string;
  parameter: GTMParameter[];
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  consentSettings?: {
    consentStatus: string;
    consentType?: {
      list: string[];
    };
  };
}

export interface GTMTrigger {
  accountId: string;
  containerId: string;
  triggerId: string;
  name: string;
  type: string;
  filter?: GTMFilter[];
  customEventFilter?: GTMFilter[];
}

export interface GTMVariable {
  accountId: string;
  containerId: string;
  variableId: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
}

export interface GTMFolder {
  accountId: string;
  containerId: string;
  folderId: string;
  name: string;
}

export interface GTMParameter {
  type: string;
  key: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
}

export interface GTMFilter {
  type: string;
  parameter: GTMParameter[];
}

// Generiere vollständigen GTM Container mit Consent Mode
export function generateGTMContainer(
  analysis: AnalysisResult,
  options: {
    includeGA4?: boolean;
    includeMeta?: boolean;
    includeConversionTags?: boolean;
    cmpType?: string;
  } = {}
): GTMContainerTemplate {
  const timestamp = new Date().toISOString();
  const containerId = analysis.trackingTags.googleTagManager.containerId || 'GTM-XXXXXXX';
  
  const tags: GTMTag[] = [];
  const triggers: GTMTrigger[] = [];
  const variables: GTMVariable[] = [];
  const folders: GTMFolder[] = [];

  // Folder für Organisation
  folders.push({
    accountId: '0',
    containerId: '0',
    folderId: '1',
    name: 'Consent Management',
  });
  
  folders.push({
    accountId: '0',
    containerId: '0',
    folderId: '2',
    name: 'Analytics',
  });

  folders.push({
    accountId: '0',
    containerId: '0',
    folderId: '3',
    name: 'Marketing',
  });

  // Standard Variablen
  variables.push(
    createDataLayerVariable('1', 'DLV - Consent Analytics', 'consent_analytics'),
    createDataLayerVariable('2', 'DLV - Consent Marketing', 'consent_marketing'),
    createDataLayerVariable('3', 'DLV - Page Path', 'page_path'),
    createDataLayerVariable('4', 'DLV - Page Title', 'page_title'),
    createConstantVariable('5', 'Const - GA4 Measurement ID', analysis.trackingTags.googleAnalytics.measurementId || 'G-XXXXXXXX'),
  );

  if (analysis.trackingTags.metaPixel.detected) {
    variables.push(
      createConstantVariable('6', 'Const - Meta Pixel ID', analysis.trackingTags.metaPixel.pixelId || ''),
    );
  }

  if (analysis.trackingTags.googleAdsConversion?.detected) {
    variables.push(
      createConstantVariable('7', 'Const - Google Ads Conversion ID', analysis.trackingTags.googleAdsConversion.conversionId || ''),
    );
  }

  // Consent Mode Default Tag
  tags.push({
    accountId: '0',
    containerId: '0',
    tagId: '1',
    name: 'Consent Mode - Default',
    type: 'gcmdefault',
    parameter: [
      { type: 'TEMPLATE', key: 'analytics_storage', value: 'denied' },
      { type: 'TEMPLATE', key: 'ad_storage', value: 'denied' },
      { type: 'TEMPLATE', key: 'ad_user_data', value: 'denied' },
      { type: 'TEMPLATE', key: 'ad_personalization', value: 'denied' },
      { type: 'TEMPLATE', key: 'functionality_storage', value: 'denied' },
      { type: 'TEMPLATE', key: 'personalization_storage', value: 'denied' },
      { type: 'TEMPLATE', key: 'security_storage', value: 'granted' },
      { type: 'TEMPLATE', key: 'wait_for_update', value: '500' },
    ],
    firingTriggerId: ['2147479553'], // Consent Initialization - All Pages
    consentSettings: {
      consentStatus: 'notSet',
    },
  });

  // Consent Update Trigger
  triggers.push({
    accountId: '0',
    containerId: '0',
    triggerId: '1',
    name: 'CE - consent_update',
    type: 'customEvent',
    customEventFilter: [
      {
        type: 'equals',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
          { type: 'TEMPLATE', key: 'arg1', value: 'consent_update' },
        ],
      },
    ],
  });

  // All Pages Trigger
  triggers.push({
    accountId: '0',
    containerId: '0',
    triggerId: '2',
    name: 'All Pages',
    type: 'pageview',
  });

  // Analytics Consent Trigger
  triggers.push({
    accountId: '0',
    containerId: '0',
    triggerId: '3',
    name: 'Consent - Analytics Granted',
    type: 'customEvent',
    customEventFilter: [
      {
        type: 'equals',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
          { type: 'TEMPLATE', key: 'arg1', value: 'consent_update' },
        ],
      },
    ],
    filter: [
      {
        type: 'equals',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{DLV - Consent Analytics}}' },
          { type: 'TEMPLATE', key: 'arg1', value: 'true' },
        ],
      },
    ],
  });

  // Marketing Consent Trigger
  triggers.push({
    accountId: '0',
    containerId: '0',
    triggerId: '4',
    name: 'Consent - Marketing Granted',
    type: 'customEvent',
    customEventFilter: [
      {
        type: 'equals',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
          { type: 'TEMPLATE', key: 'arg1', value: 'consent_update' },
        ],
      },
    ],
    filter: [
      {
        type: 'equals',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{DLV - Consent Marketing}}' },
          { type: 'TEMPLATE', key: 'arg1', value: 'true' },
        ],
      },
    ],
  });

  // Consent Mode Update Tag
  tags.push({
    accountId: '0',
    containerId: '0',
    tagId: '2',
    name: 'Consent Mode - Update',
    type: 'gcmupdate',
    parameter: [
      { 
        type: 'TEMPLATE', 
        key: 'analytics_storage', 
        value: '{{DLV - Consent Analytics}}' 
      },
      { 
        type: 'TEMPLATE', 
        key: 'ad_storage', 
        value: '{{DLV - Consent Marketing}}' 
      },
      { 
        type: 'TEMPLATE', 
        key: 'ad_user_data', 
        value: '{{DLV - Consent Marketing}}' 
      },
      { 
        type: 'TEMPLATE', 
        key: 'ad_personalization', 
        value: '{{DLV - Consent Marketing}}' 
      },
    ],
    firingTriggerId: ['1'], // CE - consent_update
    consentSettings: {
      consentStatus: 'notSet',
    },
  });

  // GA4 Configuration Tag (wenn aktiviert)
  if (options.includeGA4 !== false && analysis.trackingTags.googleAnalytics.detected) {
    tags.push({
      accountId: '0',
      containerId: '0',
      tagId: '3',
      name: 'GA4 - Configuration',
      type: 'gaawc',
      parameter: [
        { type: 'TEMPLATE', key: 'measurementId', value: '{{Const - GA4 Measurement ID}}' },
        { type: 'BOOLEAN', key: 'sendPageView', value: 'true' },
        { type: 'BOOLEAN', key: 'enableSendToServerContainer', value: 'false' },
      ],
      firingTriggerId: ['2'], // All Pages
      consentSettings: {
        consentStatus: 'needed',
        consentType: {
          list: ['analytics_storage'],
        },
      },
    });
  }

  // Meta Pixel (wenn aktiviert)
  if (options.includeMeta !== false && analysis.trackingTags.metaPixel.detected) {
    tags.push({
      accountId: '0',
      containerId: '0',
      tagId: '4',
      name: 'Meta Pixel - PageView',
      type: 'html',
      parameter: [
        { 
          type: 'TEMPLATE', 
          key: 'html', 
          value: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{Const - Meta Pixel ID}}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`
        },
        { type: 'BOOLEAN', key: 'supportDocumentWrite', value: 'false' },
      ],
      firingTriggerId: ['4'], // Marketing Consent
      consentSettings: {
        consentStatus: 'needed',
        consentType: {
          list: ['ad_storage'],
        },
      },
    });
  }

  // Google Ads Conversion Tag (wenn aktiviert)
  if (options.includeConversionTags !== false && analysis.trackingTags.googleAdsConversion?.detected) {
    tags.push({
      accountId: '0',
      containerId: '0',
      tagId: '5',
      name: 'Google Ads - Conversion Linker',
      type: 'gclidw',
      parameter: [
        { type: 'BOOLEAN', key: 'enableCrossDomain', value: 'false' },
        { type: 'BOOLEAN', key: 'enableUrlPassthrough', value: 'false' },
      ],
      firingTriggerId: ['2'], // All Pages
      consentSettings: {
        consentStatus: 'needed',
        consentType: {
          list: ['ad_storage'],
        },
      },
    });
  }

  return {
    exportFormatVersion: 2,
    exportTime: timestamp,
    containerVersion: {
      tag: tags,
      trigger: triggers,
      variable: variables,
      folder: folders,
    },
  };
}

// Helper: DataLayer Variable erstellen
function createDataLayerVariable(id: string, name: string, dataLayerName: string): GTMVariable {
  return {
    accountId: '0',
    containerId: '0',
    variableId: id,
    name,
    type: 'v',
    parameter: [
      { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
      { type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' },
      { type: 'TEMPLATE', key: 'name', value: dataLayerName },
    ],
  };
}

// Helper: Constant Variable erstellen
function createConstantVariable(id: string, name: string, value: string): GTMVariable {
  return {
    accountId: '0',
    containerId: '0',
    variableId: id,
    name,
    type: 'c',
    parameter: [
      { type: 'TEMPLATE', key: 'value', value },
    ],
  };
}

// E-Commerce Tags generieren
export function generateEcommerceGTMTags(platform: 'ga4' | 'shopify' | 'woocommerce' | 'shopware'): GTMTag[] {
  const tags: GTMTag[] = [];
  
  const ecommerceEvents = [
    { event: 'view_item', name: 'GA4 - view_item' },
    { event: 'add_to_cart', name: 'GA4 - add_to_cart' },
    { event: 'remove_from_cart', name: 'GA4 - remove_from_cart' },
    { event: 'view_cart', name: 'GA4 - view_cart' },
    { event: 'begin_checkout', name: 'GA4 - begin_checkout' },
    { event: 'add_shipping_info', name: 'GA4 - add_shipping_info' },
    { event: 'add_payment_info', name: 'GA4 - add_payment_info' },
    { event: 'purchase', name: 'GA4 - purchase' },
  ];

  ecommerceEvents.forEach((e, index) => {
    tags.push({
      accountId: '0',
      containerId: '0',
      tagId: `100${index}`,
      name: e.name,
      type: 'gaawe',
      parameter: [
        { type: 'TEMPLATE', key: 'eventName', value: e.event },
        { type: 'TEMPLATE', key: 'measurementIdOverride', value: '{{Const - GA4 Measurement ID}}' },
        { type: 'BOOLEAN', key: 'sendEcommerceData', value: 'true' },
        { type: 'TEMPLATE', key: 'getEcommerceDataFrom', value: 'dataLayer' },
      ],
      firingTriggerId: [`10${index}`], // Custom Event Trigger
      consentSettings: {
        consentStatus: 'needed',
        consentType: {
          list: ['analytics_storage'],
        },
      },
    });
  });

  return tags;
}

// Export als JSON-String für Download
export function exportGTMContainerAsJSON(container: GTMContainerTemplate): string {
  return JSON.stringify(container, null, 2);
}
