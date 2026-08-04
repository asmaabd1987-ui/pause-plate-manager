/* =========================================================
   PAUSE & PLATE — PROFESSIONAL RESPONSIVE UI
   Presentation only: business logic and Firebase stay untouched.
========================================================= */

(function(){
    "use strict";

    const PP_DECORATIVE_ICON_RE=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    let ppModernCleanupFrame=0;

    function ppTextWithoutDecorativeIcons(value){
        return String(value||"")
            .replace(PP_DECORATIVE_ICON_RE,"")
            .replace(/[\uFE0F\u200D]/g,"")
            .replace(/\s{2,}/g," ")
            .trim();
    }

    function ppCleanElementIcons(element){
        if(!element || element.nodeType!==1)return;
        const readable=ppTextWithoutDecorativeIcons(element.textContent);
        // Keep symbols on icon-only row actions; they remain useful and compact.
        if(readable.length<2)return;

        [...element.childNodes].forEach(node=>{
            if(node.nodeType!==Node.TEXT_NODE)return;
            const cleaned=String(node.nodeValue||"")
                .replace(PP_DECORATIVE_ICON_RE,"")
                .replace(/[\uFE0F\u200D]/g,"");
            if(cleaned!==node.nodeValue)node.nodeValue=cleaned;
        });
    }

    function ppCleanModernSurface(root=document){
        const scope=root?.querySelectorAll ? root : document;
        const selectors=[
            ".nav-item",
            ".page-actions h2",
            ".section-header h2",
            ".section-header h3",
            ".section > h2",
            ".section > h3",
            ".modal-header h2",
            ".pp-shift-toolbar h2",
            ".pp-shift-history-head h3",
            ".pp-cash-toolbar h2",
            ".pp-acc-toolbar h2",
            ".pp-acc-card span",
            ".pp-acc-journal-title h3",
            ".pp-report-head h2",
            ".pp-report-tab",
            ".pp-report-note strong",
            ".pp-profit-section h3",
            ".pp-sales-section h3",
            ".pp-stock-section h3",
            ".pp-buy-section h3",
            ".pp-expense-section h3",
            ".pp-export-card h3",
            ".btn:not(.small)"
        ].join(",");

        if(root?.matches?.(selectors))ppCleanElementIcons(root);
        scope.querySelectorAll(selectors).forEach(ppCleanElementIcons);

        const inputs=[];
        if(root?.matches?.("input[placeholder],textarea[placeholder]"))inputs.push(root);
        scope.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(input=>inputs.push(input));
        inputs.forEach(input=>{
            const cleaned=ppTextWithoutDecorativeIcons(input.placeholder);
            if(cleaned && cleaned!==input.placeholder)input.placeholder=cleaned;
        });
    }

    function ppScheduleModernCleanup(root=document){
        if(ppModernCleanupFrame)cancelAnimationFrame(ppModernCleanupFrame);
        ppModernCleanupFrame=requestAnimationFrame(()=>{
            ppModernCleanupFrame=0;
            ppCleanModernSurface(root);
        });
    }

    function ppSetMenuOpen(open){
        const sidebar=document.querySelector(".sidebar");
        const backdrop=document.getElementById("ppSidebarBackdrop");
        const toggle=document.getElementById("ppMobileMenuToggle");
        const shouldOpen=Boolean(open) && window.matchMedia("(max-width:900px)").matches;

        sidebar?.classList.toggle("is-open",shouldOpen);
        backdrop?.classList.toggle("is-open",shouldOpen);
        document.body.classList.toggle("pp-modern-menu-open",shouldOpen);
        toggle?.setAttribute("aria-expanded",shouldOpen?"true":"false");
    }

    function ppInstallModernNavigation(){
        const header=document.querySelector(".header");
        const sidebar=document.querySelector(".sidebar");
        if(!header || !sidebar)return;

        if(!document.getElementById("ppMobileMenuToggle")){
            const button=document.createElement("button");
            button.id="ppMobileMenuToggle";
            button.type="button";
            button.setAttribute("aria-label","Ouvrir le menu");
            button.setAttribute("aria-expanded","false");
            button.innerHTML="<span></span><span></span><span></span>";
            button.addEventListener("click",()=>ppSetMenuOpen(!sidebar.classList.contains("is-open")));
            header.insertBefore(button,header.firstElementChild);
        }

        if(!document.getElementById("ppSidebarClose")){
            const close=document.createElement("button");
            close.id="ppSidebarClose";
            close.type="button";
            close.setAttribute("aria-label","Fermer le menu");
            close.textContent="×";
            close.addEventListener("click",()=>ppSetMenuOpen(false));
            sidebar.appendChild(close);
        }

        if(!document.getElementById("ppSidebarBackdrop")){
            const backdrop=document.createElement("div");
            backdrop.id="ppSidebarBackdrop";
            backdrop.setAttribute("aria-hidden","true");
            backdrop.addEventListener("click",()=>ppSetMenuOpen(false));
            document.body.appendChild(backdrop);
        }

        sidebar.addEventListener("click",event=>{
            if(event.target.closest(".nav-item"))ppSetMenuOpen(false);
        });

        document.addEventListener("keydown",event=>{
            if(event.key==="Escape")ppSetMenuOpen(false);
        });

        window.addEventListener("resize",()=>{
            if(!window.matchMedia("(max-width:900px)").matches)ppSetMenuOpen(false);
        },{passive:true});
    }

    function ppStartModernObserver(){
        const observer=new MutationObserver(mutations=>{
            const added=[];
            mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{
                if(node.nodeType===1)added.push(node);
            }));
            if(!added.length)return;
            ppScheduleModernCleanup(document);
        });
        observer.observe(document.body,{childList:true,subtree:true});
    }

    function ppInitModernUI(){
        document.documentElement.classList.add("pp-ui-modern");
        ppInstallModernNavigation();
        ppCleanModernSurface(document);
        ppStartModernObserver();
    }

    window.ppRefreshModernUI=()=>ppScheduleModernCleanup(document);

    if(document.readyState==="loading"){
        document.addEventListener("DOMContentLoaded",ppInitModernUI,{once:true});
    }else{
        ppInitModernUI();
    }
})();
