/**
 * ============================================================================
 * PixodaWhatsApp Automation - Real Estate Warm Leads Google Apps Script
 * ============================================================================
 * Target Sheet: Pixoda - Real Estate Warm Leads
 * Sheet URL: https://docs.google.com/spreadsheets/d/1d6qL0xcHr9JbFtNJtdkx5k-Ru1CODFN4GGebudVaEbI/edit
 * Columns:
 *   - Column A: Name
 *   - Column B: Phone Number
 *   - Column C: Status
 * ============================================================================
 */

const DEFAULT_CONFIG = {
  BACKEND_URL: 'https://pixodaautomation.vercel.app/api/leads/webhook',
  WEBHOOK_SECRET: 'my_secure_webhook_secret_2026',
  CAMPAIGN_NAME: 'Pixoda - Real Estate Warm Leads',
  SPREADSHEET_ID: '1d6qL0xcHr9JbFtNJtdkx5k-Ru1CODFN4GGebudVaEbI',
  STATUS_COLUMN_HEADER: 'Status',
  BATCH_SIZE: 20,
};

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    BACKEND_URL: props.getProperty('BACKEND_URL') || DEFAULT_CONFIG.BACKEND_URL,
    WEBHOOK_SECRET: props.getProperty('WEBHOOK_SECRET') || DEFAULT_CONFIG.WEBHOOK_SECRET,
    CAMPAIGN_NAME: props.getProperty('CAMPAIGN_NAME') || DEFAULT_CONFIG.CAMPAIGN_NAME,
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || DEFAULT_CONFIG.SPREADSHEET_ID,
    STATUS_COLUMN_HEADER: props.getProperty('STATUS_COLUMN_HEADER') || DEFAULT_CONFIG.STATUS_COLUMN_HEADER,
    BATCH_SIZE: parseInt(props.getProperty('BATCH_SIZE') || String(DEFAULT_CONFIG.BATCH_SIZE), 10),
  };
}

/**
 * Custom Menu inside Google Sheets for 1-click execution and trigger setup.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Pixoda Automation')
    .addItem('▶️ Sync New Leads Now', 'processNewLeads')
    .addSeparator()
    .addItem('⏰ Start 24/7 Auto Sync (Every 1 Min)', 'setupMinuteTrigger')
    .addToUi();
}

/**
 * Installs a 1-minute background trigger in Google Cloud.
 * This runs automatically 24/7 without needing the spreadsheet to remain open!
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

  Logger.log('✅ Automated 1-minute trigger successfully installed.');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('24/7 Auto-Sync active! Leads will sync every 60 seconds.', 'Pixoda Automation', 5);
  } catch (e) {}
}

/**
 * Main ingestion function: Scans rows for new leads and delivers them to the WhatsApp sequence backend.
 */
function processNewLeads() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();
  const data = sheet.getDataRange().getValues();

  Logger.log(`📋 Scanning sheet: "${sheetName}" (Total rows: ${data.length})...`);

  if (data.length < 2) {
    Logger.log(`ℹ️ Sheet "${sheetName}" has no data rows yet.`);
    return;
  }

  const rawHeaders = data[0];
  const headers = rawHeaders.map(h => String(h || '').trim());

  // 1. Detect Name Column (Column A or header with 'name')
  let nameCol = headers.findIndex(h => /^(name|full[\s_-]*name|customer[\s_-]*name|lead[\s_-]*name)$/i.test(h));
  if (nameCol === -1) nameCol = 0; // Default to Column A

  // 2. Detect Phone Column (Column B or header with 'phone', 'mobile', 'whatsapp')
  let phoneCol = headers.findIndex(h => /^(phone|phone[\s_-]*number|mobile|whatsapp|contact)$/i.test(h));
  if (phoneCol === -1) phoneCol = 1; // Default to Column B

  // 3. Detect or create Status Column (Column C or header 'Status')
  let statusCol = headers.findIndex(h => /^(status|automated[\s_-]*status|sync[\s_-]*status)$/i.test(h));
  if (statusCol === -1) {
    statusCol = 2; // Column C
    sheet.getRange(1, statusCol + 1).setValue(config.STATUS_COLUMN_HEADER);
  }

  const leadsToSend = [];
  const rowsToUpdate = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const currentStatus = row[statusCol] ? String(row[statusCol]).trim() : '';

    // Skip if already processed or skipped
    if (currentStatus.startsWith('PROCESSED') || currentStatus.startsWith('SKIPPED')) {
      continue;
    }

    const name = String(row[nameCol] || '').trim();
    let phone = String(row[phoneCol] || '').trim();

    if (!name && !phone) continue;

    // Clean phone number formatting (e.g. p:+91 70109 16504, dashes, spaces)
    phone = phone.replace(/^p:/i, '').replace(/['`\s\-\(\)]/g, '').trim();

    if (!phone) continue;

    const rowNumber = r + 1;
    const externalId = `sheet_${config.SPREADSHEET_ID}_row_${rowNumber}`;

    leadsToSend.push({
      externalId,
      name: name || 'Valued Customer',
      phone,
      sourceSheet: config.CAMPAIGN_NAME,
      consentStatus: 'granted',
      customData: {
        RowNumber: rowNumber,
        SheetName: sheetName,
        SpreadsheetId: config.SPREADSHEET_ID,
      },
    });

    rowsToUpdate.push(rowNumber);

    if (leadsToSend.length >= config.BATCH_SIZE) {
      break;
    }
  }

  if (leadsToSend.length === 0) {
    Logger.log(`ℹ️ No new unprocessed leads found.`);
    // Flush any pending background jobs in the queue
    flushBackendQueue(config);
    return;
  }

  Logger.log(`🚀 Sending ${leadsToSend.length} new leads to backend...`);

  const payload = {
    sourceSheet: config.CAMPAIGN_NAME,
    leads: leadsToSend,
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-webhook-secret': config.WEBHOOK_SECRET,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(config.BACKEND_URL, options);
    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (statusCode >= 200 && statusCode < 300) {
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
      const statusText = `PROCESSED: ${timestamp}`;

      for (let i = 0; i < rowsToUpdate.length; i++) {
        const rowNum = rowsToUpdate[i];
        sheet.getRange(rowNum, statusCol + 1).setValue(statusText);
      }

      Logger.log(`✅ Successfully synced ${leadsToSend.length} leads! Marked rows as PROCESSED.`);
      
      // Flush backend queue so WhatsApp sequence delivers immediately
      flushBackendQueue(config);

      try {
        SpreadsheetApp.getActiveSpreadsheet().toast(`Sent ${leadsToSend.length} leads to WhatsApp sequence!`, 'Success', 4);
      } catch (e) {}
    } else {
      Logger.log(`❌ Backend returned error ${statusCode}: ${responseBody}`);
    }
  } catch (err) {
    Logger.log(`❌ UrlFetchApp error: ${err.message}`);
  }
}

/**
 * Automatically triggers queue processing on the backend so all follow-up videos & PDFs dispatch 24/7.
 */
function flushBackendQueue(config) {
  const cfg = config || getConfig();
  try {
    const queueUrl = cfg.BACKEND_URL.replace(/\/leads\/webhook\/?$/, '/queue/process');
    UrlFetchApp.fetch(queueUrl, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
    });
    Logger.log('⚡ Queue flush trigger sent to backend.');
  } catch (err) {
    Logger.log('Queue flush warning: ' + err.message);
  }
}
