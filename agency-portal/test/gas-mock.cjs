/* 最小限の Apps Script モック（数式は評価されない点だけ注意） */
const CHAIN = ['setBackground','setFontColor','setFontWeight','setVerticalAlignment','setWrapStrategy',
  'setHorizontalAlignment','setFontSize','setDataValidation','setNumberFormat','setNote'];

class Range {
  constructor(sheet, r, c, nr, nc){ this.sheet=sheet; this.r=r; this.c=c; this.nr=nr; this.nc=nc;
    CHAIN.forEach(m => { this[m] = () => this; });
  }
  _cell(i,j){
    const row = this.sheet.data[this.r-1+i] || (this.sheet.data[this.r-1+i]=[]);
    return row;
  }
  getValues(){
    const out=[];
    for(let i=0;i<this.nr;i++){ const row=[]; for(let j=0;j<this.nc;j++){
      const rr=this.sheet.data[this.r-1+i]||[]; row.push(rr[this.c-1+j]===undefined?'':rr[this.c-1+j]); } out.push(row); }
    return out;
  }
  getDisplayValues(){ return this.getValues().map(r=>r.map(v=>v===''||v===null||v===undefined?'':String(v))); }
  setValues(vals){
    for(let i=0;i<vals.length;i++){ const row=this._cell(i);
      for(let j=0;j<vals[i].length;j++) row[this.c-1+j]=vals[i][j]; }
    this.sheet._grow(); return this;
  }
  setValue(v){ return this.setValues([[v]]); }
  setFormula(f){ return this.setValue(f); }
  getA1Notation(){ return String.fromCharCode(64+this.c)+this.r; }
}
class Sheet {
  constructor(name){ this.name=name; this.data=[]; this.maxRows=1000; this.maxCols=26; }
  _grow(){ this.maxRows=Math.max(this.maxRows,this.data.length);
    this.data.forEach(r=>{ this.maxCols=Math.max(this.maxCols,r.length); }); }
  getName(){ return this.name; }
  getRange(a,b,c,d){
    if(typeof a==='string'){ const m=a.match(/^([A-Z]+)(\d+)$/); return new Range(this, +m[2], m[1].charCodeAt(0)-64, 1, 1); }
    return new Range(this,a,b,c===undefined?1:c,d===undefined?1:d);
  }
  getLastRow(){ let last=0; this.data.forEach((r,i)=>{ if(r && r.some(v=>v!=='' && v!==undefined && v!==null)) last=i+1; }); return last; }
  getLastColumn(){ return this.maxCols; }
  getMaxRows(){ return Math.max(this.maxRows, this.data.length); }
  getMaxColumns(){ return this.maxCols; }
  insertColumnsAfter(a,n){ this.maxCols+=n; }
  setColumnWidth(){} setRowHeight(){} setFrozenRows(){} setFrozenColumns(){}
  clear(){ this.data=[]; } clearConditionalFormatRules(){} setConditionalFormatRules(){}
  appendRow(vals){ this.data[this.getLastRow()]=vals.slice(); this._grow(); }
}
class SS {
  constructor(){ this.sheets={}; this.named={}; }
  getSheetByName(n){ return this.sheets[n]||null; }
  insertSheet(n){ return (this.sheets[n]=new Sheet(n)); }
  setNamedRange(n,r){ this.named[n]=r; }
  getRangeByName(n){ return this.named[n]||null; }
  removeNamedRange(n){ delete this.named[n]; }
  getUrl(){ return 'https://docs.google.com/spreadsheets/d/DUMMY/edit'; }
  toast(){} setActiveSheet(){} moveActiveSheet(){} getActiveSheet(){}
}
const _ss = new SS();
const vb = () => { const o={}; ['requireValueInList','setAllowInvalid','requireCheckbox','whenTextEqualTo',
  'whenTextStartsWith','whenNumberGreaterThan','setBackground','setFontColor','setRanges']
  .forEach(m=>o[m]=()=>o); o.build=()=>({}); return o; };
global.SpreadsheetApp = {
  getActiveSpreadsheet: ()=>_ss, getActive: ()=>_ss,
  newDataValidation: vb, newConditionalFormatRule: vb,
  WrapStrategy:{CLIP:'CLIP',WRAP:'WRAP'},
  getUi: ()=>{ throw new Error('UI not available in test'); }
};
let uuidN = 0;
global.Utilities = {
  // 実物はランダム。先頭6桁が毎回変わるよう、カウンタを反転して詰める
  getUuid: ()=> { const n=(++uuidN).toString(16).padStart(8,'0').split('').reverse().join('');
    return n+'-abcd-4ef0-9'+n.slice(0,3)+'-'+n.padEnd(12,'b'); },
  formatDate: (d,tz,fmt)=>{
    const p=n=>String(n).padStart(2,'0');
    const sep = fmt.indexOf('/')>=0 ? '/' : '';
    const s = d.getFullYear()+sep+p(d.getMonth()+1)+sep+p(d.getDate());
    return fmt.indexOf('HH')>=0 ? s+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()) : s;
  }
};
global.LockService = { getScriptLock: ()=>({ waitLock(){}, releaseLock(){} }) };
global.MailApp = { sent: [], sendEmail(o){ this.sent.push(o); } };
global.HtmlService = {
  createTemplateFromFile: (n)=>({ evaluate: ()=>({ setTitle(){return this}, addMetaTag(){return this}, setXFrameOptionsMode(){return this} }) }),
  createHtmlOutputFromFile: ()=>({ getContent: ()=>'' }),
  XFrameOptionsMode:{ALLOWALL:'ALLOWALL'}
};
