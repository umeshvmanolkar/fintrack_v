/**
 * FinTrack Google Apps Script API
 * 
 * Instructions:
 * 1. Open Google Sheets.
 * 2. Create 3 tabs exactly named: "Goals", "Earnings", "Loans"
 * 3. Extensions > Apps Script. Paste this code.
 * 4. Deploy > New Deployment > Web App.
 * 5. Execute as: Me. Who has access: Anyone.
 * 6. Copy the Web App URL and paste it into config.js.
 */

// Define headers for the sheets
const HEADERS = {
  Users: ["id", "email", "password", "createdAt"],
  Goals: ["id", "name", "target", "current", "deadline", "userId"],
  Earnings: ["id", "source", "category", "amount", "time", "date", "goalId", "type", "userId"],
  Loans: ["id", "source", "principal", "interestRate", "emi", "startDate", "endDate", "totalPaid", "remainingBalance", "userId"]
};

// Initialize Sheets with Headers if they are empty
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const sheetName in HEADERS) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
    }
  }
}

// Convert row data into JSON objects based on headers
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      // Convert numeric looking strings to numbers
      if (typeof val === 'string' && val !== '' && !isNaN(val)) {
        val = Number(val);
      }
      obj[headers[j]] = val;
    }
    rows.push(obj);
  }
  
  return rows;
}

// Write a row object back to the sheet
function appendRow(sheetName, obj) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  const row = [];
  
  for (let i = 0; i < headers.length; i++) {
    row.push(obj[headers[i]] !== undefined ? obj[headers[i]] : '');
  }
  
  sheet.appendRow(row);
  return obj;
}

// Update a row by ID
function updateRow(sheetName, id, updates) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = HEADERS[sheetName];
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    // Exact or coerced match for ID
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1; // 1-indexed for SpreadsheetApp
      break;
    }
  }
  
  if (rowIndex === -1) return null;
  
  for (let j = 0; j < headers.length; j++) {
    const key = headers[j];
    if (updates[key] !== undefined) {
      sheet.getRange(rowIndex, j + 1).setValue(updates[key]);
    }
  }
  
  return updates;
}

// Delete a row by ID
function deleteRow(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// GET REQUEST HANDLER
function doGet(e) {
  try {
    initSheets();
    const action = e.parameter.action;
    const userId = e.parameter.userId; // Require userId to fetch data
    
    if (action === 'getAll') {
      if (!userId) throw new Error("Missing userId parameter for data fetch.");

      const rawGoals = getSheetData('Goals') || [];
      const rawEarns = getSheetData('Earnings') || [];
      const rawLoans = getSheetData('Loans') || [];

      // Filter arrays by exact matching userId string
      const response = {
        goals: rawGoals.filter(g => String(g.userId) === String(userId)),
        earnings: rawEarns.filter(e => String(e.userId) === String(userId)),
        loans: rawLoans.filter(l => String(l.userId) === String(userId))
      };
      
      const formattedResponse = JSON.parse(JSON.stringify(response));
      
      return ContentService.createTextOutput(JSON.stringify(formattedResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid action" }))
        .setMimeType(ContentService.MimeType.JSON);
        
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST REQUEST HANDLER
function doPost(e) {
  try {
    initSheets(); // Ensure headers exist before writing anything

    // Use proper CORS header handling to avoid typical web app issues
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);
    
    const action = body.action;
    const payload = body.payload;
    
    let result = null;
    
    switch (action) {
      case 'registerUser':
        {
          const usersData = getSheetData('Users');
          const existing = usersData.find(u => String(u.email).toLowerCase() === String(payload.email).toLowerCase());
          if (existing) throw new Error("Email already registered");
          
          payload.id = Utilities.getUuid(); // Auto-generate an ID
          payload.password = Utilities.base64Encode(payload.password); // Apps Script native base64
          payload.createdAt = new Date().toISOString();
          result = appendRow('Users', payload);
        }
        break;
      case 'loginUser':
        {
          const usersData = getSheetData('Users');
          const pswdHash = Utilities.base64Encode(payload.password);
          const user = usersData.find(u => String(u.email).toLowerCase() === String(payload.email).toLowerCase() && String(u.password) === pswdHash);
          if (!user) throw new Error("Invalid email or password");
          
          // Return non-sensitive data
          result = { id: user.id, email: user.email };
        }
        break;
        
      // Create Operations (Append userId to all)
      case 'addGoal':
        result = appendRow('Goals', payload);
        break;
      case 'addEarning':
        result = appendRow('Earnings', payload);
        break;
      case 'addLoan':
        result = appendRow('Loans', payload);
        break;
        
      // Update Operations
      case 'updateGoal':
        result = updateRow('Goals', payload.id, payload);
        break;
      case 'updateLoan':
        result = updateRow('Loans', payload.id, payload);
        break;
        
      // Delete Operations
      case 'deleteGoal':
        result = deleteRow('Goals', payload.id);
        break;
      case 'deleteLoan':
        result = deleteRow('Loans', payload.id);
        break;
        
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, result: result }))
        .setMimeType(ContentService.MimeType.JSON);
        
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

// Enable CORS Preflight wrapper (Important for Vanilla JS fetch API)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
