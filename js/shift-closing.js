/* =========================================================
   PAUSE & PLATE — CLOTURE SHIFT
   Recette caisse - TPE - depenses - autre = reste especes.
   Chaque cloture est un document Firestore individuel afin
   qu'un employe ne puisse lire/modifier que ses propres shifts.
========================================================= */

const PP_SHIFT_CLOSINGS_LOCAL_KEY = "pause_plate_shift_closings";
let ppShiftClosingsPP = (loadStorage(PP_SHIFT_CLOSINGS_LOCAL_KEY, []) || [])
    .map(ppNormalizeShiftClosingPP)
    .filter(item => item.date && item.id);
let ppShiftEditingIdPP = null;
let ppShiftUnsubscribePP = null;
let ppShiftCloudMessagePP = "Chargement Firebase…";
let ppShiftCloudKindPP = "warning";

function ppShiftRoundMoneyPP(value){
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function ppShiftTodayPP(){
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
}

function ppNormalizeShiftClosingPP(raw){
    const value = raw || {};
    const systemRevenue = Math.max(ppShiftRoundMoneyPP(value.systemRevenue), 0);
    const tpe = Math.max(ppShiftRoundMoneyPP(value.tpe), 0);
    const expenses = Math.max(ppShiftRoundMoneyPP(value.expenses), 0);
    const other = Math.max(ppShiftRoundMoneyPP(value.other), 0);
    return {
        id: String(value.id || ""),
        date: String(value.date || "").slice(0, 10),
        shift: ["morning", "evening", "full-day"].includes(value.shift) ? value.shift : "full-day",
        employeeUid: String(value.employeeUid || value.createdBy || ""),
        employeeName: String(value.employeeName || "Utilisateur").slice(0, 120),
        employeeUsername: String(value.employeeUsername || ""),
        systemRevenue,
        tpe,
        expenses,
        other,
        otherLabel: String(value.otherLabel || "").slice(0, 160),
        cashBalance: ppShiftRoundMoneyPP(
            value.cashBalance !== undefined
                ? value.cashBalance
                : systemRevenue - tpe - expenses - other
        ),
        notes: String(value.notes || "").slice(0, 300),
        createdBy: String(value.createdBy || value.employeeUid || ""),
        createdAt: String(value.createdAt || new Date().toISOString()),
        updatedAt: String(value.updatedAt || value.createdAt || new Date().toISOString())
    };
}

function ppShiftSaveLocalPP(){
    localStorage.setItem(PP_SHIFT_CLOSINGS_LOCAL_KEY, JSON.stringify(ppShiftClosingsPP));
}

function ppShiftCurrentUidPP(){
    return String(ppCurrentUser?.uid || ppCurrentFirebaseUser?.()?.uid || "");
}

function ppShiftCurrentNamePP(){
    return String(
        ppCurrentUserProfile?.name ||
        ppCurrentUserProfile?.username ||
        ppCurrentUser?.email ||
        "Utilisateur"
    );
}

function ppShiftCurrentUsernamePP(){
    return String(ppCurrentUserProfile?.username || ppCurrentUser?.email || "");
}

function ppShiftCollectionPP(){
    if(!ppDb) return null;
    return ppDb.collection("companies").doc(PP_COMPANY_ID).collection("shiftClosings");
}

function ppShiftLabelPP(shift){
    return ({
        morning: "Matin",
        evening: "Soir",
        "full-day": "Journée complète"
    })[shift] || "Journée complète";
}

function ppShiftVisibleRowsPP(){
    if(typeof ppCan === "function" && !ppCan("shiftClosings", "view")) return [];
    if(ppIsAdmin()) return ppShiftClosingsPP.slice();
    const uid = ppShiftCurrentUidPP();
    if(!uid) return [];
    return ppShiftClosingsPP.filter(item => item.employeeUid === uid);
}

function ppShiftSetCloudStatusPP(message, kind = "success"){
    ppShiftCloudMessagePP = message;
    ppShiftCloudKindPP = kind;
    const status = document.getElementById("ppShiftCloudStatus");
    if(status){
        status.textContent = message;
        status.className = `status ${kind}`;
    }
}

function ensureShiftClosingModulePP(){
    const page = document.getElementById("shiftPage");
    if(!page) return;
    if(typeof hideLegacyModuleContentPP === "function"){
        hideLegacyModuleContentPP(page, "ppShiftClosingModule");
    }
    if(document.getElementById("ppShiftClosingModule")) return;

    const wrap = document.createElement("div");
    wrap.id = "ppShiftClosingModule";
    wrap.innerHTML = `
      <div class="pp-shift-toolbar">
        <div>
          <h2>🧾 Clôture Shift</h2>
          <p>Saisissez les montants du système de caisse. Le reste en espèces est calculé automatiquement.</p>
        </div>
        <span id="ppShiftCloudStatus" class="status warning">Chargement Firebase…</span>
      </div>

      <form id="ppShiftClosingForm" class="pp-shift-form" onsubmit="ppSaveShiftClosingPP(event)">
        <input id="ppShiftClosingId" type="hidden">

        <div class="pp-shift-form-grid pp-shift-form-grid-head">
          <div>
            <label>Employé</label>
            <input id="ppShiftEmployee" type="text" readonly>
          </div>
          <div>
            <label>Date de journée *</label>
            <input id="ppShiftDate" type="date" required>
          </div>
          <div>
            <label>Shift *</label>
            <select id="ppShiftType" required>
              <option value="morning">Matin</option>
              <option value="evening">Soir</option>
              <option value="full-day" selected>Journée complète</option>
            </select>
          </div>
        </div>

        <div class="pp-shift-amount-grid">
          <div class="pp-shift-amount-card is-revenue">
            <label>Recette système de caisse *</label>
            <div class="pp-shift-money-input"><input id="ppShiftSystemRevenue" type="number" min="0" step="0.01" value="0" required oninput="ppUpdateShiftCalculationPP()"><span>DH</span></div>
            <small>Total de la recette affichée par la caisse</small>
          </div>
          <div class="pp-shift-amount-card is-tpe">
            <label>Paiements TPE</label>
            <div class="pp-shift-money-input"><input id="ppShiftTpe" type="number" min="0" step="0.01" value="0" oninput="ppUpdateShiftCalculationPP()"><span>DH</span></div>
            <small>Total payé par carte bancaire</small>
          </div>
          <div class="pp-shift-amount-card is-expense">
            <label>Dépenses du shift</label>
            <div class="pp-shift-money-input"><input id="ppShiftExpenses" type="number" min="0" step="0.01" value="0" oninput="ppUpdateShiftCalculationPP()"><span>DH</span></div>
            <small>Dépenses payées depuis la caisse</small>
          </div>
          <div class="pp-shift-amount-card is-other">
            <label>Autre</label>
            <div class="pp-shift-money-input"><input id="ppShiftOther" type="number" min="0" step="0.01" value="0" oninput="ppUpdateShiftCalculationPP()"><span>DH</span></div>
            <small>Autre sortie ou retenue</small>
          </div>
        </div>

        <div class="pp-shift-form-grid">
          <div>
            <label>Détail de « Autre »</label>
            <input id="ppShiftOtherLabel" type="text" maxlength="160" placeholder="Ex : avance, remboursement…">
          </div>
          <div class="pp-shift-notes-field">
            <label>Observation</label>
            <input id="ppShiftNotes" type="text" maxlength="300" placeholder="Observation facultative">
          </div>
        </div>

        <div id="ppShiftCalculationBox" class="pp-shift-calculation">
          <div>
            <span>Calcul automatique</span>
            <small>Recette − TPE − Dépenses − Autre</small>
          </div>
          <strong id="ppShiftCashBalance">0,00 DH</strong>
          <em>Reste espèces à remettre</em>
        </div>

        <div class="pp-shift-form-actions">
          <button class="btn" type="button" onclick="ppResetShiftClosingFormPP()">↻ Nouveau</button>
          <button id="ppShiftSaveButton" class="btn primary" type="submit">✅ Enregistrer la clôture</button>
        </div>
      </form>

      <div class="pp-shift-history">
        <div class="pp-shift-history-head">
          <div><h3>Historique des clôtures</h3><p>${ppIsAdmin() ? "Toutes les clôtures des employés." : "Vos clôtures enregistrées."}</p></div>
          <div class="pp-shift-filters">
            <input id="ppShiftHistoryDate" type="date" onchange="ppRenderShiftClosingsPP()" title="Filtrer par date">
            <select id="ppShiftHistoryType" onchange="ppRenderShiftClosingsPP()">
              <option value="">Tous les shifts</option>
              <option value="morning">Matin</option>
              <option value="evening">Soir</option>
              <option value="full-day">Journée complète</option>
            </select>
            <button class="btn small" type="button" onclick="setValue('ppShiftHistoryDate','');setValue('ppShiftHistoryType','');ppRenderShiftClosingsPP()">Effacer</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Date</th><th>Shift</th><th>Employé</th><th>Recette</th><th>TPE</th><th>Dépenses</th><th>Autre</th><th>Reste espèces</th><th>Actions</th></tr></thead>
            <tbody id="ppShiftClosingsTable"></tbody>
          </table>
        </div>
      </div>`;
    page.appendChild(wrap);
    ppResetShiftClosingFormPP();
    ppShiftSetCloudStatusPP(ppShiftCloudMessagePP, ppShiftCloudKindPP);
}

function ppUpdateShiftCalculationPP(){
    const systemRevenue = Math.max(ppShiftRoundMoneyPP(getValue("ppShiftSystemRevenue")), 0);
    const tpe = Math.max(ppShiftRoundMoneyPP(getValue("ppShiftTpe")), 0);
    const expenses = Math.max(ppShiftRoundMoneyPP(getValue("ppShiftExpenses")), 0);
    const other = Math.max(ppShiftRoundMoneyPP(getValue("ppShiftOther")), 0);
    const balance = ppShiftRoundMoneyPP(systemRevenue - tpe - expenses - other);
    setText("ppShiftCashBalance", formatMoney(balance));
    const box = document.getElementById("ppShiftCalculationBox");
    if(box) box.classList.toggle("is-negative", balance < 0);
    return {systemRevenue, tpe, expenses, other, balance};
}

function ppResetShiftClosingFormPP(){
    ppShiftEditingIdPP = null;
    const form = document.getElementById("ppShiftClosingForm");
    if(form) form.reset();
    setValue("ppShiftClosingId", "");
    setValue("ppShiftEmployee", ppShiftCurrentNamePP());
    setValue("ppShiftDate", ppShiftTodayPP());
    setValue("ppShiftType", "full-day");
    setValue("ppShiftSystemRevenue", "0");
    setValue("ppShiftTpe", "0");
    setValue("ppShiftExpenses", "0");
    setValue("ppShiftOther", "0");
    setValue("ppShiftOtherLabel", "");
    setValue("ppShiftNotes", "");
    const button = document.getElementById("ppShiftSaveButton");
    if(button) button.textContent = "✅ Enregistrer la clôture";
    ppUpdateShiftCalculationPP();
}

function ppSetShiftFormBusyPP(busy){
    const button = document.getElementById("ppShiftSaveButton");
    if(!button) return;
    button.disabled = Boolean(busy);
    button.textContent = busy ? "Enregistrement…" : (ppShiftEditingIdPP ? "💾 Mettre à jour" : "✅ Enregistrer la clôture");
}

async function ppSaveShiftClosingPP(event){
    event?.preventDefault?.();
    if(typeof ppCan === "function" && !ppCan("shiftClosings", "edit")){
        alert("Vous n'avez pas la permission Clôture Shift.");
        return;
    }
    const uid = ppShiftCurrentUidPP();
    if(!uid){ alert("Connectez-vous avant d'enregistrer la clôture."); return; }

    const date = getValue("ppShiftDate");
    const shift = getValue("ppShiftType") || "full-day";
    const money = ppUpdateShiftCalculationPP();
    const otherLabel = getValue("ppShiftOtherLabel").trim();
    if(!date){ alert("Choisissez la date de journée."); return; }
    if(money.other > 0 && !otherLabel){ alert("Indiquez le détail du montant « Autre »."); return; }

    const old = ppShiftEditingIdPP
        ? ppShiftClosingsPP.find(item => item.id === ppShiftEditingIdPP)
        : null;
    if(old && !ppIsAdmin() && old.employeeUid !== uid){
        alert("Vous ne pouvez pas modifier la clôture d'un autre employé.");
        return;
    }

    const recordEmployeeUid = old?.employeeUid || uid;
    const duplicate = ppShiftVisibleRowsPP().find(item =>
        item.id !== ppShiftEditingIdPP && item.date === date && item.shift === shift && item.employeeUid === recordEmployeeUid
    );
    if(duplicate){
        ppEditShiftClosingPP(duplicate.id);
        alert("Une clôture existe déjà pour cette date et ce shift. Elle a été chargée pour modification.");
        return;
    }

    if(money.balance < 0 && !confirm("Le reste en espèces est négatif. Voulez-vous quand même enregistrer cette clôture ?")) return;

    const now = new Date().toISOString();
    const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, "");
    const id = old?.id || `shift-${safeUid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const record = ppNormalizeShiftClosingPP({
        id,
        date,
        shift,
        employeeUid: old?.employeeUid || uid,
        employeeName: old?.employeeName || ppShiftCurrentNamePP(),
        employeeUsername: old?.employeeUsername || ppShiftCurrentUsernamePP(),
        systemRevenue: money.systemRevenue,
        tpe: money.tpe,
        expenses: money.expenses,
        other: money.other,
        otherLabel,
        cashBalance: money.balance,
        notes: getValue("ppShiftNotes").trim(),
        createdBy: old?.createdBy || uid,
        createdAt: old?.createdAt || now,
        updatedAt: now
    });

    if(old){
        const confirmed = confirm(
            `Confirmer la modification de cette clôture ?\n\n` +
            `Employé : ${record.employeeName}\n` +
            `Date : ${formatDate(record.date)} — ${ppShiftLabelPP(record.shift)}\n` +
            `Ancien reste espèces : ${formatMoney(old.cashBalance)}\n` +
            `Nouveau reste espèces : ${formatMoney(record.cashBalance)}`
        );
        if(!confirmed) return;
    }

    ppSetShiftFormBusyPP(true);
    try{
        const collection = ppShiftCollectionPP();
        if(!collection) throw new Error("Firebase n'est pas prêt. Vérifiez la connexion.");
        await collection.doc(id).set(record);

        const index = ppShiftClosingsPP.findIndex(item => item.id === id);
        if(index >= 0) ppShiftClosingsPP[index] = record;
        else ppShiftClosingsPP.unshift(record);
        ppShiftSaveLocalPP();

        if(typeof ppWriteAudit === "function"){
            await ppWriteAudit(
                "shiftClosings",
                id,
                old ? "update" : "create",
                old || null,
                record,
                `${ppShiftLabelPP(shift)} — ${date}`
            );
        }

        ppResetShiftClosingFormPP();
        ppRenderShiftClosingsPP();
        ppShiftSetCloudStatusPP("✅ Clôture synchronisée", "success");
        alert(`${old ? "Clôture modifiée" : "Clôture enregistrée"}.\n\nReste espèces à remettre : ${formatMoney(record.cashBalance)}`);
    }catch(error){
        console.error("Clôture Shift", error);
        ppShiftSetCloudStatusPP("⚠️ Enregistrement impossible", "danger");
        alert(`Enregistrement impossible : ${error?.message || error}`);
    }finally{
        ppSetShiftFormBusyPP(false);
    }
}

function ppEditShiftClosingPP(id){
    if(typeof ppCan === "function" && !ppCan("shiftClosings", "edit")){
        alert("Vous n'avez pas la permission Clôture Shift.");
        return;
    }
    const record = ppShiftClosingsPP.find(item => item.id === String(id));
    if(!record) return;
    const uid = ppShiftCurrentUidPP();
    if(!ppIsAdmin() && record.employeeUid !== uid){
        alert("Accès non autorisé.");
        return;
    }
    ppShiftEditingIdPP = record.id;
    setValue("ppShiftClosingId", record.id);
    setValue("ppShiftEmployee", record.employeeName);
    setValue("ppShiftDate", record.date);
    setValue("ppShiftType", record.shift);
    setValue("ppShiftSystemRevenue", record.systemRevenue);
    setValue("ppShiftTpe", record.tpe);
    setValue("ppShiftExpenses", record.expenses);
    setValue("ppShiftOther", record.other);
    setValue("ppShiftOtherLabel", record.otherLabel);
    setValue("ppShiftNotes", record.notes);
    const button = document.getElementById("ppShiftSaveButton");
    if(button) button.textContent = "💾 Mettre à jour";
    ppUpdateShiftCalculationPP();
    document.getElementById("ppShiftClosingForm")?.scrollIntoView({behavior:"smooth", block:"start"});
}

async function ppDeleteShiftClosingPP(id){
    if(!ppIsAdmin()){ alert("Suppression réservée à l'administrateur."); return; }
    const record = ppShiftClosingsPP.find(item => item.id === String(id));
    if(!record || !confirm(`Supprimer la clôture de ${record.employeeName} du ${formatDate(record.date)} ?`)) return;
    try{
        const collection = ppShiftCollectionPP();
        if(!collection) throw new Error("Firebase n'est pas prêt.");
        await collection.doc(record.id).delete();
        ppShiftClosingsPP = ppShiftClosingsPP.filter(item => item.id !== record.id);
        ppShiftSaveLocalPP();
        if(typeof ppWriteAudit === "function"){
            await ppWriteAudit("shiftClosings", record.id, "delete", record, null, `${ppShiftLabelPP(record.shift)} — ${record.date}`);
        }
        ppRenderShiftClosingsPP();
    }catch(error){
        console.error(error);
        alert(`Suppression impossible : ${error?.message || error}`);
    }
}

function ppPrintShiftClosingPP(id){
    if(typeof ppCan === "function" && !ppCan("shiftClosings", "view")){
        alert("Vous n'avez pas la permission Clôture Shift.");
        return;
    }
    const record = ppShiftClosingsPP.find(item => item.id === String(id));
    if(!record) return;
    printDocument(
        `Clôture Shift ${record.date}`,
        `<div class="doc-head"><h1>Pause & Plate</h1><p>Clôture Shift</p></div>${detailRowsHTML([
            ["Date", formatDate(record.date)],
            ["Shift", ppShiftLabelPP(record.shift)],
            ["Employé", record.employeeName],
            ["Recette système de caisse", formatMoney(record.systemRevenue)],
            ["Paiements TPE", formatMoney(record.tpe)],
            ["Dépenses", formatMoney(record.expenses)],
            ["Autre", formatMoney(record.other)],
            ["Détail Autre", record.otherLabel || "-"],
            ["Reste espèces à remettre", formatMoney(record.cashBalance)],
            ["Observation", record.notes || "-"],
            ["Dernière mise à jour", new Date(record.updatedAt).toLocaleString("fr-FR")]
        ])}<div style="display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:55px;text-align:center"><div style="border-top:1px solid #444;padding-top:8px">Signature employé</div><div style="border-top:1px solid #444;padding-top:8px">Signature responsable</div></div>`
    );
}

function ppRenderShiftClosingsPP(){
    ensureShiftClosingModulePP();
    setValue("ppShiftEmployee", ppShiftEditingIdPP ? getValue("ppShiftEmployee") : ppShiftCurrentNamePP());
    const table = document.getElementById("ppShiftClosingsTable");
    if(!table) return;
    const date = getValue("ppShiftHistoryDate");
    const shift = getValue("ppShiftHistoryType");
    const rows = ppShiftVisibleRowsPP()
        .filter(item => (!date || item.date === date) && (!shift || item.shift === shift))
        .sort((a,b) => String(b.date).localeCompare(String(a.date)) || String(b.updatedAt).localeCompare(String(a.updatedAt)));

    table.innerHTML = rows.map(item => {
        const canEdit = ppIsAdmin() || item.employeeUid === ppShiftCurrentUidPP();
        return `<tr>
          <td><strong>${formatDate(item.date)}</strong></td>
          <td>${escapeHTML(ppShiftLabelPP(item.shift))}</td>
          <td>${escapeHTML(item.employeeName || "-")}</td>
          <td>${formatMoney(item.systemRevenue)}</td>
          <td>${formatMoney(item.tpe)}</td>
          <td>${formatMoney(item.expenses)}</td>
          <td>${formatMoney(item.other)}${item.otherLabel ? `<small class="pp-shift-table-note">${escapeHTML(item.otherLabel)}</small>` : ""}</td>
          <td class="${item.cashBalance < 0 ? "pp-shift-negative" : "pp-shift-positive"}"><strong>${formatMoney(item.cashBalance)}</strong></td>
          <td><div class="action-buttons">
            <button class="btn small print pp-shift-action-button" type="button" onclick="ppPrintShiftClosingPP('${item.id}')" title="Imprimer la clôture">🖨️ Imprimer</button>
            ${canEdit ? `<button class="btn small edit pp-shift-action-button" type="button" onclick="ppEditShiftClosingPP('${item.id}')" title="Modifier la clôture">✏️ Modifier</button>` : ""}
            ${ppIsAdmin() ? `<button class="btn small danger" type="button" onclick="ppDeleteShiftClosingPP('${item.id}')" title="Supprimer">🗑️</button>` : ""}
          </div></td>
        </tr>`;
    }).join("") || '<tr><td colspan="9" class="empty">Aucune clôture Shift enregistrée.</td></tr>';

    ppShiftSetCloudStatusPP(ppShiftCloudMessagePP, ppShiftCloudKindPP);
    if(typeof ppApplyGlobalPagination === "function") setTimeout(ppApplyGlobalPagination, 0);
}

function ppStopShiftClosingCloudPP(){
    if(ppShiftUnsubscribePP){
        try{ ppShiftUnsubscribePP(); }catch(_){ }
        ppShiftUnsubscribePP = null;
    }
}

function ppStartShiftClosingCloudPP(){
    ppStopShiftClosingCloudPP();
    const collection = ppShiftCollectionPP();
    const uid = ppShiftCurrentUidPP();
    if(typeof ppCan === "function" && !ppCan("shiftClosings", "view")){
        ppShiftClosingsPP = [];
        ppShiftSaveLocalPP();
        ppShiftSetCloudStatusPP("Accès Clôture Shift désactivé", "warning");
        ppRenderShiftClosingsPP();
        return;
    }
    if(!collection || !uid){
        ppShiftSetCloudStatusPP("⚠️ Firebase indisponible", "warning");
        ppRenderShiftClosingsPP();
        return;
    }

    // Never keep another account's cached shifts visible on a shared device.
    ppShiftClosingsPP = [];
    ppShiftSaveLocalPP();
    ppRenderShiftClosingsPP();
    ppShiftSetCloudStatusPP("Synchronisation…", "warning");

    const query = ppIsAdmin() ? collection : collection.where("employeeUid", "==", uid);
    const unsubscribe = query.onSnapshot(snapshot => {
        ppShiftClosingsPP = snapshot.docs.map(doc => ppNormalizeShiftClosingPP({id:doc.id, ...doc.data()}));
        ppShiftSaveLocalPP();
        ppShiftCloudMessagePP = "✅ Synchronisé";
        ppShiftCloudKindPP = "success";
        ppRenderShiftClosingsPP();
    }, error => {
        console.error("Clôtures Shift Firebase", error);
        ppShiftSetCloudStatusPP("⚠️ Synchronisation impossible", "danger");
    });

    ppShiftUnsubscribePP = unsubscribe;
    if(Array.isArray(ppCloudListeners)) ppCloudListeners.push(unsubscribe);
}

async function ppRestoreShiftClosingsFromBackupPP(items){
    if(!ppIsAdmin()) throw new Error("Restauration des clôtures réservée à l'administrateur.");
    const collection = ppShiftCollectionPP();
    if(!collection) throw new Error("Firebase n'est pas prêt.");
    const current = await collection.get();
    const operations = [];
    current.forEach(doc => operations.push({type:"delete", ref:doc.ref}));
    (Array.isArray(items) ? items : []).forEach(raw => {
        const record = ppNormalizeShiftClosingPP(raw);
        if(record.id && record.date) operations.push({type:"set", ref:collection.doc(record.id), record});
    });
    for(let offset = 0; offset < operations.length; offset += 400){
        const batch = ppDb.batch();
        operations.slice(offset, offset + 400).forEach(operation => {
            if(operation.type === "delete") batch.delete(operation.ref);
            else batch.set(operation.ref, operation.record);
        });
        await batch.commit();
    }
}

function ppShiftExportRowsPP(){
    return ppShiftVisibleRowsPP().slice();
}

const ppShiftUpdatePageTitleBase = updatePageTitle;
updatePageTitle = function(page){
    if(page === "shift"){
        setText("pageTitle", "Clôture Shift");
        setText("pageSubtitle", "Recette, TPE, dépenses et reste en espèces");
        setTimeout(ppRenderShiftClosingsPP, 0);
        return;
    }
    return ppShiftUpdatePageTitleBase(page);
};

const ppShiftStartCloudListenersBase = ppStartCloudListeners;
ppStartCloudListeners = function(){
    const result = ppShiftStartCloudListenersBase.apply(this, arguments);
    setTimeout(ppStartShiftClosingCloudPP, 0);
    return result;
};

document.addEventListener("click", event => {
    const nav = event.target.closest?.('[data-page="shift"]');
    if(nav) setTimeout(ppRenderShiftClosingsPP, 0);
});

document.addEventListener("DOMContentLoaded", () => {
    ensureShiftClosingModulePP();
    ppRenderShiftClosingsPP();
});
