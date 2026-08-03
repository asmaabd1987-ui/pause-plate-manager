/* =========================================================
   PAUSE & PLATE — PAGINATION GLOBALE
   Maximum 15 lignes / éléments par page dans toute l'app.
========================================================= */

(function(){
    "use strict";

    const PP_PAGE_SIZE = 15;
    let ppPaginationScheduled = false;

    const PP_LIST_PAGINATION = [
        {selector:"#stockPageAlerts", item:".stock-alert-card"},
        {selector:"#alertList", item:"div"},
        {selector:"#ppSalesEvolution", item:".pp-sales-bar-row"},
        {selector:"#ppSalesPayments", item:".pp-sales-rank"},
        {selector:"#ppSalesSources", item:".pp-sales-rank"},
        {selector:"#ppStockTopConsumption", item:".pp-stock-rank"},
        {selector:"#ppPurchasePriceAlerts", item:".pp-buy-alert"},
        {selector:"#ppPurchaseSupplierRanking", item:".pp-buy-rank"},
        {selector:"#ppPurchaseTopIncreases", item:".pp-buy-rank"}
    ];

    function ppPageTokens(totalPages,currentPage){
        if(totalPages<=7){
            return Array.from({length:totalPages},(_,index)=>index+1);
        }

        const keep=new Set([1,totalPages,currentPage-2,currentPage-1,currentPage,currentPage+1,currentPage+2]);
        const pages=[...keep].filter(page=>page>=1&&page<=totalPages).sort((a,b)=>a-b);
        const tokens=[];

        pages.forEach((page,index)=>{
            if(index && page-pages[index-1]>1)tokens.push("ellipsis");
            tokens.push(page);
        });

        return tokens;
    }

    function ppPaginationAnchorForTable(table){
        const parent=table.parentElement;
        if(!parent)return table;

        const className=String(parent.className||"");
        const inlineOverflow=String(parent.style?.overflow||"");
        if(
            parent.classList.contains("table-wrapper") ||
            className.includes("table-wrap") ||
            inlineOverflow==="auto" ||
            inlineOverflow==="scroll"
        )return parent;

        return table;
    }

    function ppRemovePagination(target){
        const control=target?._ppPaginationControl;
        if(control?.isConnected)control.remove();
        if(target)target._ppPaginationControl=null;
    }

    function ppCreatePaginationControl(target,anchor){
        let control=target._ppPaginationControl;
        if(control?.isConnected)return control;

        control=document.createElement("nav");
        control.className="pp-pagination";
        control.setAttribute("aria-label","Navigation des pages");
        control._ppPaginationTarget=target;
        anchor.insertAdjacentElement("afterend",control);
        target._ppPaginationControl=control;
        return control;
    }

    function ppRenderPaginationTarget(target,items,anchor){
        const count=items.length;
        const totalPages=Math.ceil(count/PP_PAGE_SIZE);

        if(totalPages<=1){
            items.forEach(item=>item.classList.remove("pp-pagination-hidden"));
            target._ppPaginationPage=1;
            ppRemovePagination(target);
            return;
        }

        let currentPage=Number(target._ppPaginationPage||1);
        currentPage=Math.max(1,Math.min(currentPage,totalPages));
        target._ppPaginationPage=currentPage;

        const firstIndex=(currentPage-1)*PP_PAGE_SIZE;
        const lastIndex=Math.min(firstIndex+PP_PAGE_SIZE,count);
        items.forEach((item,index)=>{
            item.classList.toggle("pp-pagination-hidden",index<firstIndex||index>=lastIndex);
        });

        const control=ppCreatePaginationControl(target,anchor);
        const signature=`${count}|${currentPage}|${totalPages}`;
        if(control.dataset.signature===signature)return;
        control.dataset.signature=signature;

        const pageButtons=ppPageTokens(totalPages,currentPage).map(token=>{
            if(token==="ellipsis")return '<span class="pp-pagination-ellipsis">…</span>';
            return `<button type="button" data-pp-page="${token}" class="${token===currentPage?'active':''}" aria-label="Page ${token}" ${token===currentPage?'aria-current="page"':''}>${token}</button>`;
        }).join("");

        control.innerHTML=`
            <span class="pp-pagination-info">Lignes ${firstIndex+1}–${lastIndex} sur ${count} · Page ${currentPage}/${totalPages}</span>
            <span class="pp-pagination-pages">
                <button type="button" data-pp-page="${currentPage-1}" ${currentPage===1?'disabled':''}>‹ Précédent</button>
                ${pageButtons}
                <button type="button" data-pp-page="${currentPage+1}" ${currentPage===totalPages?'disabled':''}>Suivant ›</button>
            </span>`;
    }

    function ppApplyTablePagination(tbody){
        if(!tbody?.isConnected)return;
        if(tbody.closest("form")||tbody.closest("[data-pp-no-pagination]")){
            ppRemovePagination(tbody);
            return;
        }

        const table=tbody.closest("table");
        if(!table)return;
        const items=[...tbody.children].filter(row=>row.tagName==="TR");
        tbody._ppPaginationKind="table";
        tbody._ppPaginationItems=()=>[...tbody.children].filter(row=>row.tagName==="TR");
        tbody._ppPaginationAnchor=ppPaginationAnchorForTable(table);
        ppRenderPaginationTarget(tbody,items,tbody._ppPaginationAnchor);
    }

    function ppListItems(container,itemSelector){
        return [...container.children].filter(item=>item.matches(itemSelector));
    }

    function ppApplyListPagination(container,itemSelector){
        if(!container?.isConnected)return;
        const items=ppListItems(container,itemSelector);
        container._ppPaginationKind="list";
        container._ppPaginationItemSelector=itemSelector;
        container._ppPaginationItems=()=>ppListItems(container,itemSelector);
        container._ppPaginationAnchor=container;
        ppRenderPaginationTarget(container,items,container);
    }

    function ppApplyGlobalPagination(){
        document.querySelectorAll("table tbody").forEach(ppApplyTablePagination);
        PP_LIST_PAGINATION.forEach(config=>{
            document.querySelectorAll(config.selector).forEach(container=>{
                ppApplyListPagination(container,config.item);
            });
        });
    }

    function ppScheduleGlobalPagination(){
        if(ppPaginationScheduled)return;
        ppPaginationScheduled=true;
        const run=()=>{
            ppPaginationScheduled=false;
            ppApplyGlobalPagination();
        };
        if(typeof requestAnimationFrame==="function")requestAnimationFrame(run);
        else setTimeout(run,0);
    }

    function ppResetPaginationForMutation(mutation){
        const target=mutation.target;
        const tbody=target?.nodeType===1
          ? (target.tagName==="TBODY"?target:target.closest?.("tbody"))
          : target?.parentElement?.closest?.("tbody");
        if(tbody && !tbody.closest("form"))tbody._ppPaginationPage=1;

        PP_LIST_PAGINATION.forEach(config=>{
            document.querySelectorAll(config.selector).forEach(container=>{
                if(target===container)container._ppPaginationPage=1;
            });
        });
    }

    document.addEventListener("click",function(event){
        const button=event.target.closest?.(".pp-pagination button[data-pp-page]");
        if(!button||button.disabled)return;
        const control=button.closest(".pp-pagination");
        const target=control?._ppPaginationTarget;
        if(!target?.isConnected)return;

        target._ppPaginationPage=Math.max(1,Number(button.dataset.ppPage||1));
        const items=typeof target._ppPaginationItems==="function"?target._ppPaginationItems():[];
        ppRenderPaginationTarget(target,items,target._ppPaginationAnchor||target);

        const scrollTarget=target.closest?.(".section,.pp-report-panel,.modal")||target._ppPaginationAnchor||target;
        if(typeof scrollTarget?.scrollIntoView==="function"){
            try{scrollTarget.scrollIntoView({behavior:"smooth",block:"start"});}
            catch(_){scrollTarget.scrollIntoView();}
        }
    });

    const observer=new MutationObserver(mutations=>{
        mutations.forEach(ppResetPaginationForMutation);
        ppScheduleGlobalPagination();
    });

    function ppStartGlobalPagination(){
        if(document.body)observer.observe(document.body,{childList:true,subtree:true});
        ppApplyGlobalPagination();
    }

    window.ppApplyGlobalPagination=ppApplyGlobalPagination;
    window.ppPaginationPageSize=PP_PAGE_SIZE;

    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ppStartGlobalPagination);
    else ppStartGlobalPagination();
})();
