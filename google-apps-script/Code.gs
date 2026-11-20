/**
 * WhatsApp Lead Automation - Google Apps Script
 * 
 * Automatically scans Google Sheet rows every minute for new leads,
 * batches and delivers them to the Node.js Express backend API,
 * and marks rows as processed to guarantee zero duplicate submissions.
 */

// ==========================================
// CONFIGURATION (Set via Script Properties or defaults below)
// ==========================================
const DEFAULT_CONFIG = {
  // Backend API URL (Vercel deployment or ngrok/local URL)
  BACKEND_URL: 'https://pixodaautomation.vercel.app/api/leads/webhook',
  
  // Must match WEBHOOK_SECRET in backend .env
  WEBHOOK_SECRET: 'my_secure_webhook_secret_2026',
  
  // Name of status column to write to
  PROCESSED_COLUMN_NAME: 'Automated_Status',
  
  // Maximum rows to process per run (bounded batch)
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
 * Sets up a time-driven trigger running every minute.
 * Run this function once from Extensions -> Apps Script.
 */
function setupMinuteTrigger() {
  // Clear any existing triggers for processNewLeads
  const existingTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existingTriggers.length; i++) {
    if (existingTriggers[i].getHandlerFunction() === 'processNewLeads') {
      ScriptApp.deleteTrigger(existingTriggers[i]);
    }
  }

  // Create new 1-minute trigger
  ScriptApp.newTrigger('processNewLeads')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Automated 1-minute trigger installed successfully.');
}

/**
 * Main polling function executed every minute.
 */
function processNewLeads() {
  const config = getConfig();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const sheetName = sheet.getName();
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log('No data found in sheet.');
    return;
  }

  const headers = data[0].map(h => String(h || '').trim());
  
  // Find column indices
  let nameCol = headers.findIndex(h => /^(name|full\s*name|lead\s*name|contact)$/i.test(h));
  let phoneCol = headers.findIndex(h => /^(phone|mobile|whatsapp|tel|contact\s*no)$/i.test(h));
  let emailCol = headers.findIndex(h => /^(email|mail)$/i.test(h));
  let consentCol = headers.findIndex(h => /^(consent|opt[\s_-]*in|permission)$/i.test(h));
  let processedCol = headers.findIndex(h => h.toLowerCase() === config.PROCESSED_COLUMN_NAME.toLowerCase());

  // If no processed column exists, create one at the end
  if (processedCol === -1) {
    processedCol = headers.length;
    sheet.getRange(1, processedCol + 1).setValue(config.PROCESSED_COLUMN_NAME);
  }

  // Fallbacks if header names are generic
  if (nameCol === -1) nameCol = 0;
  if (phoneCol === -1) phoneCol = 1;

  const leadsToSend = [];
  const rowsToUpdate = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const statusVal = row[processedCol] ? String(row[processedCol]).trim() : '';

    // If already processed or row is blank, skip
    if (statusVal.startsWith('PROCESSED') || statusVal === 'SKIPPED') {
      continue;
    }

    const name = String(row[nameCol] || '').trim();
    const phone = String(row[phoneCol] || '').trim();
    const email = emailCol !== -1 && row[emailCol] ? String(row[emailCol]).trim() : '';
    const rawConsent = consentCol !== -1 && row[consentCol] ? String(row[consentCol]).toLowerCase().trim() : 'yes';

    if (!name || !phone) {
      continue;
    }

    // Determine consent
    let consentStatus = 'granted';
    if (rawConsent === 'no' || rawConsent === 'false' || rawConsent === 'opted_out') {
      consentStatus = 'revoked';
    } else if (rawConsent === 'pending') {
      consentStatus = 'pending';
    }

    // Build custom metadata from all other columns
    const customData = {
      SheetRow: r + 1,
    };
    for (let c = 0; c < headers.length; c++) {
      if (c !== nameCol && c !== phoneCol && c !== emailCol && c !== processedCol) {
        customData[headers[c]] = row[c];
      }
    }

    leadsToSend.push({
      externalId: `sheet_${sheetName}_row_${r + 1}`,
      name,
      phone,
      email: email || undefined,
      sourceSheet: sheetName,
      consentStatus,
      customData,
    });

    rowsToUpdate.push(r + 1);

    if (leadsToSend.length >= config.BATCH_SIZE) {
      break;
    }
  }

  if (leadsToSend.length === 0) {
    Logger.log('No new unprocessed leads.');
    return;
  }

  Logger.log(`Found ${leadsToSend.length} new leads. Posting to ${config.BACKEND_URL}...`);

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
      Logger.log(`✅ Successfully sent ${leadsToSend.length} leads. Rows marked PROCESSED.`);
    } else {
      Logger.log(`❌ Backend returned error ${responseCode}: ${responseText}`);
      for (const rowIdx of rowsToUpdate) {
        sheet.getRange(rowIdx, processedCol + 1).setValue(`ERROR ${responseCode}: ${new Date().toLocaleTimeString()}`);
      }
    }
  } catch (error) {
    Logger.log(`❌ Network exception: ${error.message}`);
  }
}

/**
 * Manual test helper to send the currently selected row.
 */
function sendSelectedRowTest() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a data row (row 2 or higher).');
    return;
  }
  processNewLeads();
  SpreadsheetApp.getUi().alert('Ran lead check. Check logs or Automated_Status column.');
}

