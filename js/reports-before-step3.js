/* =========================================================
   PAUSE & PLATE MANAGER — RAPPORTS
   ÉTAPE 1 : SYNTHÈSE DE GESTION
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
                <h2>📈 Synthèse de gestion</h2>
                <p>Les indicateurs essentiels de Pause & Plate sur une seule vue.</p>
              </div>
              <button type="button" class="btn" onclick="ppRenderReportsSummaryPP()">↻ Actualiser</button>
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

            <div id="ppReportSummaryCards" class="pp-report-grid"></div>

            <div class="pp-report-note">
              <strong>ℹ️ Lecture du Food Cost :</strong> il est calculé de façon théorique à partir des ventes rattachées aux fiches techniques et des lignes de stock directement affectées. Il deviendra encore plus précis quand le futur POS sera connecté en temps réel.
            </div>
          </div>`;
    }
    return page;
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
