/* =========================================================
   PAUSE & PLATE - CAISSE, CLOTURES ET EXPORTS
   - Caisse journaliere et ecarts automatiques
   - Cloture Z synchronisee avec Firebase
   - Sauvegarde/restauration JSON
   - Exports PDF et Excel
========================================================= */

const PP_CASH_CLOSINGS_KEY='pause_plate_cash_closings';
PP_EXTRA_KEYS.cashClosings=PP_CASH_CLOSINGS_KEY;

function ppNormalizeCashClosingPP(raw){
    const c=raw||{};
    return {
        id:c.id??createId(),date:String(c.date||'').slice(0,10),openingCash:Number(c.openingCash||0),
        cashIn:Number(c.cashIn||0),cashOut:Number(c.cashOut||0),theoreticalCash:Number(c.theoreticalCash||0),
        actualCash:Number(c.actualCash||0),difference:Number(c.difference||0),notes:String(c.notes||''),
        closedAt:c.closedAt||new Date().toISOString(),closedBy:String(c.closedBy||''),
        createdAt:c.createdAt||c.closedAt||new Date().toISOString(),updatedAt:c.updatedAt||c.closedAt||new Date().toISOString()
    };
}

let cashClosingsPP=loadStorage(PP_CASH_CLOSINGS_KEY,[]);
cashClosingsPP=(Array.isArray(cashClosingsPP)?cashClosingsPP:[]).map(ppNormalizeCashClosingPP).filter(c=>c.date);
PP_CLOUD_DATASETS.cashClosings=()=>cashClosingsPP;

const ppCashSetDatasetBase=ppSetDataset;
ppSetDataset=function(key,items){
    if(key==='cashClosings')cashClosingsPP=(Array.isArray(items)?items:[]).map(ppNormalizeCashClosingPP).filter(c=>c.date);
    else ppCashSetDatasetBase(key,items);
};

const ppCashSaveLocalOnlyBase=ppSaveLocalOnly;
ppSaveLocalOnly=function(){
    ppCashSaveLocalOnlyBase();
    localStorage.setItem(PP_CASH_CLOSINGS_KEY,JSON.stringify(cashClosingsPP));
};

const ppCashLocalHasDataBase=ppLocalHasData;
ppLocalHasData=function(){return ppCashLocalHasDataBase()||cashClosingsPP.length;};

const ppCashSaveDataBase=saveData;
saveData=function(){
    localStorage.setItem(PP_CASH_CLOSINGS_KEY,JSON.stringify(cashClosingsPP));
    return ppCashSaveDataBase();
};

const ppCashUpdatePageTitleBase=updatePageTitle;
updatePageTitle=function(page){
    if(page==='cash'){
        setText('pageTitle','Caisse & Clôture');
        setText('pageSubtitle','Contrôlez les encaissements et clôturez chaque journée');
        setTimeout(renderCashClosingPP,0);
        return;
    }
    if(page==='exports'){
        setText('pageTitle','Sauvegarde & Exports');
        setText('pageSubtitle','Sauvegardez, restaurez et exportez les données du Manager');
        setTimeout(renderExportsCenterPP,0);
        return;
    }
    return ppCashUpdatePageTitleBase(page);
};

function ppCashDateShiftPP(date,days){
    const d=new Date(`${String(date).slice(0,10)}T12:00:00`);if(Number.isNaN(d.getTime()))return '';
    d.setDate(d.getDate()+Number(days||0));return d.toISOString().slice(0,10);
}

function ppCashClosingByDatePP(date){return cashClosingsPP.find(c=>c.date===String(date).slice(0,10))||null;}
function ppLatestCashClosingPP(){return cashClosingsPP.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;}

function ppCashOpeningForDatePP(date){
    const previous=cashClosingsPP.filter(c=>c.date<date).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
    if(previous)return Number(previous.actualCash||0);
    return ppAccountingTreasuryBalancePP('5161',ppCashDateShiftPP(date,-1));
}

function ppCashSourceLabelPP(source){
    const labels={
        'sale-payment':'Encaissement vente','client-payment':'Encaissement client','supplier-payment':'Règlement fournisseur',
        'expense-payment':'Règlement dépense','manual':'Écriture manuelle','cash-adjustment':'Écart de clôture'
    };
    return labels[source]||'Opération comptable';
}

function ppCashDailyMovementLinesPP(date){
    return ppAccountingJournalPP().filter(entry=>entry.date===date&&entry.source!=='opening'&&entry.source!=='cash-adjustment')
        .flatMap(entry=>entry.lines.filter(line=>line.account==='5161'&&(Number(line.debit||0)>0||Number(line.credit||0)>0)).map(line=>({
            date:entry.date,journal:entry.journal,piece:entry.piece,label:line.label||entry.label,source:entry.source,
            debit:Number(line.debit||0),credit:Number(line.credit||0)
        })));
}

function ppCashReceiptsByModePP(date){
    const rows=[];
    salesPP.forEach(s=>{if(String(s.paymentDate||'').slice(0,10)===date)rows.push({mode:s.mode||'Autre',amount:Number(s.totalTTC||0),source:'Ventes'});});
    clientInvoicesPP.forEach(inv=>ppAccountingClientPaymentEventsPP(inv).forEach(p=>{if(String(p.date||'').slice(0,10)===date)rows.push({mode:p.mode||'Autre',amount:Number(p.amount||0),source:'Clients'});}));
    const map=new Map();rows.forEach(r=>{const key=String(r.mode||'Autre').trim()||'Autre';map.set(key,(map.get(key)||0)+Number(r.amount||0));});
    return [...map.entries()].map(([mode,amount])=>({mode,amount})).sort((a,b)=>b.amount-a.amount);
}

function ppCashDailyMetricsPP(date){
    const lines=ppCashDailyMovementLinesPP(date),openingCash=ppCashOpeningForDatePP(date);
    const cashIn=lines.reduce((s,l)=>s+l.debit,0),cashOut=lines.reduce((s,l)=>s+l.credit,0);
    const theoreticalCash=openingCash+cashIn-cashOut,saved=ppCashClosingByDatePP(date);
    return {date,lines,openingCash,cashIn,cashOut,theoreticalCash,saved,modes:ppCashReceiptsByModePP(date)};
}

function ensureCashClosingModulePP(){
    const page=document.getElementById('cashPage');if(!page)return;
    hideLegacyModuleContentPP(page,'ppCashClosingModule');
    if(document.getElementById('ppCashClosingModule'))return;
    if(!document.getElementById('ppCashExportStyles')){
        const style=document.createElement('style');style.id='ppCashExportStyles';style.textContent=`
        #ppCashClosingModule .pp-cash-toolbar,#ppExportsModule .pp-export-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}
        .pp-finance-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:16px}
        .pp-finance-card{background:#fff;border:1px solid #e4e7ec;border-left:5px solid #0b6b45;border-radius:15px;padding:16px;box-shadow:0 3px 10px rgba(16,24,40,.04)}
        .pp-finance-card span{display:block;color:#667085;font-size:13px;font-weight:700;margin-bottom:7px}.pp-finance-card strong{display:block;font-size:22px;color:#12372a}
        .pp-finance-panel{background:#fff;border:1px solid #e4e7ec;border-radius:15px;padding:16px;margin-bottom:16px;overflow:auto}
        .pp-finance-panel table{width:100%;min-width:720px}.pp-cash-positive{color:#067647}.pp-cash-negative{color:#b42318}
        .pp-export-card{background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px}
        .pp-export-card h3{margin:0;color:#12372a}.pp-export-card p{margin:0;color:#667085;line-height:1.5}.pp-export-card .btn{margin-top:auto}
        @media(max-width:700px){.pp-finance-grid{grid-template-columns:1fr 1fr}.pp-finance-card strong{font-size:18px}}
        `;document.head.appendChild(style);
    }
    const today=new Date().toISOString().slice(0,10),wrap=document.createElement('div');wrap.id='ppCashClosingModule';wrap.innerHTML=`
      <div class="pp-cash-toolbar"><div><h2 style="margin:0 0 4px">💳 Caisse & Clôture journalière</h2><p style="margin:0;color:#667085">Les ventes et règlements alimentent la caisse automatiquement.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn print" onclick="printCashClosingPP()">🖨️ Imprimer Z</button><button class="btn" onclick="exportCashClosingPDFPP()">📄 Télécharger PDF</button></div></div>
      <div class="pp-finance-panel"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;align-items:end"><div><label>Date de caisse</label><input id="ppCashDate" type="date" value="${today}" onchange="renderCashClosingPP()"></div><div><label>Comptage réel en caisse</label><input id="ppCashActual" type="number" min="0" step="0.01" placeholder="Montant compté" oninput="ppUpdateCashDifferencePreviewPP()"></div><div><label>Observation</label><input id="ppCashNotes" placeholder="Observation de clôture"></div><button id="ppCashCloseBtn" class="btn primary" onclick="saveCashClosingPP()">🔒 Clôturer la journée</button></div><div id="ppCashStatus" style="margin-top:12px"></div></div>
      <div class="pp-finance-grid"><div class="pp-finance-card"><span>Fond / ouverture</span><strong id="ppCashOpening">0 DH</strong></div><div class="pp-finance-card"><span>Entrées espèces</span><strong id="ppCashIn">0 DH</strong></div><div class="pp-finance-card" style="border-left-color:#d97706"><span>Sorties espèces</span><strong id="ppCashOut">0 DH</strong></div><div class="pp-finance-card" style="border-left-color:#2563eb"><span>Caisse théorique</span><strong id="ppCashTheoretical">0 DH</strong></div><div class="pp-finance-card"><span>Caisse réelle</span><strong id="ppCashActualCard">-</strong></div><div class="pp-finance-card" id="ppCashDifferenceCard"><span>Écart de caisse</span><strong id="ppCashDifference">-</strong></div></div>
      <div class="pp-finance-panel"><h3 style="margin-top:0">Encaissements par mode</h3><div id="ppCashModes" class="pp-finance-grid" style="margin-bottom:0"></div></div>
      <div class="pp-finance-panel"><h3 style="margin-top:0">Mouvements espèces de la journée</h3><table><thead><tr><th>Journal</th><th>Pièce</th><th>Origine</th><th>Libellé</th><th>Entrée</th><th>Sortie</th></tr></thead><tbody id="ppCashMovementsTable"></tbody></table></div>
      <div class="pp-finance-panel"><h3 style="margin-top:0">Historique des clôtures</h3><table><thead><tr><th>Date</th><th>Ouverture</th><th>Entrées</th><th>Sorties</th><th>Théorique</th><th>Réel</th><th>Écart</th><th>Clôturé par</th><th>Actions</th></tr></thead><tbody id="ppCashClosingsTable"></tbody></table></div>`;
    page.appendChild(wrap);
}

function renderCashClosingPP(){
    ensureCashClosingModulePP();const date=getValue('ppCashDate')||new Date().toISOString().slice(0,10),metrics=ppCashDailyMetricsPP(date),saved=metrics.saved;
    setText('ppCashOpening',formatMoney(metrics.openingCash));setText('ppCashIn',formatMoney(metrics.cashIn));setText('ppCashOut',formatMoney(metrics.cashOut));setText('ppCashTheoretical',formatMoney(metrics.theoreticalCash));
    const actual=document.getElementById('ppCashActual'),notes=document.getElementById('ppCashNotes');if(actual)actual.value=saved?Number(saved.actualCash||0).toFixed(2):'';if(notes)notes.value=saved?.notes||'';
    const status=document.getElementById('ppCashStatus');if(status)status.innerHTML=saved?`<span class="status success">Journée clôturée le ${formatDate(saved.closedAt)}</span> <small>La différence est enregistrée automatiquement en comptabilité.</small>`:'<span class="status warning">Journée ouverte</span>';
    const btn=document.getElementById('ppCashCloseBtn');if(btn)btn.textContent=saved?'💾 Mettre à jour la clôture':'🔒 Clôturer la journée';
    const modes=document.getElementById('ppCashModes');if(modes)modes.innerHTML=metrics.modes.map(m=>`<div class="pp-finance-card"><span>${escapeHTML(m.mode)}</span><strong>${formatMoney(m.amount)}</strong></div>`).join('')||'<p class="empty">Aucun encaissement enregistré.</p>';
    const table=document.getElementById('ppCashMovementsTable');if(table)table.innerHTML=metrics.lines.map(l=>`<tr><td>${escapeHTML(l.journal||'-')}</td><td>${escapeHTML(l.piece||'-')}</td><td>${escapeHTML(ppCashSourceLabelPP(l.source))}</td><td>${escapeHTML(l.label||'-')}</td><td class="pp-cash-positive">${l.debit?formatMoney(l.debit):'-'}</td><td class="pp-cash-negative">${l.credit?formatMoney(l.credit):'-'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Aucun mouvement espèces pour cette date.</td></tr>';
    renderCashClosingsHistoryPP();ppUpdateCashDifferencePreviewPP();
}

function ppUpdateCashDifferencePreviewPP(){
    const date=getValue('ppCashDate'),metrics=ppCashDailyMetricsPP(date),raw=getValue('ppCashActual'),hasActual=raw!==''&&Number.isFinite(Number(raw)),actual=Number(raw||0),difference=actual-metrics.theoreticalCash;
    setText('ppCashActualCard',hasActual?formatMoney(actual):'-');setText('ppCashDifference',hasActual?formatMoney(difference):'-');
    const card=document.getElementById('ppCashDifferenceCard');if(card)card.style.borderLeftColor=!hasActual?'#98a2b3':Math.abs(difference)<0.01?'#067647':difference>0?'#2563eb':'#b42318';
}

function ppCashAdjustmentEntryPP(closing,difference){
    if(Math.abs(difference)<0.01)return null;
    const lines=difference>0
        ?[ppAccountingLinePP('5161',difference,0,'Excédent de caisse'),ppAccountingLinePP('7185',0,difference,'Excédent de caisse')]
        :[ppAccountingLinePP('6181',-difference,0,'Manquant de caisse'),ppAccountingLinePP('5161',0,-difference,'Manquant de caisse')];
    return ppAccountingNormalizeEntryPP({id:`cash-adjustment-${closing.id}`,date:closing.date,journal:'CA',piece:`CLOTURE-${closing.date}`,label:difference>0?'Excédent de caisse':'Manquant de caisse',source:'cash-adjustment',sourceId:closing.id,lines,createdAt:closing.createdAt,updatedAt:new Date().toISOString()});
}

function saveCashClosingPP(){
    const date=getValue('ppCashDate'),actualRaw=getValue('ppCashActual');if(!date){alert('Choisissez la date de clôture.');return;}if(actualRaw===''||Number(actualRaw)<0){alert('Saisissez le montant réellement compté en caisse.');return;}
    const later=cashClosingsPP.find(c=>c.date>date);if(later){alert(`Impossible de modifier cette date avant de réouvrir la clôture du ${formatDate(later.date)}.`);return;}
    const metrics=ppCashDailyMetricsPP(date),actualCash=Number(actualRaw),difference=actualCash-metrics.theoreticalCash,old=metrics.saved;
    const closing=ppNormalizeCashClosingPP({id:old?.id||createId(),date,openingCash:metrics.openingCash,cashIn:metrics.cashIn,cashOut:metrics.cashOut,theoreticalCash:metrics.theoreticalCash,actualCash,difference,notes:getValue('ppCashNotes').trim(),closedAt:new Date().toISOString(),closedBy:ppCurrentUserProfile?.name||ppCurrentUserProfile?.username||'Admin',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
    if(old){const i=cashClosingsPP.findIndex(c=>String(c.id)===String(old.id));cashClosingsPP[i]=closing;}else cashClosingsPP.push(closing);
    accountingEntriesPP=accountingEntriesPP.filter(e=>!(e.source==='cash-adjustment'&&String(e.sourceId)===String(closing.id)));
    const adjustment=ppCashAdjustmentEntryPP(closing,difference);if(adjustment)accountingEntriesPP.push(adjustment);
    saveData();if(typeof ppWriteAudit==='function')void ppWriteAudit('cash',closing.id,old?'update':'close',old,closing,`Clôture ${date}`);
    renderAll();alert(`Clôture enregistrée.\n\nCaisse théorique : ${formatMoney(metrics.theoreticalCash)}\nCaisse réelle : ${formatMoney(actualCash)}\nÉcart : ${formatMoney(difference)}`);
}

function reopenCashClosingPP(id){
    const closing=cashClosingsPP.find(c=>String(c.id)===String(id));if(!closing)return;
    const latest=ppLatestCashClosingPP();if(!latest||String(latest.id)!==String(id)){alert('Il faut réouvrir les clôtures les plus récentes en premier.');return;}
    if(!confirm(`Réouvrir la caisse du ${formatDate(closing.date)} ? L'écriture de différence sera annulée.`))return;
    cashClosingsPP=cashClosingsPP.filter(c=>String(c.id)!==String(id));accountingEntriesPP=accountingEntriesPP.filter(e=>!(e.source==='cash-adjustment'&&String(e.sourceId)===String(id)));
    saveData();if(typeof ppWriteAudit==='function')void ppWriteAudit('cash',id,'reopen',closing,null,`Clôture ${closing.date}`);renderAll();
}

function renderCashClosingsHistoryPP(){
    const table=document.getElementById('ppCashClosingsTable');if(!table)return;const latest=ppLatestCashClosingPP();
    const rows=cashClosingsPP.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    table.innerHTML=rows.map(c=>`<tr><td><strong>${formatDate(c.date)}</strong></td><td>${formatMoney(c.openingCash)}</td><td>${formatMoney(c.cashIn)}</td><td>${formatMoney(c.cashOut)}</td><td>${formatMoney(c.theoreticalCash)}</td><td><strong>${formatMoney(c.actualCash)}</strong></td><td class="${Math.abs(c.difference)<0.01?'pp-cash-positive':'pp-cash-negative'}"><strong>${formatMoney(c.difference)}</strong></td><td>${escapeHTML(c.closedBy||'-')}</td><td><div class="action-buttons"><button class="btn small view" onclick="setValue('ppCashDate','${c.date}');renderCashClosingPP()">👁️</button><button class="btn small print" onclick="exportCashClosingPDFPP('${c.date}')">📄</button>${latest&&String(latest.id)===String(c.id)?`<button class="btn small danger" onclick="reopenCashClosingPP('${c.id}')">🔓</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="9" class="empty">Aucune clôture enregistrée.</td></tr>';
}

function ppCashClosingPrintHTMLPP(date){
    const metrics=ppCashDailyMetricsPP(date),saved=metrics.saved,actual=saved?.actualCash??'',difference=saved?.difference??'';
    const modeRows=metrics.modes.map(m=>`<tr><td>${escapeHTML(m.mode)}</td><td>${formatMoney(m.amount)}</td></tr>`).join('');
    const movementRows=metrics.lines.map(l=>`<tr><td>${escapeHTML(l.piece||'-')}</td><td>${escapeHTML(l.label||'-')}</td><td>${l.debit?formatMoney(l.debit):'-'}</td><td>${l.credit?formatMoney(l.credit):'-'}</td></tr>`).join('');
    return `<div class="doc-head"><h1>Pause & Plate</h1><p>Rapport Z - Clôture de caisse</p></div>${detailRowsHTML([['Date',formatDate(date)],['Statut',saved?'Clôturée':'Ouverte'],['Fond / ouverture',formatMoney(metrics.openingCash)],['Entrées espèces',formatMoney(metrics.cashIn)],['Sorties espèces',formatMoney(metrics.cashOut)],['Caisse théorique',formatMoney(metrics.theoreticalCash)],['Caisse réelle',saved?formatMoney(actual):'-'],['Écart',saved?formatMoney(difference):'-'],['Clôturé par',saved?.closedBy||'-'],['Observation',saved?.notes||'-']])}<h2>Encaissements par mode</h2><table><thead><tr><th>Mode</th><th>Montant</th></tr></thead><tbody>${modeRows||'<tr><td colspan="2">Aucun encaissement</td></tr>'}</tbody></table><h2>Mouvements espèces</h2><table><thead><tr><th>Pièce</th><th>Libellé</th><th>Entrée</th><th>Sortie</th></tr></thead><tbody>${movementRows||'<tr><td colspan="4">Aucun mouvement</td></tr>'}</tbody></table>`;
}

function printCashClosingPP(date=null){const target=date||getValue('ppCashDate')||new Date().toISOString().slice(0,10);printDocument(`Clôture de caisse ${target}`,ppCashClosingPrintHTMLPP(target));}

/* ======================== CENTRE D'EXPORTS ======================== */

function ppExportDateStampPP(){return new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);}
function ppDownloadBlobPP(content,mime,filename){const blob=content instanceof Blob?content:new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

function ppBackupPayloadPP(){
    const data=ppStateSnapshot();
    return {format:'pause-plate-manager-backup',schemaVersion:4,companyId:PP_COMPANY_ID,exportedAt:new Date().toISOString(),exportedBy:ppCurrentUserProfile?.name||ppCurrentUserProfile?.username||'Admin',data,auditTrail:Array.isArray(ppAuditTrail)?ppAuditTrail:[],counts:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,Array.isArray(value)?value.length:0]))};
}

function ppDownloadDatabaseBackupPP(prefix='pause-plate-backup'){
    const payload=ppBackupPayloadPP();ppDownloadBlobPP(JSON.stringify(payload,null,2),'application/json;charset=utf-8',`${prefix}-${ppExportDateStampPP()}.json`);return payload;
}

function ppExportDatabaseJSONPP(){if(!ppIsAdmin()){alert('Réservé à l’administrateur.');return;}ppDownloadDatabaseBackupPP();}

async function ppImportDatabasePP(event){
    const input=event?.target,file=input?.files?.[0];if(!file)return;
    try{
        const payload=JSON.parse(await file.text()),data=payload?.data||payload?.datasets;
        if(payload?.format!=='pause-plate-manager-backup'||!data||typeof data!=='object')throw new Error('Format de sauvegarde non reconnu.');
        const recognized=Object.keys(PP_CLOUD_DATASETS).filter(key=>Array.isArray(data[key]));if(!recognized.length)throw new Error('La sauvegarde ne contient aucune collection reconnue.');
        if(!confirm(`Restaurer ${recognized.length} collections depuis la sauvegarde du ${formatDate(payload.exportedAt)} ?\n\nLes données actuelles concernées seront remplacées. Une copie de sécurité va être téléchargée avant la restauration.`))return;
        ppDownloadDatabaseBackupPP('pause-plate-avant-restauration');
        ppApplyingCloudState=true;
        try{recognized.forEach(key=>ppSetDataset(key,data[key]));if(Array.isArray(payload.auditTrail)){ppAuditTrail=payload.auditTrail;localStorage.setItem('pause_plate_audit_trail',JSON.stringify(ppAuditTrail));}ppSaveLocalOnly();}
        finally{ppApplyingCloudState=false;}
        saveData();clearTimeout(ppCloudSaveTimer);if(ppCloudReady)await ppSaveCloudNow();renderAll();alert('Restauration terminée et synchronisée avec Firebase.');
    }catch(error){console.error(error);alert(`Restauration impossible : ${error.message||error}`);}finally{if(input)input.value='';}
}

function ensureExportsCenterPP(){
    const page=document.getElementById('exportsPage');if(!page||!ppIsAdmin())return;
    hideLegacyModuleContentPP(page,'ppExportsModule');if(document.getElementById('ppExportsModule'))return;
    const today=new Date().toISOString().slice(0,10),yearStart=`${new Date().getFullYear()}-01-01`,wrap=document.createElement('div');wrap.id='ppExportsModule';wrap.innerHTML=`
      <div class="pp-export-toolbar"><div><h2 style="margin:0 0 4px">💾 Sauvegarde & Exports</h2><p style="margin:0;color:#667085">Exports complets, lisibles et indépendants de Firebase.</p></div><span id="ppExportCloudStatus" class="status success">Firebase synchronisé</span></div>
      <div class="pp-finance-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        <div class="pp-export-card"><h3>🗄️ Base complète JSON</h3><p>Toutes les collections opérationnelles, clôtures, écritures comptables et journal d’activité. Ce fichier permet une restauration complète.</p><button class="btn primary" onclick="ppExportDatabaseJSONPP()">Télécharger la sauvegarde</button></div>
        <div class="pp-export-card"><h3>♻️ Restaurer une sauvegarde</h3><p>Remplace les collections présentes dans le fichier puis synchronise le résultat avec Firebase. Une copie de sécurité est créée avant l’opération.</p><button class="btn" onclick="document.getElementById('ppDatabaseRestoreFile').click()">Choisir un fichier JSON</button><input id="ppDatabaseRestoreFile" type="file" accept="application/json,.json" hidden onchange="ppImportDatabasePP(event)"></div>
        <div class="pp-export-card"><h3>📊 Export Excel complet</h3><p>Un classeur avec synthèse, stock, achats, ventes, dépenses, fournisseurs, clients, caisse, journal, balance et fiches techniques.</p><button class="btn primary" onclick="ppExportExcelPP()">Télécharger Excel</button></div>
        <div class="pp-export-card"><h3>📄 Rapport PDF</h3><p>Rapport de gestion imprimable pour la période sélectionnée : activité, achats, dépenses, résultat, trésorerie et clôtures.</p><button class="btn primary" onclick="ppExportManagementPDFPP()">Télécharger PDF</button></div>
      </div>
      <div class="pp-finance-panel"><h3 style="margin-top:0">Période du rapport PDF</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;max-width:650px"><div><label>Du</label><input id="ppExportFrom" type="date" value="${yearStart}"></div><div><label>Au</label><input id="ppExportTo" type="date" value="${today}"></div></div></div>
      <div class="pp-finance-panel"><h3 style="margin-top:0">Contenu de la base actuelle</h3><table><thead><tr><th>Collection</th><th>Enregistrements</th><th>Stockage</th></tr></thead><tbody id="ppExportDatasetTable"></tbody></table></div>`;
    page.appendChild(wrap);
}

function renderExportsCenterPP(){
    ensureExportsCenterPP();const table=document.getElementById('ppExportDatasetTable');if(!table)return;
    const labels={products:'Produits',movements:'Mouvements stock',suppliers:'Fournisseurs',invoices:'Factures achats',supplierPayments:'Règlements fournisseurs',clients:'Clients',clientInvoices:'Factures clients',clientPayments:'Règlements clients',sales:'Ventes',expenses:'Dépenses',recipes:'Fiches techniques',dailySalesScans:'Scans journaliers',accountingEntries:'Écritures manuelles',accountingSettings:'Paramètres comptables',cashClosings:'Clôtures de caisse'};
    table.innerHTML=Object.entries(ppStateSnapshot()).map(([key,value])=>`<tr><td><strong>${escapeHTML(labels[key]||key)}</strong></td><td>${Array.isArray(value)?value.length:0}</td><td><span class="status success">Firebase + local</span></td></tr>`).join('');
    const status=document.getElementById('ppExportCloudStatus');if(status){status.textContent=ppCloudReady?'✅ Firebase synchronisé':'⚠️ Sauvegarde locale';status.className=`status ${ppCloudReady?'success':'warning'}`;}
}

function ppExcelSafeDatePP(value){const s=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(`${s}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
function ppExcelNormalizeDateCellPP(cell,withTime=false){if(!cell||cell.t!=='d')return;const date=new Date(cell.v);if(Number.isNaN(date.getTime()))return;cell.t='n';cell.v=(date.getTime()-Date.UTC(1899,11,30))/86400000;cell.z=withTime?'yyyy-mm-dd hh:mm':'yyyy-mm-dd';}
function ppExcelSheetPP(workbook,name,rows,widths=[]){
    const safeRows=rows.length?rows:[{Information:'Aucune donnée'}],sheet=XLSX.utils.json_to_sheet(safeRows,{cellDates:true,dateNF:'yyyy-mm-dd'}),ref=sheet['!ref'];
    if(ref){
        const range=XLSX.utils.decode_range(ref);sheet['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:range.e.r,c:range.e.c}})};sheet['!freeze']={xSplit:0,ySplit:1};
        for(let col=range.s.c;col<=range.e.c;col++){
            const header=String(sheet[XLSX.utils.encode_cell({r:0,c:col})]?.v||'');
            for(let row=1;row<=range.e.r;row++){
                const cell=sheet[XLSX.utils.encode_cell({r:row,c:col})];if(!cell)continue;
                if(cell.t==='d')ppExcelNormalizeDateCellPP(cell,/clôturé le/i.test(header));
                else if(/^(date|échéance)$/i.test(header))cell.z='yyyy-mm-dd';
                else if(/%$/.test(header)&&!/^TVA/i.test(header))cell.z='0.0%';
                else if(/total|prix|valeur|montant|réglé|reste|solde|facturé|encaissé|ouverture|entrée|sortie|théorique|réel|écart|débit|crédit|coût|marge|trésorerie|achat|dépense/i.test(header))cell.z='#,##0.00 "DH"';
                else if(typeof cell.v==='number')cell.z='#,##0.00';
            }
        }
    }
    sheet['!cols']=(widths.length?widths:Object.keys(safeRows[0]).map(key=>Math.min(Math.max(String(key).length+4,14),36))).map(w=>({wch:w}));XLSX.utils.book_append_sheet(workbook,sheet,name.slice(0,31));return sheet;
}

function ppExcelRangeFormulaPP(sheetName,column,rowCount){return rowCount>0?`SUM('${sheetName}'!${column}2:${column}${rowCount+1})`:'0';}

function ppExportExcelPP(){
    if(!ppIsAdmin()){alert('Réservé à l’administrateur.');return;}if(typeof XLSX==='undefined'){alert('La bibliothèque Excel n’a pas été chargée. Vérifiez la connexion internet puis rechargez la page.');return;}
    const wb=XLSX.utils.book_new(),today=new Date().toISOString().slice(0,10),journal=ppAccountingJournalPP();
    const stockRows=products.map(p=>({ID:String(p.id??''),Article:p.name||'',Catégorie:p.category||'',Unité:p.unit||'',Stock:Number(p.stock||0),'Prix moyen':Number(p.price||0),'Valeur stock':Number(p.stock||0)*Number(p.price||0),'Stock minimum':Number(p.minStock||0),Statut:Number(p.minStock||0)>0&&Number(p.stock||0)<=Number(p.minStock||0)?'Alerte':'OK'}));
    const movementRows=movements.map(m=>({Date:ppExcelSafeDatePP(m.date),Article:m.productName||products.find(p=>Number(p.id)===Number(m.productId))?.name||'',Type:m.type||'',Quantité:Number(m.quantity||0),Unité:m.unit||'',Motif:m.reason||'',Note:m.note||'',Source:m.source||''}));
    const supplierRows=suppliers.map(s=>({ID:String(s.id??''),Fournisseur:s.name||'',Téléphone:s.phone||'',Email:s.email||'',ICE:s.ice||'',IF:s.if||'',Adresse:s.address||'','Délai paiement':ppSupplierTermLabelPP(s),'Total achats':invoices.filter(i=>Number(i.supplierId)===Number(s.id)).reduce((a,i)=>a+Number(i.totalTTC||0),0),'Total réglé':Number(s.paid||0),'Reste à payer':Math.max(invoices.filter(i=>Number(i.supplierId)===Number(s.id)).reduce((a,i)=>a+Number(i.totalTTC||0),0)-Number(s.paid||0),0)}));
    const purchaseRows=invoices.map(i=>({Date:ppExcelSafeDatePP(i.date),'N° facture':i.number||'',Fournisseur:i.supplierName||'','Total HT':Number(i.totalHT||0),TVA:Number(i.tva||0),'Total TTC':Number(i.totalTTC||0),Réglé:Number(i.paid||0),Reste:Number(i.due||0),Échéance:ppExcelSafeDatePP(i.dueDate),Statut:Number(i.due||0)>0?'À payer':'Payée'}));
    const purchaseLineRows=invoices.flatMap(i=>(i.lines||[]).map(l=>({'N° facture':i.number||'',Date:ppExcelSafeDatePP(i.date),Fournisseur:i.supplierName||'',Article:l.name||'',Quantité:Number(l.quantity||0),Unité:l.unit||'','PU HT':Number(l.price||0),'Taux TVA':Number(l.vatRate||0),'Total HT':Number(l.totalHT||0)})));
    const supplierPaymentRows=supplierPaymentsPP.map(p=>({Date:ppExcelSafeDatePP(p.date),Fournisseur:suppliers.find(s=>Number(s.id)===Number(p.supplierId))?.name||'',Montant:Number(p.amount||0),Mode:p.mode||'',Référence:p.reference||'',Affectations:(p.allocations||[]).map(a=>`${a.invoiceId}:${a.amount}`).join(' | '),Note:p.note||''}));
    const clientRows=clientsPP.map(c=>({ID:String(c.id??''),Client:c.name||'',Téléphone:c.phone||'',Email:c.email||'',ICE:c.ice||'',Adresse:c.address||'',Facturé:clientInvoicesPP.filter(i=>Number(i.clientId)===Number(c.id)).reduce((s,i)=>s+Number(i.totalTTC||0),0),Encaissé:clientInvoicesPP.filter(i=>Number(i.clientId)===Number(c.id)).reduce((s,i)=>s+Number(i.paid||0),0),Solde:clientInvoicesPP.filter(i=>Number(i.clientId)===Number(c.id)).reduce((s,i)=>s+Number(i.due||0),0)}));
    const clientInvoiceRows=clientInvoicesPP.map(i=>({Date:ppExcelSafeDatePP(i.date),'N° facture':i.number||'',Client:i.clientName||'',Libellé:i.label||'','Total TTC':Number(i.totalTTC||0),Encaissé:Number(i.paid||0),Solde:Number(i.due||0)}));
    const clientPaymentRows=clientPaymentsPP.map(p=>({Date:ppExcelSafeDatePP(p.date),Client:clientsPP.find(c=>Number(c.id)===Number(p.clientId))?.name||'',Montant:Number(p.amount||0),Mode:p.mode||'',Référence:p.reference||'',Affectations:(p.allocations||[]).map(a=>`${a.invoiceId}:${a.amount}`).join(' | ')}));
    const saleRows=salesPP.map(s=>({Date:ppExcelSafeDatePP(s.date),'N° pièce':s.number||'',Client:s.client||'Ventes comptoir','Total TTC':Number(s.totalTTC||0),'Total HT':Number(s.totalTTC||0)/1.10,'TVA 10%':Number(s.totalTTC||0)-Number(s.totalTTC||0)/1.10,Mode:s.mode||'','Date encaissement':ppExcelSafeDatePP(s.paymentDate)}));
    const saleLineRows=salesPP.flatMap(s=>(s.items||[]).map(i=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));return {'N° pièce':s.number||'',Date:ppExcelSafeDatePP(s.date),Article:r?.name||i.recipeName||'',Quantité:Number(i.quantity||0),'Prix vente':Number(r?.salePrice||0),'Coût théorique':r?recipeTotalsPP(r).cost*Number(i.quantity||0):0};}));
    const expenseRows=expensesPP.map(e=>{const t=ppExpensePaymentTotalsPP(e);return {Date:ppExcelSafeDatePP(e.date),Échéance:ppExcelSafeDatePP(e.dueDate),Catégorie:e.category||'',Bénéficiaire:e.beneficiary||'',ICE:e.ice||'',Libellé:e.label||'',Référence:e.reference||'','Total HT':Number(e.totalHT||0),'Taux TVA':Number(e.vatRate||0),TVA:Number(e.vatAmount||0),'Total TTC':Number(e.totalTTC??e.amount??0),Réglé:t.paid,Reste:t.due,Statut:ppExpenseStatusLabelPP(t.status)};});
    const expensePaymentRows=expensesPP.flatMap(e=>ppExpensePaymentsPP(e).map(p=>({Date:ppExcelSafeDatePP(p.date),Dépense:e.beneficiary||e.category||'',Catégorie:e.category||'',Montant:Number(p.amount||0),Mode:p.mode||'',Référence:p.reference||'',Note:p.note||''})));
    const recipeRows=recipesPP.map(r=>{const t=recipeTotalsPP(r);return {Code:r.sourceCode||String(r.id??''),Plat:r.name||'',Catégorie:r.category||'',Portions:Number(r.portions||1),'Prix vente':Number(r.salePrice||0),'Coût matière':t.cost,'Food cost %':t.pct/100,'Marge brute':t.margin,'Prix conseillé':t.recommended};});
    const ingredientRows=recipesPP.flatMap(r=>(r.ingredients||[]).map(i=>{const p=products.find(x=>Number(x.id)===Number(i.productId));return {Plat:r.name||'',Article:p?.name||'',Quantité:Number(i.quantity||0),Unité:i.unit||p?.unit||'','Prix unitaire':Number(p?.price||i.unitPrice||0),Coût:recipeIngredientCostPP(i)};}));
    const journalRows=journal.flatMap(e=>e.lines.map(l=>({Date:ppExcelSafeDatePP(e.date),Journal:e.journal||'',Pièce:e.piece||'',Compte:String(l.account||''),'Libellé compte':l.accountLabel||'',Libellé:l.label||e.label||'',Débit:Number(l.debit||0),Crédit:Number(l.credit||0),Source:e.source||''})));
    const balanceMap=ppAccountingBalanceMapPP(journal),balanceRows=[...balanceMap.values()].sort((a,b)=>a.account.localeCompare(b.account)).map(r=>{const diff=r.debit-r.credit;return {Compte:String(r.account),'Libellé':r.label,'Total débit':r.debit,'Total crédit':r.credit,'Solde débiteur':Math.max(diff,0),'Solde créditeur':Math.max(-diff,0)};});
    const cashRows=cashClosingsPP.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(c=>({Date:ppExcelSafeDatePP(c.date),Ouverture:c.openingCash,'Entrées espèces':c.cashIn,'Sorties espèces':c.cashOut,'Caisse théorique':c.theoreticalCash,'Caisse réelle':c.actualCash,Écart:c.difference,'Clôturé par':c.closedBy,Observation:c.notes,'Clôturé le':new Date(c.closedAt)}));
    const auditRows=(Array.isArray(ppAuditTrail)?ppAuditTrail:[]).map(a=>({Date:new Date(a.at),Utilisateur:a.user?.name||a.user?.email||'',Module:a.module||'',Action:a.action||'',Élément:a.label||a.entityId||'',Version:Number(a.version||0)}));

    const sheets={};
    sheets.Stock=ppExcelSheetPP(wb,'Stock',stockRows,[16,30,22,12,12,16,18,16,14]);
    ppExcelSheetPP(wb,'Mouvements',movementRows,[14,30,14,14,12,28,28,18]);ppExcelSheetPP(wb,'Fournisseurs',supplierRows,[15,30,18,28,18,18,32,22,18,18,18]);
    ppExcelSheetPP(wb,'Achats',purchaseRows,[14,18,30,16,14,16,16,16,14,14]);ppExcelSheetPP(wb,'Lignes Achats',purchaseLineRows,[18,14,28,30,12,12,14,14,16]);ppExcelSheetPP(wb,'Reglements Frs',supplierPaymentRows,[14,30,16,16,22,36,28]);
    ppExcelSheetPP(wb,'Clients',clientRows,[15,28,18,28,18,32,16,16,16]);ppExcelSheetPP(wb,'Factures Clients',clientInvoiceRows,[14,18,28,30,16,16,16]);ppExcelSheetPP(wb,'Reglements Clients',clientPaymentRows,[14,28,16,16,22,36]);
    ppExcelSheetPP(wb,'Ventes',saleRows,[14,18,28,16,16,14,16,18]);ppExcelSheetPP(wb,'Lignes Ventes',saleLineRows,[18,14,30,12,16,18]);ppExcelSheetPP(wb,'Depenses',expenseRows,[14,14,24,28,18,30,20,16,14,14,16,16,16,20]);ppExcelSheetPP(wb,'Reglements Depenses',expensePaymentRows,[14,30,22,16,16,22,28]);
    ppExcelSheetPP(wb,'Fiches Techniques',recipeRows,[16,30,20,12,16,18,16,18,18]);ppExcelSheetPP(wb,'Ingredients FT',ingredientRows,[30,30,14,12,16,16]);ppExcelSheetPP(wb,'Journal Comptable',journalRows,[14,10,20,12,32,34,16,16,18]);ppExcelSheetPP(wb,'Balance',balanceRows,[12,34,16,16,18,18]);ppExcelSheetPP(wb,'Clotures Caisse',cashRows,[14,16,18,18,18,18,16,22,30,20]);ppExcelSheetPP(wb,'Journal Activite',auditRows,[20,24,18,18,30,12]);

    const stockValue=stockRows.reduce((s,r)=>s+r['Valeur stock'],0),ca=saleRows.reduce((s,r)=>s+r['Total TTC'],0),purchases=purchaseRows.reduce((s,r)=>s+r['Total TTC'],0),expenses=expenseRows.reduce((s,r)=>s+r['Total TTC'],0),allMap=ppAccountingBalanceMapPP(journal);
    const allRevenues=[...allMap.values()].filter(r=>r.account.startsWith('7')).reduce((s,r)=>s+r.credit-r.debit,0),allCharges=[...allMap.values()].filter(r=>r.account.startsWith('6')).reduce((s,r)=>s+r.debit-r.credit,0);
    const stats={treasury:ppAccountingTreasuryBalancePP('5161',today)+ppAccountingTreasuryBalancePP('5141',today),result:allRevenues-allCharges,clients:Math.max((allMap.get('3421')?.debit||0)-(allMap.get('3421')?.credit||0),0),suppliers:Math.max((allMap.get('4411')?.credit||0)-(allMap.get('4411')?.debit||0),0)};
    const summaryData=[['Pause & Plate - Export complet'],['Généré le',new Date()],['Données au',ppExcelSafeDatePP(today)],[],['Indicateur','Valeur'],['Chiffre d’affaires TTC',{t:'n',f:ppExcelRangeFormulaPP('Ventes','D',saleRows.length),v:ca}],['Achats TTC',{t:'n',f:ppExcelRangeFormulaPP('Achats','F',purchaseRows.length),v:purchases}],['Dépenses TTC',{t:'n',f:ppExcelRangeFormulaPP('Depenses','K',expenseRows.length),v:expenses}],['Valeur du stock',{t:'n',f:ppExcelRangeFormulaPP('Stock','G',stockRows.length),v:stockValue}],['Trésorerie actuelle',stats.treasury],['Résultat comptable provisoire',stats.result],['Créances clients',stats.clients],['Dettes fournisseurs',stats.suppliers],[],['Contrôle','Statut'],['Balance débit/crédit',Math.abs(journalRows.reduce((s,r)=>s+r.Débit-r.Crédit,0))<0.01?'PASS':'FAIL']];
    const summary=XLSX.utils.aoa_to_sheet(summaryData,{cellDates:true,dateNF:'yyyy-mm-dd'});summary['!cols']=[{wch:34},{wch:24}];summary['!merges']=[XLSX.utils.decode_range('A1:B1')];summary['!freeze']={xSplit:0,ySplit:5};ppExcelNormalizeDateCellPP(summary.B2,true);ppExcelNormalizeDateCellPP(summary.B3,false);for(let row=5;row<=12;row++){const cell=summary[`B${row+1}`];if(cell)cell.z='#,##0.00 "DH"';}XLSX.utils.book_append_sheet(wb,summary,'Synthese');wb.SheetNames=['Synthese',...wb.SheetNames.filter(name=>name!=='Synthese')];
    wb.Props={Title:'Pause & Plate - Export complet',Subject:'Base de gestion et pré-comptabilité',Author:'Pause & Plate',CreatedDate:new Date()};wb.Workbook=wb.Workbook||{};wb.Workbook.CalcPr={fullCalcOnLoad:true,forceFullCalc:true};
    XLSX.writeFile(wb,`pause-plate-export-complet-${today}.xlsx`,{compression:true,cellDates:true});
}

function ppPdfLibraryPP(){return window.jspdf?.jsPDF||null;}
function ppPdfMoneyPP(value){return `${Number(value||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} DH`;}
function ppPdfDatePP(value){return value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('fr-FR'):'-';}
function ppPdfHeaderPP(doc,title,subtitle=''){
    doc.setFillColor(9,75,45);doc.rect(0,0,doc.internal.pageSize.getWidth(),25,'F');doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont('helvetica','bold');doc.text('Pause & Plate',14,11);doc.setFontSize(11);doc.setFont('helvetica','normal');doc.text(title,14,18);if(subtitle)doc.text(subtitle,doc.internal.pageSize.getWidth()-14,18,{align:'right'});doc.setTextColor(24,37,27);
}
function ppPdfFooterAllPagesPP(doc){const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(102,112,133);doc.text(`Pause & Plate - Page ${i}/${pages}`,14,doc.internal.pageSize.getHeight()-7);doc.text(new Date().toLocaleString('fr-FR'),doc.internal.pageSize.getWidth()-14,doc.internal.pageSize.getHeight()-7,{align:'right'});}}
function ppPdfTablePP(doc,title,head,body,startY=32){const pageHeight=doc.internal.pageSize.getHeight();if(startY>pageHeight-40){doc.addPage();ppPdfHeaderPP(doc,'Suite du rapport');startY=32;}doc.setFontSize(12);doc.setFont('helvetica','bold');doc.setTextColor(9,75,45);doc.text(title,14,startY);doc.autoTable({startY:startY+4,head:[head],body:body.length?body:[Array(head.length).fill('').map((_,i)=>i===0?'Aucune donnée':'')],theme:'striped',styles:{font:'helvetica',fontSize:7.5,cellPadding:2,textColor:[24,37,27]},headStyles:{fillColor:[9,75,45],textColor:[255,255,255]},alternateRowStyles:{fillColor:[247,241,229]},margin:{left:14,right:14,bottom:14},showHead:'everyPage'});return doc.lastAutoTable.finalY+9;}

function exportCashClosingPDFPP(date=null){
    const JsPDF=ppPdfLibraryPP();if(!JsPDF){alert('La bibliothèque PDF n’a pas été chargée. Vérifiez la connexion internet puis rechargez la page.');return;}const target=date||getValue('ppCashDate')||new Date().toISOString().slice(0,10),m=ppCashDailyMetricsPP(target),saved=m.saved,doc=new JsPDF({unit:'mm',format:'a4'});ppPdfHeaderPP(doc,'Rapport Z - Clôture de caisse',ppPdfDatePP(target));
    let y=ppPdfTablePP(doc,'Résumé',['Indicateur','Montant'],[['Fond / ouverture',ppPdfMoneyPP(m.openingCash)],['Entrées espèces',ppPdfMoneyPP(m.cashIn)],['Sorties espèces',ppPdfMoneyPP(m.cashOut)],['Caisse théorique',ppPdfMoneyPP(m.theoreticalCash)],['Caisse réelle',saved?ppPdfMoneyPP(saved.actualCash):'-'],['Écart',saved?ppPdfMoneyPP(saved.difference):'-'],['Statut',saved?'Clôturée':'Ouverte'],['Clôturé par',saved?.closedBy||'-']],32);
    y=ppPdfTablePP(doc,'Encaissements par mode',['Mode','Montant'],m.modes.map(x=>[x.mode,ppPdfMoneyPP(x.amount)]),y);ppPdfTablePP(doc,'Mouvements espèces',['Pièce','Origine','Libellé','Entrée','Sortie'],m.lines.map(l=>[l.piece||'-',ppCashSourceLabelPP(l.source),l.label||'-',l.debit?ppPdfMoneyPP(l.debit):'-',l.credit?ppPdfMoneyPP(l.credit):'-']),y);ppPdfFooterAllPagesPP(doc);doc.save(`pause-plate-cloture-${target}.pdf`);
}

function ppExportManagementPDFPP(){
    if(!ppIsAdmin()){alert('Réservé à l’administrateur.');return;}const JsPDF=ppPdfLibraryPP();if(!JsPDF){alert('La bibliothèque PDF n’a pas été chargée. Vérifiez la connexion internet puis rechargez la page.');return;}
    const from=getValue('ppExportFrom'),to=getValue('ppExportTo');if(from&&to&&from>to){alert('La date de début doit être antérieure à la date de fin.');return;}const inRange=d=>{const x=String(d||'').slice(0,10);return (!from||x>=from)&&(!to||x<=to);};
    const sales=salesPP.filter(s=>inRange(s.date)),purchases=invoices.filter(i=>inRange(i.date)),expenses=expensesPP.filter(e=>inRange(e.date)),closings=cashClosingsPP.filter(c=>inRange(c.date));
    const caTTC=sales.reduce((s,x)=>s+Number(x.totalTTC||0),0),caHT=caTTC/1.10,purchaseTTC=purchases.reduce((s,x)=>s+Number(x.totalTTC||0),0),expenseTTC=expenses.reduce((s,x)=>s+Number(x.totalTTC??x.amount??0),0);
    const entries=ppAccountingJournalPP().filter(e=>inRange(e.date)),map=ppAccountingBalanceMapPP(entries),revenues=[...map.values()].filter(r=>r.account.startsWith('7')).reduce((s,r)=>s+r.credit-r.debit,0),charges=[...map.values()].filter(r=>r.account.startsWith('6')).reduce((s,r)=>s+r.debit-r.credit,0),result=revenues-charges;
    const doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4'});ppPdfHeaderPP(doc,'Rapport de gestion',`${ppPdfDatePP(from)} - ${ppPdfDatePP(to)}`);
    let y=ppPdfTablePP(doc,'Synthèse',['Indicateur','Valeur'],[['Chiffre d’affaires HT',ppPdfMoneyPP(caHT)],['Chiffre d’affaires TTC',ppPdfMoneyPP(caTTC)],['Achats TTC',ppPdfMoneyPP(purchaseTTC)],['Dépenses TTC',ppPdfMoneyPP(expenseTTC)],['Produits comptables',ppPdfMoneyPP(revenues)],['Charges comptables',ppPdfMoneyPP(charges)],['Résultat provisoire',ppPdfMoneyPP(result)],['Trésorerie actuelle',ppPdfMoneyPP(ppAccountingTreasuryBalancePP('5161',to)+ppAccountingTreasuryBalancePP('5141',to))]],32);
    y=ppPdfTablePP(doc,'Ventes',['Date','Pièce','Client','HT','TVA','TTC','Mode'],sales.map(s=>{const t=Number(s.totalTTC||0),h=t/1.10;return [ppPdfDatePP(s.date),s.number||'-',s.client||'Comptoir',ppPdfMoneyPP(h),ppPdfMoneyPP(t-h),ppPdfMoneyPP(t),s.mode||'-'];}),y);
    y=ppPdfTablePP(doc,'Achats',['Date','Facture','Fournisseur','HT','TVA','TTC','Reste'],purchases.map(i=>[ppPdfDatePP(i.date),i.number||'-',i.supplierName||'-',ppPdfMoneyPP(i.totalHT),ppPdfMoneyPP(i.tva),ppPdfMoneyPP(i.totalTTC),ppPdfMoneyPP(i.due)]),y);
    y=ppPdfTablePP(doc,'Dépenses',['Date','Catégorie','Bénéficiaire','HT','TVA','TTC','Reste'],expenses.map(e=>{const t=ppExpensePaymentTotalsPP(e);return [ppPdfDatePP(e.date),e.category||'-',e.beneficiary||'-',ppPdfMoneyPP(e.totalHT),ppPdfMoneyPP(e.vatAmount),ppPdfMoneyPP(e.totalTTC??e.amount),ppPdfMoneyPP(t.due)];}),y);
    y=ppPdfTablePP(doc,'Clôtures de caisse',['Date','Ouverture','Entrées','Sorties','Théorique','Réel','Écart'],closings.map(c=>[ppPdfDatePP(c.date),ppPdfMoneyPP(c.openingCash),ppPdfMoneyPP(c.cashIn),ppPdfMoneyPP(c.cashOut),ppPdfMoneyPP(c.theoreticalCash),ppPdfMoneyPP(c.actualCash),ppPdfMoneyPP(c.difference)]),y);
    const balanceRows=[...map.values()].sort((a,b)=>a.account.localeCompare(b.account)).map(r=>[r.account,r.label,ppPdfMoneyPP(r.debit),ppPdfMoneyPP(r.credit),ppPdfMoneyPP(Math.max(r.debit-r.credit,0)),ppPdfMoneyPP(Math.max(r.credit-r.debit,0))]);ppPdfTablePP(doc,'Balance comptable',['Compte','Libellé','Débit','Crédit','Solde débiteur','Solde créditeur'],balanceRows,y);ppPdfFooterAllPagesPP(doc);doc.save(`pause-plate-rapport-${from||'debut'}-${to||'fin'}.pdf`);
}

const ppCashRenderAllBase=renderAll;
renderAll=function(){const result=ppCashRenderAllBase.apply(this,arguments);try{ensureCashClosingModulePP();renderCashClosingPP();}catch(error){console.error('Caisse',error);}try{renderExportsCenterPP();}catch(error){console.error('Exports',error);}return result;};

document.addEventListener('click',event=>{const nav=event.target.closest?.('[data-page="cash"],[data-page="exports"]');if(!nav)return;setTimeout(()=>{if(nav.dataset.page==='cash')renderCashClosingPP();else renderExportsCenterPP();},0);});
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{ensureCashClosingModulePP();renderCashClosingPP();renderExportsCenterPP();}catch(error){console.error(error);}},250));
