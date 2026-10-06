// IDTC Customer Update — Google Drive backend
// 1) الصق الكود في script.google.com  2) شغّل setup() مرة واحدة  3) غيّر ADMIN_CODE من Project Settings > Script properties
// 4) Deploy > New deployment > Web app (Execute as: Me, Access: Anyone) ثم انسخ الرابط إلى config.js
const P = PropertiesService.getScriptProperties();
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const K = ['name','head','addr','tel','cr','mobile','vat','email','code','region','sales','scode','limit','terms','rebate','lfee','ofee','rating'];
const H = ['ID','Submitted','Status','Customer Name','Head Office','National Address','Tel','CR No.','Mobile','VAT No.','E-Mail',
  'Customer Code','Region','Salesman','Salesman Code','Credit Limit','Credit Terms','Rebate %','Listing Fees','Opening Fees','Salesman Rating','Updated','JSON'];

function setup() {
  const f = DriveApp.createFolder('IDTC - Customer Updates');
  const ss = SpreadsheetApp.create('IDTC Customer Updates (DB)');
  DriveApp.getFileById(ss.getId()).moveTo(f);
  ss.getSheets()[0].setName('Customers').appendRow(H);
  ss.insertSheet('Contacts').appendRow(['ID','Customer','Required Position','Contact Person','Job Title','Tel','Ext','Mobile','E-Mail']);
  ss.insertSheet('Branches').appendRow(['ID','Customer','Branch Name','City','Area','Branch Manager','Mobile','E-Mail']);
  ss.getSheets().forEach(s => s.getRange('A:W').setNumberFormat('@'));
  P.setProperties({FOLDER: f.getId(), SHEET: ss.getId(), ADMIN_CODE: 'CHANGE-ME-123'});
}

const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const now = () => Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm');
const blob = (b64, type, name) => Utilities.newBlob(Utilities.base64Decode(b64), type, name);

function doGet() { return out({ok: true, service: 'IDTC customer update'}); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return out(handle(JSON.parse(e.postData.contents))); }
  catch (err) { return out({ok: false, err: String(err)}); }
  finally { lock.releaseLock(); }
}

function handle(q) {
  const ss = SpreadsheetApp.openById(P.getProperty('SHEET')), sh = ss.getSheetByName('Customers'),
        root = DriveApp.getFolderById(P.getProperty('FOLDER'));

  if (q.a === 'submit') {
    const d = q.d, id = 'C' + Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyMMdd-HHmmss');
    const sub = root.createFolder(id + ' - ' + d.name);
    d.files = (d.files || []).map(f => ({n: f.n, url: sub.createFile(blob(f.b64, f.type, f.k + '_' + f.n)).getUrl()}));
    sub.createFile(blob(q.xlsx, XLSX_MIME, id + '.xlsx'));
    sh.appendRow([id, now(), 'New', ...K.map(k => d[k] || ''), now(), JSON.stringify(d)]);
    replaceRows(ss, id, d);
    return {ok: true, id};
  }

  if (q.code !== P.getProperty('ADMIN_CODE')) return {ok: false, err: 'auth'};

  if (q.a === 'list') {
    const v = sh.getDataRange().getValues().slice(1);
    return {ok: true, rows: v.map(r => Object.assign({}, JSON.parse(r[22] || '{}'), {id: r[0], date: r[1], status: r[2]}))};
  }

  if (q.a === 'internal') {
    const i = sh.getRange('A:A').getValues().flat().indexOf(q.id) + 1;
    if (i < 2) return {ok: false, err: 'notfound'};
    const d = q.d;
    ['id', 'date', 'status'].forEach(k => delete d[k]);
    sh.getRange(i, 1, 1, 23).setValues([[q.id, sh.getRange(i, 2).getValue(), 'Completed', ...K.map(k => d[k] || ''), now(), JSON.stringify(d)]]);
    replaceRows(ss, q.id, d);
    const it = root.getFolders();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().indexOf(q.id) === 0) {
        const old = f.getFilesByName(q.id + '.xlsx');
        while (old.hasNext()) old.next().setTrashed(true);
        f.createFile(blob(q.xlsx, XLSX_MIME, q.id + '.xlsx'));
        break;
      }
    }
    return {ok: true};
  }
  return {ok: false, err: 'bad action'};
}

function replaceRows(ss, id, d) {
  [['Contacts', d.contacts, ['role','n','t','tel','ex','mob','em']], ['Branches', d.branches, ['n','city','area','mgr','mob','em']]].forEach(([n, rows, ks]) => {
    const s = ss.getSheetByName(n), ids = s.getRange('A:A').getValues().flat();
    for (let i = ids.length; i > 1; i--) if (ids[i - 1] === id) s.deleteRow(i);
    (rows || []).forEach(r => s.appendRow([id, d.name, ...ks.map(k => r[k] || '')]));
  });
}
