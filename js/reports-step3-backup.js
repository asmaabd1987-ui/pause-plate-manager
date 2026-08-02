/* =========================================================
   PAUSE & PLATE MANAGER — RAPPORTS
   ÉTAPES 1 + 2 + 3 : SYNTHÈSE + RENTABILITÉ + ANALYSE DES VENTES
   Module séparé pour ne pas toucher au cœur de app.js.
========================================================= */

let ppReportPeriodPP = "month";
let ppReportCustomFromPP = "";
let ppReportCustomToPP = "";

function ppReportPad2PP(n){
    return String(n).padStart(2,"0");
}

function ppReportISODatePP(date){
    const d = new Date(date);
    if(Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${ppReportPad2PP(d.getMonth()+1)}-${ppReportPad2PP(d.getDate())}`;
}

function ppReportDateFromAnyPP(value){
    const raw = String(value || "").trim();
    if(!raw) return "";
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if(iso) return iso[1];
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "" : ppReportISODatePP(d);
}

function ppReportLocalTodayPP(){
    return ppReportISODatePP(new Date());
}

function ppReportDateObjPP(iso){
    const parts = String(iso || "").split("-").map(Number);
    if(parts.length !== 3 || !parts.every(Number.isFinite)) return null;
    return new Date(parts[0],parts[1]-1,parts[2],12,0,0,0);
}

function ppReportAddDaysPP(iso,days){
    const d = ppReportDateObjPP(iso);
    if(!d) return "";
    d.setDate(d.getDate()+Number(days||0));
    return ppReportISODatePP(d);
}

function ppReportDaysBetweenPP(from,to){
    const a = ppReportDateObjPP(from), b = ppReportDateObjPP(to);
    if(!a || !b) return 0;
    return Math.round((b-a)/86400000);
}

function ppReportCurrentRangePP(period=ppReportPeriodPP){
    const todayISO = ppReportLocalTodayPP();
    const today = ppReportDateObjPP(todayISO);
    const year = today.getFullYear();
    const month = today.getMonth();

    if(period === "today"){
        return {from:todayISO,to:todayISO,label:"Aujourd’hui"};
    }

    if(period === "week"){
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1-day;
        const start = new Date(today); start.setDate(today.getDate()+diff);
        const end = new Date(start); end.setDate(start.getDate()+6);
        return {from:ppReportISODatePP(start),to:ppReportISODatePP(end),label:"Cette semaine"};
    }

    if(period === "quarter"){
        const qStartMonth = Math.floor(month/3)*3;
        const start = new Date(year,qStartMonth,1,12);
        const end = new Date(year,qStartMonth+3,0,12);
        return {from:ppReportISODatePP(start),to:ppReportISODatePP(end),label:`T${Math.floor(month/3)+1} ${year}`};
    }

    if(period === "year"){
        return {from:`${year}-01-01`,to:`${year}-12-31`,label:String(year)};
    }

    if(period === "custom"){
        let from = ppReportCustomFromPP || `${year}-${ppReportPad2PP(month+1)}-01`;
        let to = ppReportCustomToPP || todayISO;
        if(from > to) [from,to] = [to,from];
        return {from,to,label:"Période personnalisée"};
    }

    const start = new Date(year,month,1,12);
    const end = new Date(year,month+1,0,12);
    return {from:ppReportISODatePP(start),to:ppReportISODatePP(end),label:"Ce mois"};
}

function ppReportPreviousRangePP(range){
    const span = Math.max(ppReportDaysBetweenPP(range.from,range.to),0);
    const to = ppReportAddDaysPP(range.from,-1);
    const from = ppReportAddDaysPP(to,-span);
    return {from,to,label:"Période précédente"};
}

function ppReportInRangePP(value,range){
    const d = ppReportDateFromAnyPP(value);
    return !!d && d >= range.from && d <= range.to;
}

function ppReportMoneyPP(value){
    if(typeof formatMoney === "function") return formatMoney(Number(value||0));
    return Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" DH";
}

function ppReportNumberPP(value,digits=1){
    return Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:digits,maximumFractionDigits:digits});
}

function ppReportDateLabelPP(iso){
    const d = ppReportDateObjPP(iso);
    return d ? new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(d) : "-";
}

function ppReportInvoiceTTCPP(inv){
    const explicit = Number(inv?.totalTTC);
    if(Number.isFinite(explicit) && explicit !== 0) return explicit;
    return (Array.isArray(inv?.lines)?inv.lines:[]).reduce((sum,line)=>{
        const qty = Number(line?.quantity||0);
        const price = Number(line?.price||0);
        const ht = Number(line?.totalHT ?? (qty*price) ?? 0);
        const rate = Number(line?.vatRate||0);
        const vat = Number(line?.vatAmount ?? (ht*rate/100) ?? 0);
        const ttc = Number(line?.totalTTC ?? (ht+vat) ?? 0);
        return sum + (Number.isFinite(ttc)?ttc:0);
    },0);
}

function ppReportExpenseTTCPP(expense){
    return Number(expense?.totalTTC ?? expense?.amount ?? 0) || 0;
}

function ppReportExpenseHTPP(expense){
    const explicit = Number(expense?.totalHT);
    if(Number.isFinite(explicit) && explicit >= 0) return explicit;
    const ttc = ppReportExpenseTTCPP(expense);
    const rate = Number(expense?.vatRate||0);
    return rate>0 ? ttc/(1+rate/100) : ttc;
}

function ppReportSalesRowsPP(range){
    let rows=[];
    try{
        if(typeof getTVACollecteeRowsPP === "function"){
            rows = getTVACollecteeRowsPP();
        }
    }catch(_){ rows=[]; }

    if(!Array.isArray(rows) || !rows.length){
        rows = (Array.isArray(salesPP)?salesPP:[]).map(s=>{
            const ttc=Number(s.totalTTC||0);
            const ht=Number(s.reportHT||0) || ttc/1.10;
            return {date:s.date,ttc,ht,vat:Math.max(ttc-ht,0)};
        });
    }

    return rows.filter(r=>ppReportInRangePP(r.date,range));
}

function ppReportMaterialCostPP(range){
    let total=0;

    (Array.isArray(salesPP)?salesPP:[])
        .filter(s=>ppReportInRangePP(s.date,range))
        .forEach(sale=>{
            (Array.isArray(sale.items)?sale.items:[]).forEach(item=>{
                const recipe=(Array.isArray(recipesPP)?recipesPP:[]).find(r=>Number(r.id)===Number(item.recipeId));
                if(!recipe)return;
                const portions=Math.max(Number(recipe.portions||1),1);
                const recipeCost = typeof recipeTotalsPP === "function"
                    ? Number(recipeTotalsPP(recipe).cost||0)
                    : (Array.isArray(recipe.ingredients)?recipe.ingredients:[]).reduce((sum,ing)=>{
                        const p=(Array.isArray(products)?products:[]).find(x=>Number(x.id)===Number(ing.productId));
                        return sum + Number(ing.quantity||0)*Number(p?.price ?? ing.unitPrice ?? 0);
                    },0);
                total += (recipeCost/portions)*Number(item.quantity||0);
            });
        });

    // Les lignes de vente affectées directement à un article de stock ne sont
    // pas dans sale.items : on les ajoute depuis le scan journalier sans
    // recompter les lignes déjà liées à une fiche technique.
    (Array.isArray(dailySalesScansPP)?dailySalesScansPP:[])
        .filter(scan=>ppReportInRangePP(scan.date,range))
        .forEach(scan=>{
            (Array.isArray(scan.items)?scan.items:[]).forEach(item=>{
                if(item.recipeId || !item.stockProductId)return;
                const p=(Array.isArray(products)?products:[]).find(x=>Number(x.id)===Number(item.stockProductId));
                if(p) total += Number(p.price||0)*Number(item.quantity||0);
            });
        });

    return total;
}

function ppReportMetricsPP(range){
    const saleRows=ppReportSalesRowsPP(range);
    const caTTC=saleRows.reduce((sum,r)=>sum+Number(r.ttc||0),0);
    const caHT=saleRows.reduce((sum,r)=>sum+Number(r.ht ?? (Number(r.ttc||0)/1.10) ?? 0),0);

    const purchases=(Array.isArray(invoices)?invoices:[])
        .filter(inv=>ppReportInRangePP(inv.date,range))
        .reduce((sum,inv)=>sum+ppReportInvoiceTTCPP(inv),0);

    const expenseRows=(Array.isArray(expensesPP)?expensesPP:[])
        .filter(e=>ppReportInRangePP(e.date,range));
    const expensesTTC=expenseRows.reduce((sum,e)=>sum+ppReportExpenseTTCPP(e),0);
    const expensesHT=expenseRows.reduce((sum,e)=>sum+ppReportExpenseHTPP(e),0);

    const materialCost=ppReportMaterialCostPP(range);
    const grossMargin=caHT-materialCost;
    const estimatedResult=grossMargin-expensesHT;
    const foodCost=caHT>0 ? materialCost/caHT*100 : 0;

    const stockValue=(Array.isArray(products)?products:[])
        .reduce((sum,p)=>sum+Number(p.stock||0)*Number(p.price||0),0);

    return {caTTC,caHT,purchases,expensesTTC,expensesHT,materialCost,grossMargin,estimatedResult,foodCost,stockValue};
}

function ppReportTrendPP(current,previous,{inverse=false,points=false}={}){
    current=Number(current||0); previous=Number(previous||0);

    if(points){
        const diff=current-previous;
        if(Math.abs(diff)<0.05) return `<span class="pp-report-trend neutral">→ Stable vs période précédente</span>`;
        const good=inverse?diff<0:diff>0;
        return `<span class="pp-report-trend ${good?'good':'bad'}">${diff>0?'↑':'↓'} ${diff>0?'+':''}${ppReportNumberPP(diff,1)} pt vs période précédente</span>`;
    }

    if(Math.abs(previous)<0.000001){
        if(Math.abs(current)<0.000001) return `<span class="pp-report-trend neutral">→ Stable vs période précédente</span>`;
        return `<span class="pp-report-trend neutral">• Nouvelle valeur sur la période</span>`;
    }

    const pct=(current-previous)/Math.abs(previous)*100;
    if(Math.abs(pct)<0.05) return `<span class="pp-report-trend neutral">→ Stable vs période précédente</span>`;
    const good=inverse?pct<0:pct>0;
    return `<span class="pp-report-trend ${good?'good':'bad'}">${pct>0?'↑':'↓'} ${pct>0?'+':''}${ppReportNumberPP(pct,1)}% vs période précédente</span>`;
}

function ppReportCardPP({label,value,trend,icon,tone="green",sub=""}){
    return `<article class="pp-report-card ${tone}">
        <div class="pp-report-card-top"><span class="pp-report-card-label">${label}</span><span class="pp-report-card-icon">${icon}</span></div>
        <strong class="pp-report-card-value">${value}</strong>
        ${sub?`<div class="pp-report-card-sub">${sub}</div>`:""}
        ${trend||""}
    </article>`;
}

function ppEnsureReportsStylesPP(){
    if(document.getElementById("ppReportsStep1Styles"))return;
    const style=document.createElement("style");
    style.id="ppReportsStep1Styles";
    style.textContent=`
      #reportsPage .pp-report-shell{display:flex;flex-direction:column;gap:18px}
      #reportsPage .pp-report-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
      #reportsPage .pp-report-head h2{margin:0 0 5px;font-size:25px;color:#18251b}
      #reportsPage .pp-report-head p{margin:0;color:#667085}
      #reportsPage .pp-report-filter-box{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:14px;box-shadow:0 5px 18px rgba(0,0,0,.04)}
      #reportsPage .pp-report-periods{display:flex;flex-wrap:wrap;gap:8px}
      #reportsPage .pp-report-period-btn{border:1px solid #d6ddd8;background:#fff;color:#34413a;border-radius:10px;padding:9px 13px;font-weight:700;cursor:pointer}
      #reportsPage .pp-report-period-btn:hover{border-color:#094B2D}
      #reportsPage .pp-report-period-btn.active{background:#094B2D;color:#fff;border-color:#094B2D}
      #reportsPage .pp-report-custom{display:grid;grid-template-columns:repeat(2,minmax(160px,220px));gap:10px;margin-top:12px}
      #reportsPage .pp-report-custom label{font-size:12px;color:#667085;font-weight:700;display:block;margin-bottom:5px}
      #reportsPage .pp-report-custom input{width:100%;border:1px solid #d6ddd8;border-radius:9px;padding:9px 10px;background:#fff}
      #reportsPage .pp-report-range{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #eef0ef;color:#58645e;font-size:13px}
      #reportsPage .pp-report-grid{display:grid;grid-template-columns:repeat(4,minmax(185px,1fr));gap:13px}
      #reportsPage .pp-report-card{position:relative;background:#fff;border:1px solid #e7ebe8;border-radius:17px;padding:17px;min-height:145px;box-shadow:0 6px 20px rgba(0,0,0,.045);overflow:hidden}
      #reportsPage .pp-report-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#094B2D}
      #reportsPage .pp-report-card.gold:before{background:#D9A51E}
      #reportsPage .pp-report-card.red:before{background:#b94d4d}
      #reportsPage .pp-report-card.blue:before{background:#4772a8}
      #reportsPage .pp-report-card.neutral:before{background:#7d8781}
      #reportsPage .pp-report-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #reportsPage .pp-report-card-label{font-size:13px;color:#667085;font-weight:800;text-transform:uppercase;letter-spacing:.025em}
      #reportsPage .pp-report-card-icon{font-size:22px}
      #reportsPage .pp-report-card-value{display:block;font-size:25px;line-height:1.15;margin:14px 0 5px;color:#18251b}
      #reportsPage .pp-report-card-sub{font-size:12px;color:#7b857f;margin-bottom:8px}
      #reportsPage .pp-report-trend{display:inline-block;font-size:12px;font-weight:800;margin-top:8px}
      #reportsPage .pp-report-trend.good{color:#147a48}
      #reportsPage .pp-report-trend.bad{color:#b13b3b}
      #reportsPage .pp-report-trend.neutral{color:#737d77}
      #reportsPage .pp-report-note{background:#f8faf8;border:1px solid #dde7e0;border-radius:14px;padding:13px 15px;color:#536058;font-size:13px;line-height:1.5}
      #reportsPage .pp-report-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0 2px;border-bottom:1px solid #e3e8e4}
      #reportsPage .pp-report-tab{border:1px solid #dce4de;background:#fff;color:#415048;border-radius:10px;padding:9px 14px;font-weight:800;cursor:pointer}
      #reportsPage .pp-report-tab.active{background:#094B2D;color:#fff;border-color:#094B2D}
      #reportsPage .pp-report-panel{display:none}
      #reportsPage .pp-report-panel.active{display:block}
      #reportsPage .pp-profit-grid{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:12px}
      #reportsPage .pp-profit-box{background:#fff;border:1px solid #e2e8e3;border-radius:15px;padding:15px}
      #reportsPage .pp-profit-box small{display:block;color:#778179;font-weight:700;font-size:11px;text-transform:uppercase}
      #reportsPage .pp-profit-box strong{display:block;margin-top:6px;font-size:21px;color:#18251b}
      #reportsPage .pp-profit-section{background:#fff;border:1px solid #e2e8e3;border-radius:16px;padding:16px}
      #reportsPage .pp-profit-section h3{margin:0 0 5px;color:#18251b}
      #reportsPage .pp-profit-section p{margin:0 0 14px;color:#6f7b73;font-size:13px}
      #reportsPage .pp-profit-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
      #reportsPage .pp-profit-flow>div{background:#f8faf8;border:1px solid #e5ebe7;border-radius:12px;padding:12px;text-align:center}
      #reportsPage .pp-profit-flow small{display:block;color:#6f7b73;font-weight:700}
      #reportsPage .pp-profit-flow strong{display:block;margin-top:4px;font-size:17px}
      #reportsPage .pp-profit-table-wrap{overflow:auto}
      #reportsPage .pp-profit-table{width:100%;min-width:900px;border-collapse:collapse}
      #reportsPage .pp-profit-table th,#reportsPage .pp-profit-table td{padding:10px 9px;border-bottom:1px solid #edf1ee;text-align:left;font-size:12px;white-space:nowrap}
      #reportsPage .pp-profit-table th{background:#fafbfa;color:#68736c;text-transform:uppercase;font-size:10px}
      #reportsPage .pp-profit-table .num{text-align:right}
      #reportsPage .pp-profit-badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800}
      #reportsPage .pp-profit-badge.good{background:#eaf7ef;color:#177348}
      #reportsPage .pp-profit-badge.warn{background:#fff4d7;color:#896400}
      #reportsPage .pp-profit-badge.bad{background:#fdebec;color:#a83339}
      #reportsPage .pp-profit-empty{text-align:center;color:#7d8781;padding:18px 8px}
      #reportsPage .pp-sales-grid{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:12px}
      #reportsPage .pp-sales-box{background:#fff;border:1px solid #e2e8e3;border-radius:15px;padding:15px}
      #reportsPage .pp-sales-box small{display:block;color:#778179;font-weight:700;font-size:11px;text-transform:uppercase}
      #reportsPage .pp-sales-box strong{display:block;margin-top:6px;font-size:21px;color:#18251b}
      #reportsPage .pp-sales-section{background:#fff;border:1px solid #e2e8e3;border-radius:16px;padding:16px}
      #reportsPage .pp-sales-section h3{margin:0 0 5px;color:#18251b}
      #reportsPage .pp-sales-section p{margin:0 0 14px;color:#6f7b73;font-size:13px}
      #reportsPage .pp-sales-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,.8fr);gap:14px}
      #reportsPage .pp-sales-table-wrap{overflow:auto}
      #reportsPage .pp-sales-table{width:100%;min-width:760px;border-collapse:collapse}
      #reportsPage .pp-sales-table th,#reportsPage .pp-sales-table td{padding:10px 9px;border-bottom:1px solid #edf1ee;text-align:left;font-size:12px;white-space:nowrap}
      #reportsPage .pp-sales-table th{background:#fafbfa;color:#68736c;text-transform:uppercase;font-size:10px}
      #reportsPage .pp-sales-table .num{text-align:right}
      #reportsPage .pp-sales-ranking{display:flex;flex-direction:column;gap:8px}
      #reportsPage .pp-sales-rank{display:grid;grid-template-columns:30px 1fr auto;gap:9px;align-items:center;border:1px solid #e6ebe7;border-radius:12px;padding:10px;background:#fbfcfb}
      #reportsPage .pp-sales-rank .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#edf5ef;color:#094B2D;font-weight:900}
      #reportsPage .pp-sales-rank strong{font-size:13px;color:#18251b}
      #reportsPage .pp-sales-rank small{display:block;color:#79837d;margin-top:2px}
      #reportsPage .pp-sales-rank .v{font-weight:900;color:#094B2D;text-align:right}
      #reportsPage .pp-sales-bars{display:flex;flex-direction:column;gap:9px}
      #reportsPage .pp-sales-bar-row{display:grid;grid-template-columns:110px 1fr 120px;gap:10px;align-items:center}
      #reportsPage .pp-sales-bar-label{font-size:12px;font-weight:800;color:#4f5b54}
      #reportsPage .pp-sales-bar-track{height:10px;background:#eef1ef;border-radius:999px;overflow:hidden}
      #reportsPage .pp-sales-bar-fill{height:100%;background:#094B2D;border-radius:999px}
      #reportsPage .pp-sales-bar-value{text-align:right;font-size:12px;font-weight:800;color:#18251b}
      #reportsPage .pp-sales-empty{text-align:center;color:#7d8781;padding:18px 8px}
      @media(max-width:950px){#reportsPage .pp-sales-grid{grid-template-columns:repeat(2,1fr)}#reportsPage .pp-sales-layout{grid-template-columns:1fr}}
      @media(max-width:600px){#reportsPage .pp-sales-grid{grid-template-columns:1fr}#reportsPage .pp-sales-bar-row{grid-template-columns:85px 1fr 90px}}
      @media(max-width:950px){#reportsPage .pp-profit-grid,#reportsPage .pp-profit-flow{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:600px){#reportsPage .pp-profit-grid,#reportsPage .pp-profit-flow{grid-template-columns:1fr}}

      @media(max-width:1200px){#reportsPage .pp-report-grid{grid-template-columns:repeat(2,minmax(185px,1fr))}}
      @media(max-width:650px){#reportsPage .pp-report-grid{grid-template-columns:1fr}#reportsPage .pp-report-custom{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
}

function ppEnsureReportsSummaryUIPP(){
    const page=document.getElementById("reportsPage");
    if(!page)return null;
    ppEnsureReportsStylesPP();

    if(!document.getElementById("ppReportsSummaryStep1")){
        page.innerHTML=`
          <div id="ppReportsSummaryStep1" class="pp-report-shell">
            <div class="pp-report-head">
              <div>
                <h2>📈 Rapports</h2>
                <p>Suivez la synthèse de gestion et la rentabilité sur la même période.</p>
              </div>
              <button type="button" class="btn" onclick="ppRenderReportsSummaryPP()">↻ Actualiser</button>
            </div>

            <div class="pp-report-tabs">
              <button type="button" class="pp-report-tab active" data-pp-report-tab="summary" onclick="ppSetReportsTabPP('summary')">📊 Synthèse</button>
              <button type="button" class="pp-report-tab" data-pp-report-tab="profitability" onclick="ppSetReportsTabPP('profitability')">💹 Rentabilité</button>
              <button type="button" class="pp-report-tab" data-pp-report-tab="sales" onclick="ppSetReportsTabPP('sales')">💰 Analyse des ventes</button>
            </div>

            <div class="pp-report-filter-box">
              <div class="pp-report-periods">
                <button class="pp-report-period-btn" data-pp-period="today" onclick="ppSetReportPeriodPP('today')">Aujourd’hui</button>
                <button class="pp-report-period-btn" data-pp-period="week" onclick="ppSetReportPeriodPP('week')">Semaine</button>
                <button class="pp-report-period-btn" data-pp-period="month" onclick="ppSetReportPeriodPP('month')">Mois</button>
                <button class="pp-report-period-btn" data-pp-period="quarter" onclick="ppSetReportPeriodPP('quarter')">Trimestre</button>
                <button class="pp-report-period-btn" data-pp-period="year" onclick="ppSetReportPeriodPP('year')">Année</button>
                <button class="pp-report-period-btn" data-pp-period="custom" onclick="ppSetReportPeriodPP('custom')">Personnalisé</button>
              </div>
              <div id="ppReportCustomDates" class="pp-report-custom" style="display:none">
                <div><label>Du</label><input id="ppReportFrom" type="date" onchange="ppUpdateCustomReportDatesPP()"></div>
                <div><label>Au</label><input id="ppReportTo" type="date" onchange="ppUpdateCustomReportDatesPP()"></div>
              </div>
              <div class="pp-report-range">
                <strong id="ppReportCurrentRangeLabel">—</strong>
                <span id="ppReportPreviousRangeLabel">Comparaison : —</span>
              </div>
            </div>

            <section id="ppReportSummaryPanel" class="pp-report-panel active">
              <div id="ppReportSummaryCards" class="pp-report-grid"></div>
              <div class="pp-report-note">
                <strong>ℹ️ Lecture du Food Cost :</strong> il est calculé de façon théorique à partir des ventes rattachées aux fiches techniques et des lignes de stock directement affectées. Il deviendra encore plus précis quand le futur POS sera connecté en temps réel.
              </div>
            </section>

            <section id="ppReportProfitabilityPanel" class="pp-report-panel">
              <div id="ppProfitabilityKPIs" class="pp-profit-grid"></div>

              <div class="pp-profit-section">
                <h3>🧮 Construction du résultat</h3>
                <p>Lecture simple de la rentabilité sur la période sélectionnée.</p>
                <div id="ppProfitabilityFlow" class="pp-profit-flow"></div>
              </div>

              <div class="pp-profit-section">
                <h3>🍽️ Rentabilité des plats vendus</h3>
                <p>Classement des fiches techniques réellement vendues selon la marge générée.</p>
                <div id="ppProfitabilityRecipes"></div>
              </div>
            </section>

            <section id="ppReportSalesPanel" class="pp-report-panel">
              <div id="ppSalesAnalysisKPIs" class="pp-sales-grid"></div>

              <div class="pp-sales-layout">
                <div class="pp-sales-section">
                  <h3>📈 Évolution du chiffre d’affaires</h3>
                  <p>CA TTC sur la période sélectionnée.</p>
                  <div id="ppSalesEvolution" class="pp-sales-bars"></div>
                </div>

                <div class="pp-sales-section">
                  <h3>💳 Modes de paiement</h3>
                  <p>Répartition du chiffre d’affaires encaissé.</p>
                  <div id="ppSalesPayments" class="pp-sales-ranking"></div>
                </div>
              </div>

              <div class="pp-sales-layout">
                <div class="pp-sales-section">
                  <h3>🏆 Plats les plus vendus</h3>
                  <p>Classement par quantité vendue.</p>
                  <div id="ppSalesTopRecipes"></div>
                </div>

                <div class="pp-sales-section">
                  <h3>🧾 Sources de ventes</h3>
                  <p>Origine des ventes enregistrées dans le Manager.</p>
                  <div id="ppSalesSources" class="pp-sales-ranking"></div>
                </div>
              </div>
            </section>

          </div>`;
    }
    return page;
}


function ppSetReportsTabPP(tab){
    const selected = ["summary","profitability","sales"].includes(tab) ? tab : "summary";
    document.querySelectorAll("#reportsPage [data-pp-report-tab]").forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.ppReportTab===selected);
    });
    document.getElementById("ppReportSummaryPanel")?.classList.toggle("active",selected==="summary");
    document.getElementById("ppReportProfitabilityPanel")?.classList.toggle("active",selected==="profitability");
    document.getElementById("ppReportSalesPanel")?.classList.toggle("active",selected==="sales");

    if(selected==="profitability"){
        try{ ppRenderProfitabilityPP(); }catch(err){ console.error("Rapports Rentabilité",err); }
    }
    if(selected==="sales"){
        try{ ppRenderSalesAnalysisPP(); }catch(err){ console.error("Rapports Analyse des ventes",err); }
    }
}


function ppProfitabilityRecipeRowsPP(range){
    const map=new Map();

    (Array.isArray(salesPP)?salesPP:[])
      .filter(s=>ppReportInRangePP(s.date,range))
      .forEach(sale=>{
        (Array.isArray(sale.items)?sale.items:[]).forEach(item=>{
            const recipe=(Array.isArray(recipesPP)?recipesPP:[])
              .find(r=>Number(r.id)===Number(item.recipeId));
            if(!recipe)return;

            const qty=Number(item.quantity||0);
            if(!(qty>0))return;

            const portions=Math.max(Number(recipe.portions||1),1);
            const recipeCost=typeof recipeTotalsPP==="function"
              ? Number(recipeTotalsPP(recipe).cost||0)
              : (Array.isArray(recipe.ingredients)?recipe.ingredients:[]).reduce((sum,ing)=>{
                    const p=(Array.isArray(products)?products:[])
                      .find(x=>Number(x.id)===Number(ing.productId));
                    return sum+Number(ing.quantity||0)*Number(p?.price ?? ing.unitPrice ?? 0);
                },0);

            const unitCost=recipeCost/portions;
            const unitSale=Number(recipe.salePrice||0);
            const key=String(recipe.id);

            if(!map.has(key)){
                map.set(key,{
                    id:recipe.id,
                    name:String(recipe.name||"Fiche technique"),
                    category:String(recipe.category||"-"),
                    qty:0,
                    caTTC:0,
                    cost:0,
                    margin:0
                });
            }

            const row=map.get(key);
            row.qty+=qty;
            row.caTTC+=unitSale*qty;
            row.cost+=unitCost*qty;
            row.margin+=(unitSale-unitCost)*qty;
        });
      });

    return [...map.values()]
      .map(r=>({
          ...r,
          foodCost:r.caTTC>0?r.cost/r.caTTC*100:0,
          marginRate:r.caTTC>0?r.margin/r.caTTC*100:0
      }))
      .sort((a,b)=>b.margin-a.margin);
}

function ppProfitabilityStatusPP(foodCost){
    const pct=Number(foodCost||0);
    if(pct<=30)return {cls:"good",label:"Très bon"};
    if(pct<=35)return {cls:"warn",label:"À suivre"};
    return {cls:"bad",label:"À corriger"};
}

function ppProfitabilityBoxPP(label,value,sub=""){
    return `<div class="pp-profit-box"><small>${label}</small><strong>${value}</strong>${sub?`<div style="margin-top:5px;color:#79837d;font-size:11px">${sub}</div>`:""}</div>`;
}

function ppRenderProfitabilityPP(){
    const panel=document.getElementById("ppReportProfitabilityPanel");
    if(!panel)return;

    const range=ppReportCurrentRangePP();
    const current=ppReportMetricsPP(range);

    const marginRate=current.caHT>0?current.grossMargin/current.caHT*100:0;
    const resultRate=current.caHT>0?current.estimatedResult/current.caHT*100:0;

    const kpis=document.getElementById("ppProfitabilityKPIs");
    if(kpis){
        kpis.innerHTML=[
            ppProfitabilityBoxPP("Taux de marge brute",`${ppReportNumberPP(marginRate,1)}%`,"Marge brute / CA HT"),
            ppProfitabilityBoxPP("Résultat estimé",ppReportMoneyPP(current.estimatedResult),`${ppReportNumberPP(resultRate,1)}% du CA HT`),
            ppProfitabilityBoxPP("Coût matière",ppReportMoneyPP(current.materialCost),`Food Cost ${ppReportNumberPP(current.foodCost,1)}%`),
            ppProfitabilityBoxPP("Dépenses HT",ppReportMoneyPP(current.expensesHT),"Charges de la période")
        ].join("");
    }

    const flow=document.getElementById("ppProfitabilityFlow");
    if(flow){
        flow.innerHTML=[
            ["CA HT",current.caHT],
            ["− Coût matière",current.materialCost],
            ["= Marge brute",current.grossMargin],
            ["− Dépenses → Résultat",current.estimatedResult]
        ].map(([label,value])=>`<div><small>${label}</small><strong>${ppReportMoneyPP(value)}</strong></div>`).join("");
    }

    const box=document.getElementById("ppProfitabilityRecipes");
    if(!box)return;

    const rows=ppProfitabilityRecipeRowsPP(range);
    if(!rows.length){
        box.innerHTML='<div class="pp-profit-empty">Aucune vente liée à une fiche technique sur cette période.</div>';
        return;
    }

    box.innerHTML=`<div class="pp-profit-table-wrap">
      <table class="pp-profit-table">
        <thead>
          <tr>
            <th>Plat</th>
            <th>Catégorie</th>
            <th class="num">Qté</th>
            <th class="num">CA TTC</th>
            <th class="num">Coût matière</th>
            <th class="num">Marge générée</th>
            <th class="num">Food Cost</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r=>{
              const st=ppProfitabilityStatusPP(r.foodCost);
              const esc=typeof escapeHTML==="function"?escapeHTML:(v=>String(v));
              return `<tr>
                <td><strong>${esc(r.name)}</strong></td>
                <td>${esc(r.category)}</td>
                <td class="num">${ppReportNumberPP(r.qty,1)}</td>
                <td class="num">${ppReportMoneyPP(r.caTTC)}</td>
                <td class="num">${ppReportMoneyPP(r.cost)}</td>
                <td class="num"><strong>${ppReportMoneyPP(r.margin)}</strong></td>
                <td class="num">${ppReportNumberPP(r.foodCost,1)}%</td>
                <td><span class="pp-profit-badge ${st.cls}">${st.label}</span></td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

function ppSalesPeriodRowsPP(range){
    return (Array.isArray(salesPP)?salesPP:[])
      .filter(s=>ppReportInRangePP(s.date,range));
}

function ppSalesTotalQtyPP(sales){
    return sales.reduce((sum,sale)=>{
        return sum+(Array.isArray(sale.items)?sale.items:[])
          .reduce((a,item)=>a+Number(item.quantity||0),0);
    },0);
}

function ppSalesRecipeRowsPP(sales){
    const map=new Map();

    sales.forEach(sale=>{
        (Array.isArray(sale.items)?sale.items:[]).forEach(item=>{
            const recipe=(Array.isArray(recipesPP)?recipesPP:[])
              .find(r=>Number(r.id)===Number(item.recipeId));
            if(!recipe)return;

            const qty=Number(item.quantity||0);
            if(!(qty>0))return;

            const key=String(recipe.id);
            if(!map.has(key)){
                map.set(key,{
                    id:recipe.id,
                    name:String(recipe.name||"Fiche technique"),
                    category:String(recipe.category||"-"),
                    qty:0,
                    caTTC:0
                });
            }
            const row=map.get(key);
            row.qty+=qty;
            row.caTTC+=Number(recipe.salePrice||0)*qty;
        });
    });

    return [...map.values()].sort((a,b)=>b.qty-a.qty || b.caTTC-a.caTTC);
}

function ppSalesPaymentRowsPP(sales){
    const map=new Map();

    sales.forEach(sale=>{
        const payments=Array.isArray(sale.reportPayments)?sale.reportPayments:[];
        if(payments.length){
            payments.forEach(p=>{
                const label=String(p.mode||p.name||p.label||"Autre").trim()||"Autre";
                const amount=Number(p.amount||p.total||p.value||0);
                if(amount>0)map.set(label,(map.get(label)||0)+amount);
            });
            return;
        }

        const label=String(sale.mode||"Non précisé").trim()||"Non précisé";
        const amount=Number(sale.totalTTC||0);
        if(amount>0)map.set(label,(map.get(label)||0)+amount);
    });

    return [...map.entries()]
      .map(([label,amount])=>({label,amount}))
      .sort((a,b)=>b.amount-a.amount);
}

function ppSalesSourceRowsPP(sales){
    const map=new Map();
    sales.forEach(s=>{
        let label="Vente manuelle";
        if(s.source==="daily-scan")label="Rapport / scan journalier";
        else if(s.source)label=String(s.source);
        map.set(label,(map.get(label)||0)+1);
    });
    return [...map.entries()]
      .map(([label,count])=>({label,count}))
      .sort((a,b)=>b.count-a.count);
}

function ppSalesBucketsPP(range){
    const days=Math.max(ppReportDaysBetweenPP(range.from,range.to)+1,1);
    const buckets=[];

    if(days<=35){
        let d=range.from;
        while(d<=range.to){
            buckets.push({from:d,to:d,label:ppReportDateLabelPP(d).replace(/\s+\d{4}$/,"")});
            d=ppReportAddDaysPP(d,1);
        }
        return buckets;
    }

    if(days<=130){
        let start=range.from, i=1;
        while(start<=range.to){
            const endCandidate=ppReportAddDaysPP(start,6);
            const end=endCandidate>range.to?range.to:endCandidate;
            buckets.push({from:start,to:end,label:`S${i}`});
            start=ppReportAddDaysPP(end,1);
            i++;
        }
        return buckets;
    }

    const fromObj=ppReportDateObjPP(range.from);
    const toObj=ppReportDateObjPP(range.to);
    if(!fromObj||!toObj)return [];

    let y=fromObj.getFullYear(),m=fromObj.getMonth();
    const endY=toObj.getFullYear(),endM=toObj.getMonth();

    while(y<endY || (y===endY && m<=endM)){
        const monthStart=ppReportISODatePP(new Date(y,m,1,12));
        const monthEnd=ppReportISODatePP(new Date(y,m+1,0,12));
        const from=monthStart<range.from?range.from:monthStart;
        const to=monthEnd>range.to?range.to:monthEnd;
        const label=new Intl.DateTimeFormat("fr-FR",{month:"short"}).format(new Date(y,m,1,12));
        buckets.push({from,to,label});
        m++;
        if(m>11){m=0;y++;}
    }
    return buckets;
}

function ppSalesBoxPP(label,value,sub=""){
    return `<div class="pp-sales-box">
      <small>${label}</small>
      <strong>${value}</strong>
      ${sub?`<div style="margin-top:5px;color:#79837d;font-size:11px">${sub}</div>`:""}
    </div>`;
}

function ppRenderSalesAnalysisPP(){
    const panel=document.getElementById("ppReportSalesPanel");
    if(!panel)return;

    const range=ppReportCurrentRangePP();
    const sales=ppSalesPeriodRowsPP(range);
    const caTTC=sales.reduce((a,s)=>a+Number(s.totalTTC||0),0);
    const qty=ppSalesTotalQtyPP(sales);
    const ticket=sales.length?caTTC/sales.length:0;
    const recipes=ppSalesRecipeRowsPP(sales);
    const topRecipe=recipes[0]||null;

    const kpis=document.getElementById("ppSalesAnalysisKPIs");
    if(kpis){
        kpis.innerHTML=[
            ppSalesBoxPP("Chiffre d’affaires TTC",ppReportMoneyPP(caTTC),`${sales.length} vente(s)`),
            ppSalesBoxPP("Ticket moyen",ppReportMoneyPP(ticket),"CA TTC / nombre de ventes"),
            ppSalesBoxPP("Quantité vendue",ppReportNumberPP(qty,1),"Articles / plats enregistrés"),
            ppSalesBoxPP("Meilleure vente",topRecipe?topRecipe.name:"—",topRecipe?`${ppReportNumberPP(topRecipe.qty,1)} vendu(s)`:"Aucune vente")
        ].join("");
    }

    const evolution=document.getElementById("ppSalesEvolution");
    if(evolution){
        const values=ppSalesBucketsPP(range).map(b=>{
            const amount=ppSalesPeriodRowsPP(b).reduce((a,s)=>a+Number(s.totalTTC||0),0);
            return {...b,amount};
        });
        const max=Math.max(...values.map(v=>v.amount),1);

        evolution.innerHTML=values.length
          ? values.map(v=>`
              <div class="pp-sales-bar-row">
                <div class="pp-sales-bar-label">${v.label}</div>
                <div class="pp-sales-bar-track"><div class="pp-sales-bar-fill" style="width:${Math.min(v.amount/max*100,100)}%"></div></div>
                <div class="pp-sales-bar-value">${ppReportMoneyPP(v.amount)}</div>
              </div>
            `).join("")
          : '<div class="pp-sales-empty">Aucune donnée disponible.</div>';
    }

    const payments=document.getElementById("ppSalesPayments");
    if(payments){
        const rows=ppSalesPaymentRowsPP(sales);
        payments.innerHTML=rows.length
          ? rows.map((r,i)=>`
              <div class="pp-sales-rank">
                <div class="n">${i+1}</div>
                <div><strong>${typeof escapeHTML==="function"?escapeHTML(r.label):r.label}</strong><small>Mode de paiement</small></div>
                <div class="v">${ppReportMoneyPP(r.amount)}</div>
              </div>
            `).join("")
          : '<div class="pp-sales-empty">Aucun encaissement sur la période.</div>';
    }

    const top=document.getElementById("ppSalesTopRecipes");
    if(top){
        top.innerHTML=recipes.length
          ? `<div class="pp-sales-table-wrap">
              <table class="pp-sales-table">
                <thead><tr><th>#</th><th>Plat</th><th>Catégorie</th><th class="num">Qté</th><th class="num">CA TTC</th></tr></thead>
                <tbody>
                  ${recipes.slice(0,15).map((r,i)=>`
                    <tr>
                      <td>${i+1}</td>
                      <td><strong>${typeof escapeHTML==="function"?escapeHTML(r.name):r.name}</strong></td>
                      <td>${typeof escapeHTML==="function"?escapeHTML(r.category):r.category}</td>
                      <td class="num">${ppReportNumberPP(r.qty,1)}</td>
                      <td class="num">${ppReportMoneyPP(r.caTTC)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`
          : '<div class="pp-sales-empty">Aucun plat vendu sur cette période.</div>';
    }

    const sources=document.getElementById("ppSalesSources");
    if(sources){
        const rows=ppSalesSourceRowsPP(sales);
        sources.innerHTML=rows.length
          ? rows.map((r,i)=>`
              <div class="pp-sales-rank">
                <div class="n">${i+1}</div>
                <div><strong>${typeof escapeHTML==="function"?escapeHTML(r.label):r.label}</strong><small>Origine des ventes</small></div>
                <div class="v">${r.count}</div>
              </div>
            `).join("")
          : '<div class="pp-sales-empty">Aucune source de vente sur la période.</div>';
    }
}

function ppSetReportPeriodPP(period){
    ppReportPeriodPP=period;
    const custom=document.getElementById("ppReportCustomDates");
    if(custom)custom.style.display=period==="custom"?"grid":"none";
    ppRenderReportsSummaryPP();
}

function ppUpdateCustomReportDatesPP(){
    ppReportCustomFromPP=String(document.getElementById("ppReportFrom")?.value||"");
    ppReportCustomToPP=String(document.getElementById("ppReportTo")?.value||"");
    ppReportPeriodPP="custom";
    ppRenderReportsSummaryPP();
}

function ppRenderReportsSummaryPP(){
    if(!ppEnsureReportsSummaryUIPP())return;

    const range=ppReportCurrentRangePP();
    const previousRange=ppReportPreviousRangePP(range);
    const current=ppReportMetricsPP(range);
    const previous=ppReportMetricsPP(previousRange);

    document.querySelectorAll("#reportsPage [data-pp-period]").forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.ppPeriod===ppReportPeriodPP);
    });

    const custom=document.getElementById("ppReportCustomDates");
    if(custom)custom.style.display=ppReportPeriodPP==="custom"?"grid":"none";
    const fromInput=document.getElementById("ppReportFrom"),toInput=document.getElementById("ppReportTo");
    if(fromInput && !fromInput.value)fromInput.value=range.from;
    if(toInput && !toInput.value)toInput.value=range.to;

    const currentLabel=document.getElementById("ppReportCurrentRangeLabel");
    if(currentLabel)currentLabel.textContent=`${range.label} : ${ppReportDateLabelPP(range.from)} → ${ppReportDateLabelPP(range.to)}`;
    const previousLabel=document.getElementById("ppReportPreviousRangeLabel");
    if(previousLabel)previousLabel.textContent=`Comparaison : ${ppReportDateLabelPP(previousRange.from)} → ${ppReportDateLabelPP(previousRange.to)}`;

    const cards=document.getElementById("ppReportSummaryCards");
    if(!cards)return;

    cards.innerHTML=[
        ppReportCardPP({label:"CA TTC",value:ppReportMoneyPP(current.caTTC),icon:"💰",tone:"green",trend:ppReportTrendPP(current.caTTC,previous.caTTC)}),
        ppReportCardPP({label:"CA HT",value:ppReportMoneyPP(current.caHT),icon:"🧾",tone:"neutral",trend:ppReportTrendPP(current.caHT,previous.caHT)}),
        ppReportCardPP({label:"Achats TTC",value:ppReportMoneyPP(current.purchases),icon:"🛒",tone:"gold",trend:ppReportTrendPP(current.purchases,previous.purchases,{inverse:true})}),
        ppReportCardPP({label:"Dépenses TTC",value:ppReportMoneyPP(current.expensesTTC),icon:"💸",tone:"red",trend:ppReportTrendPP(current.expensesTTC,previous.expensesTTC,{inverse:true})}),
        ppReportCardPP({label:"Marge brute",value:ppReportMoneyPP(current.grossMargin),icon:"📊",tone:current.grossMargin>=0?"green":"red",sub:`Coût matière : ${ppReportMoneyPP(current.materialCost)}`,trend:ppReportTrendPP(current.grossMargin,previous.grossMargin)}),
        ppReportCardPP({label:"Résultat estimé",value:ppReportMoneyPP(current.estimatedResult),icon:"🎯",tone:current.estimatedResult>=0?"green":"red",sub:"Marge brute − dépenses HT",trend:ppReportTrendPP(current.estimatedResult,previous.estimatedResult)}),
        ppReportCardPP({label:"Food Cost th.",value:`${ppReportNumberPP(current.foodCost,1)}%`,icon:"🍽️",tone:current.foodCost<=30?"green":current.foodCost<=35?"gold":"red",sub:"Coût matière / CA HT",trend:ppReportTrendPP(current.foodCost,previous.foodCost,{inverse:true,points:true})}),
        ppReportCardPP({label:"Valeur du stock",value:ppReportMoneyPP(current.stockValue),icon:"📦",tone:"blue",sub:"Valorisation du stock actuel",trend:`<span class="pp-report-trend neutral">• Stock au prix moyen actuel</span>`})
    ].join("");


    try{ ppRenderProfitabilityPP(); }catch(err){ console.error("Rapports Rentabilité",err); }
    try{ ppRenderSalesAnalysisPP(); }catch(err){ console.error("Rapports Analyse des ventes",err); }
}

// Intégration douce avec le rendu existant du Manager.
if(typeof renderAll === "function"){
    const ppReportsStep1RenderAllBase = renderAll;
    renderAll = function(){
        const result = ppReportsStep1RenderAllBase.apply(this,arguments);
        try{ppRenderReportsSummaryPP();}catch(err){console.error("Rapports Étape 1",err);}
        return result;
    };
}

document.addEventListener("click",function(event){
    const nav=event.target.closest?.('[data-page="reports"]');
    if(nav)setTimeout(()=>{try{ppRenderReportsSummaryPP();}catch(err){console.error(err);}},0);
});

document.addEventListener("DOMContentLoaded",function(){
    setTimeout(()=>{try{ppRenderReportsSummaryPP();}catch(err){console.error(err);}},200);
});

setTimeout(()=>{try{ppRenderReportsSummaryPP();}catch(err){console.error(err);}},1800);
