/**
 * WhatsApp Lead Automation - Google Apps Script
 * Sheet: TEC - Leads
 * 
 * Automatically polls the sheet for new Meta/Facebook Ads leads,
 * parses Full Name, Phone Number, and Campaign metadata,
 * sends them to the WhatsApp Automation API,
 * and stamps the row with "PROCESSED: <timestamp>" to prevent duplicates.
 */

// ==========================================
// CONFIGURATION
// ==========================================
const DEFAULT_CONFIG = {
  // Live Backend Webhook URL
  BACKEND_URL: 'https://pixodaautomation.vercel.app/api/leads/webhook',
  
  // Webhook Secret (must match WEBHOOK_SECRET in backend .env)
  WEBHOOK_SECRET: 'my_secure_webhook_secret_2026',
  
  // Status column header to track processed rows
  PROCESSED_COLUMN_NAME: 'Automated_Status',
  
  // Number of rows to process per minute run
  BATCH_SIZE: 25,
};

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    BACKEND_URL: props.getProperty('BACKEND_URL') || DEFAULT_CONFIG.BACKEND_URL,
    WEBHOOK_SECRET: props.getProperty('WEBHOOK_SECRET') || DEFAULT_CONFIG.WEBHOOK_SECRET,
    PROCESSED_COLUMN_NAME: props.getProperty('PROCESSED_COLUMN_NAME') || DEFAULT_CONFIG.PROCESSED_COLUMN_NAME,
    BATCH_SIZE: parseInt(props.getProperty('BATCH_SIZE') || String(DEFAULT_CONFIG.BATCH_SIZE), 10),
  };
}

/**
 * Run this ONCE from the editor to automate lead processing 24/7 every 1 minute.
 */
function setupMinuteTrigger() {
  const existingTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existingTriggers.length; i++) {
    if (existingTriggers[i].getHandlerFunction() === 'processNewLeads') {
      ScriptApp.deleteTrigger(existingTriggers[i]);
    }
  }

  ScriptApp.newTrigger('processNewLeads')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Automated 1-minute trigger installed successfully. New leads will be processed automatically.');
}

/**
 * Main function executed every minute (or manually by clicking Run).
 */
function processNewLeads() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const sheetName = sheet.getName();

  if (data.length < 2) {
    Logger.log(`⚠️ Sheet "${sheetName}" has no data rows yet.`);
    return;
  }

  const rawHeaders = data[0];
  const headers = rawHeaders.map(h => String(h || '').trim());
  
  // 1. Identify Name Column (Priority: full_name, name, or any non-ad name)
  let nameCol = headers.findIndex(h => /^(full[\s_-]*name|name|lead[\s_-]*name|customer[\s_-]*name|contact[\s_-]*name)$/i.test(h));
  if (nameCol === -1) {
    nameCol = headers.findIndex(h => /name/i.test(h) && !/(ad|adset|campaign|form|page|file|sheet)[\s_-]*name/i.test(h));
  }

  // 2. Identify Phone Column (Priority: phone_number, phone, mobile, whatsapp)
  let phoneCol = headers.findIndex(h => /^(phone|phone[\s_-]*number|mobile|mobile[\s_-]*number|whatsapp|tel|contact[\s_-]*no)$/i.test(h));
  if (phoneCol === -1) {
    phoneCol = headers.findIndex(h => /(phone|mobile|whatsapp)/i.test(h));
  }

  // 3. Identify Email Column
  let emailCol = headers.findIndex(h => /^(email|email[\s_-]*address|mail)$/i.test(h));
  if (emailCol === -1) {
    emailCol = headers.findIndex(h => /(email|mail)/i.test(h));
  }

  // 4. Identify External ID (e.g. Meta lead id 'l:4605...')
  let idCol = headers.findIndex(h => /^(id|lead[\s_-]*id)$/i.test(h));

  // 5. Identify or Create Status Column
  let processedCol = headers.findIndex(h => h.toLowerCase() === config.PROCESSED_COLUMN_NAME.toLowerCase());
  if (processedCol === -1) {
    processedCol = headers.length;
    sheet.getRange(1, processedCol + 1).setValue(config.PROCESSED_COLUMN_NAME);
    Logger.log(`Created status column "${config.PROCESSED_COLUMN_NAME}" at column ${processedCol + 1}`);
  }

  if (nameCol === -1 || phoneCol === -1) {
    Logger.log(`❌ ERROR: Could not find Name or Phone column in headers: [${headers.join(', ')}]`);
    return;
  }

  Logger.log(`📋 Scanning "${sheetName}" (${data.length - 1} rows). Name Col: "${headers[nameCol]}", Phone Col: "${headers[phoneCol]}"`);

  const leadsToSend = [];
  const rowsToUpdate = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const statusVal = row[processedCol] ? String(row[processedCol]).trim() : '';

    // If already processed or manually marked as SKIPPED, skip row
    if (statusVal.startsWith('PROCESSED') || statusVal === 'SKIPPED') {
      continue;
    }

    const name = String(row[nameCol] || '').trim();
    let phone = String(row[phoneCol] || '').trim();

    // Clean Facebook/Meta Lead Ads prefix (e.g. 'p:+919360263737' -> '+919360263737')
    phone = phone.replace(/^p:/i, '').replace(/['`\s\-\(\)]/g, '').trim();

    const email = emailCol !== -1 && row[emailCol] ? String(row[emailCol]).trim() : '';

    if (!name || !phone) {
      continue;
    }

    // Build custom metadata
    const customData = {
      SheetRow: r + 1,
    };
    for (let c = 0; c < headers.length; c++) {
      if (c !== nameCol && c !== phoneCol && c !== emailCol && c !== processedCol) {
        customData[headers[c]] = row[c];
      }
    }

    const externalId = idCol !== -1 && row[idCol] ? String(row[idCol]).trim() : `sheet_${sheetName}_row_${r + 1}`;

    leadsToSend.push({
      externalId,
      name,
      phone,
      email: email || undefined,
      sourceSheet: sheetName,
      consentStatus: 'granted',
      customData,
    });

    rowsToUpdate.push(r + 1);

    if (leadsToSend.length >= config.BATCH_SIZE) {
      break;
    }
  }

  if (leadsToSend.length === 0) {
    Logger.log('ℹ️ No new unprocessed leads found.');
    return;
  }

  Logger.log(`🚀 Dispatching ${leadsToSend.length} leads to WhatsApp backend...`);

  try {
    const payload = JSON.stringify({ leads: leadsToSend });
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Webhook-Secret': config.WEBHOOK_SECRET,
      },
      payload: payload,
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(config.BACKEND_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const now = new Date().toISOString();
      for (const rowIdx of rowsToUpdate) {
        sheet.getRange(rowIdx, processedCol + 1).setValue(`PROCESSED: ${now}`);
      }
      Logger.log(`✅ Success: Sent ${leadsToSend.length} leads. Rows updated to PROCESSED.`);
    } else {
      Logger.log(`❌ Backend Error ${responseCode}: ${responseText}`);
      for (const rowIdx of rowsToUpdate) {
        sheet.getRange(rowIdx, processedCol + 1).setValue(`ERROR ${responseCode}: ${new Date().toLocaleTimeString()}`);
      }
    }
  } catch (error) {
    Logger.log(`❌ Network Exception: ${error.message}`);
  }
}

/**
 * Helper to process ONLY the currently selected row (useful for testing 1 lead first).
 */
function testCurrentRowOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please click on any row between 2 and 42 first.');
    return;
  }
  processNewLeads();
  SpreadsheetApp.getUi().alert('Tested lead processing! Check the Automated_Status column.');
}
