/* =========================================================
   PAUSE & PLATE — DATABASE V2 PANEL MOUNT
   UI mount only. Business / migration logic remains in app.js.
========================================================= */
(function(){
    "use strict";

    let ppDbV2MountTimerPP = null;
    let ppDbV2MountObserverPP = null;

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

        // The exports page itself is admin-only. We mount the UI without waiting
        // for the asynchronous profile role; app.js keeps the action guards.
        if(!panel.querySelector("[data-db-v2-action]") && typeof window.ppDbV2RenderPanelPP === "function"){
            try{ window.ppDbV2RenderPanelPP(); }catch(err){ console.warn("Database v2 render",err); }
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
            if(relevant) ppDbV2MountSchedulePP(30);
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
