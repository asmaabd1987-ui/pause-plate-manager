/* =========================================================
   PAUSE & PLATE — DATABASE V2 PANEL DIRECT RENDER (v25)
   UI only. The panel renders here directly so visibility does
   not depend on admin-profile timing or ppDbV2RenderPanelPP().
   Business / migration guards remain in app.js.
========================================================= */
(function(){
    "use strict";

    let ppDbV2MountTimerPP = null;
    let ppDbV2MountObserverPP = null;

    function ppDbV2MountEscapePP(value){
        return String(value ?? "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;")
            .replace(/'/g,"&#039;");
    }

    function ppDbV2MountFindAnchorPP(page){
        if(!page) return null;
        const headings = Array.from(page.querySelectorAll("h1,h2,h3,h4,h5"));
        const heading = headings.find(node =>
            String(node.textContent || "")
                .replace(/\s+/g," ")
                .trim()
                .toLowerCase() === "contenu de la base actuelle"
        );
        return heading ? (heading.closest(".section") || heading.parentElement || heading) : null;
    }

    function ppDbV2MountSchemaPP(){
        try{
            if(typeof ppDbSchemaVersionPP !== "undefined"){
                return Math.max(Number(ppDbSchemaVersionPP || 1),1);
            }
        }catch(_){}
        return 1;
    }

    function ppDbV2MountProductsCountPP(){
        try{return (typeof products !== "undefined" && Array.isArray(products)) ? products.length : 0;}catch(_){return 0;}
    }

    function ppDbV2MountMovementsCountPP(){
        try{return (typeof movements !== "undefined" && Array.isArray(movements)) ? movements.length : 0;}catch(_){return 0;}
    }

    function ppDbV2MountRenderDirectPP(panel){
        if(!panel) return;
        const schema = ppDbV2MountSchemaPP();
        const productsCount = ppDbV2MountProductsCountPP();
        const movementsCount = ppDbV2MountMovementsCountPP();
        const action = schema < 2
            ? `<button class="btn primary" type="button" data-db-v2-action onclick="ppDbV2MigrateProductsMovementsPP()">Migrer Products &amp; Movements</button>`
            : `<button class="btn danger" type="button" data-db-v2-action onclick="ppDbV2RollbackToLegacyPP()">Retour v1</button>`;

        panel.innerHTML = `
          <div class="section" style="margin-top:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <h3 style="margin:0">Base de données</h3>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="button" data-db-v2-action onclick="ppDbV2DownloadBackupPP()">Backup JSON</button>
                <button class="btn" type="button" data-db-v2-action onclick="ppDbV2VerifyPP()">Vérifier</button>
                ${action}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-top:12px">
              <div class="stat-card" style="min-height:auto;padding:12px"><div class="label">Schéma</div><div class="value">v${ppDbV2MountEscapePP(schema)}</div></div>
              <div class="stat-card" style="min-height:auto;padding:12px"><div class="label">Produits</div><div class="value">${ppDbV2MountEscapePP(productsCount)}</div></div>
              <div class="stat-card" style="min-height:auto;padding:12px"><div class="label">Mouvements</div><div class="value">${ppDbV2MountEscapePP(movementsCount)}</div></div>
              <div class="stat-card" style="min-height:auto;padding:12px"><div class="label">Intégrité</div><div class="value">—</div></div>
            </div>
            <div id="ppDbV2Status" style="margin-top:8px;font-size:13px;color:#667085"></div>
          </div>`;
        panel.dataset.ppDbV2DirectReady = "1";
    }

    function ppDbV2MountPanelPP(){
        const page = document.getElementById("exportsPage");
        if(!page) return false;

        let panel = document.getElementById("ppDbV2Panel");
        if(!panel){
            panel = document.createElement("div");
            panel.id = "ppDbV2Panel";
        }

        const anchor = ppDbV2MountFindAnchorPP(page);
        if(anchor && anchor.parentNode){
            if(panel.parentNode !== anchor.parentNode || panel.nextSibling !== anchor){
                anchor.parentNode.insertBefore(panel, anchor);
            }
        }else if(panel.parentNode !== page){
            page.appendChild(panel);
        }

        // Critical v25 fix: render the visible controls directly here.
        // Do NOT wait for ppIsAdmin()/profile timing just to display the panel.
        if(panel.dataset.ppDbV2DirectReady !== "1" || !panel.querySelector("[data-db-v2-action]")){
            ppDbV2MountRenderDirectPP(panel);
        }
        return panel.parentNode !== null;
    }

    function ppDbV2MountSchedulePP(delay=0){
        clearTimeout(ppDbV2MountTimerPP);
        ppDbV2MountTimerPP = setTimeout(()=>{
            try{ ppDbV2MountPanelPP(); }catch(err){ console.warn("Database v2 mount",err); }
        },delay);
    }

    function ppDbV2MountStartObserverPP(){
        if(ppDbV2MountObserverPP || !document.body) return;
        ppDbV2MountObserverPP = new MutationObserver(mutations=>{
            const relevant = mutations.some(m=>m.type === "childList" && (m.addedNodes.length || m.removedNodes.length));
            if(relevant) ppDbV2MountSchedulePP(40);
        });
        ppDbV2MountObserverPP.observe(document.body,{childList:true,subtree:true});
    }

    document.addEventListener("click",event=>{
        if(event.target?.closest?.('[data-page="exports"]')){
            ppDbV2MountSchedulePP(0);
            setTimeout(ppDbV2MountPanelPP,120);
            setTimeout(ppDbV2MountPanelPP,500);
        }
    },true);

    function ppDbV2MountStartPP(){
        ppDbV2MountStartObserverPP();
        ppDbV2MountSchedulePP(0);
        [150,500,1200,3000,7000,15000].forEach(delay=>setTimeout(ppDbV2MountPanelPP,delay));
    }

    window.ppDbV2ForceMountPP = ppDbV2MountPanelPP;

    if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded",ppDbV2MountStartPP,{once:true});
    }else{
        ppDbV2MountStartPP();
    }
})();
