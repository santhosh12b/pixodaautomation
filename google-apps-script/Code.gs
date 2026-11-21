/**
 * WhatsApp Lead Automation - Google Apps Script
 * Target Sheet Tab: Real Estate AI (gid=200110572)
 */

const DEFAULT_CONFIG = {
  BACKEND_URL: 'https://pixodaautomation.vercel.app/api/leads/webhook',
  WEBHOOK_SECRET: 'my_secure_webhook_secret_2026',
  PROCESSED_COLUMN_NAME: 'Automated_Status',
  TARGET_SHEET_NAME: 'Real Estate AI',
  TARGET_SHEET_GID: 200110572,
  BATCH_SIZE: 25,
};

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    BACKEND_URL: props.getProperty('BACKEND_URL') || DEFAULT_CONFIG.BACKEND_URL,
    WEBHOOK_SECRET: props.getProperty('WEBHOOK_SECRET') || DEFAULT_CONFIG.WEBHOOK_SECRET,
    PROCESSED_COLUMN_NAME: props.getProperty('PROCESSED_COLUMN_NAME') || DEFAULT_CONFIG.PROCESSED_COLUMN_NAME,
    TARGET_SHEET_NAME: props.getProperty('TARGET_SHEET_NAME') || DEFAULT_CONFIG.TARGET_SHEET_NAME,
    TARGET_SHEET_GID: parseInt(props.getProperty('TARGET_SHEET_GID') || String(DEFAULT_CONFIG.TARGET_SHEET_GID), 10),
    BATCH_SIZE: parseInt(props.getProperty('BATCH_SIZE') || String(DEFAULT_CONFIG.BATCH_SIZE), 10),
  };
}

/**
 * Accurately finds the "Real Estate AI" tab even when running in background headless mode.
 */
function getTargetSheet(ss) {
  const config = getConfig();

  // 1. Find by exact sheet name
  let sheet = ss.getSheetByName(config.TARGET_SHEET_NAME);
  if (sheet) return sheet;

  // 2. Find by Sheet GID
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === config.TARGET_SHEET_GID) {
      return sheets[i];
    }
  }

  // 3. Scan for tab containing Automated_Status column
  for (let i = 0; i < sheets.length; i++) {
    const firstRow = sheets[i].getRange(1, 1, 1, Math.min(sheets[i].getLastColumn(), 30)).getValues()[0];
    if (firstRow.some(h => String(h || '').trim().toLowerCase() === config.PROCESSED_COLUMN_NAME.toLowerCase())) {
      return sheets[i];
    }
  }

  // Fallback to active sheet
  return ss.getActiveSheet();
}

/**
 * 24/7 Automated Trigger: Runs processNewLeads every minute in Google Cloud.
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

  Logger.log('✅ Automated 1-minute trigger successfully installed for sheet.');
}

/**
 * One-click helper: Marks rows 2 through 42 as SKIPPED.
 */
function markExistingRowsAsSkipped() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getTargetSheet(ss);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let processedCol = headers.findIndex(h => String(h || '').trim().toLowerCase() === config.PROCESSED_COLUMN_NAME.toLowerCase());
  
  if (processedCol === -1) {
    processedCol = headers.length;
    sheet.getRange(1, processedCol + 1).setValue(config.PROCESSED_COLUMN_NAME);
  }

  // Mark rows 2 to 42 as SKIPPED
  const targetEndRow = Math.min(42, lastRow);
  const numRows = targetEndRow - 1;
  if (numRows > 0) {
    const skippedValues = Array(numRows).fill(['SKIPPED']);
    sheet.getRange(2, processedCol + 1, numRows, 1).setValues(skippedValues);
    Logger.log(`✅ Marked rows 2 to ${targetEndRow} as SKIPPED in tab "${sheet.getName()}".`);
  }
}

/**
 * Main function: Scans "Real Estate AI" tab and delivers all unprocessed leads.
 */
function processNewLeads() {
  const config = getConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getTargetSheet(ss);
  const sheetName = sheet.getName();
  const data = sheet.getDataRange().getValues();

  Logger.log(`📋 Scanning tab: "${sheetName}" (Total rows: ${data.length})...`);

  if (data.length < 2) {
    Logger.log(`⚠️ Tab "${sheetName}" has no data rows.`);
    return;
  }

  const rawHeaders = data[0];
  const headers = rawHeaders.map(h => String(h || '').trim());
  
  // 1. Detect Name Column (matches full_name, name)
  let nameCol = headers.findIndex(h => /^(full[\s_-]*name|name|lead[\s_-]*name|customer[\s_-]*name|contact[\s_-]*name)$/i.test(h));
  if (nameCol === -1) {
    nameCol = headers.findIndex(h => /name/i.test(h) && !/(ad|adset|campaign|form|page|file|sheet)[\s_-]*name/i.test(h));
  }

  // 2. Detect Phone Column (matches phone_number, phone, mobile, whatsapp)
  let phoneCol = headers.findIndex(h => /^(phone|phone[\s_-]*number|mobile|mobile[\s_-]*number|whatsapp|tel|contact[\s_-]*no)$/i.test(h));
  if (phoneCol === -1) {
    phoneCol = headers.findIndex(h => /(phone|mobile|whatsapp)/i.test(h));
  }

  // 3. Detect Email Column
  let emailCol = headers.findIndex(h => /^(email|email[\s_-]*address|mail)$/i.test(h));
  if (emailCol === -1) {
    emailCol = headers.findIndex(h => /(email|mail)/i.test(h));
  }

  // 4. Detect Meta Lead ID
  let idCol = headers.findIndex(h => /^(id|lead[\s_-]*id)$/i.test(h));

  // 5. Detect or Create Status Column
  let processedCol = headers.findIndex(h => h.toLowerCase() === config.PROCESSED_COLUMN_NAME.toLowerCase());
  if (processedCol === -1) {
    processedCol = headers.length;
    sheet.getRange(1, processedCol + 1).setValue(config.PROCESSED_COLUMN_NAME);
  }

  if (nameCol === -1 || phoneCol === -1) {
    Logger.log(`❌ ERROR: Could not find Name (col: ${nameCol}) or Phone (col: ${phoneCol}) in tab "${sheetName}".`);
    return;
  }

  const leadsToSend = [];
  const rowsToUpdate = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const statusVal = row[processedCol] ? String(row[processedCol]).trim() : '';

    // If already marked PROCESSED or SKIPPED, skip
    if (statusVal.startsWith('PROCESSED') || statusVal === 'SKIPPED') {
      continue;
    }

    const name = String(row[nameCol] || '').trim();
    let phone = String(row[phoneCol] || '').trim();

    // Clean Facebook/Meta "p:" prefix and formatting
    phone = phone.replace(/^p:/i, '').replace(/['`\s\-\(\)]/g, '').trim();

    const email = emailCol !== -1 && row[emailCol] ? String(row[emailCol]).trim() : '';

    if (!name || !phone) continue;

    // Collect all row metadata
    const customData = { SheetRow: r + 1 };
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
      sourceSheet: 'TEC - Leads',
      consentStatus: 'granted',
      customData,
    });

    rowsToUpdate.push(r + 1);

    if (leadsToSend.length >= config.BATCH_SIZE) break;
  }

  if (leadsToSend.length === 0) {
    Logger.log(`ℹ️ Tab "${sheetName}": No new unprocessed leads found.`);
    return;
  }

  Logger.log(`🚀 Dispatching ${leadsToSend.length} leads (Rows: ${rowsToUpdate.join(', ')}) to WhatsApp backend...`);

  try {
    const payload = JSON.stringify({ leads: leadsToSend });
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Webhook-Secret': config.WEBHOOK_SECRET },
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
      Logger.log(`✅ Success! Delivered ${leadsToSend.length} leads. Rows updated to PROCESSED.`);
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
