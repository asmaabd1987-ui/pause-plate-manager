/* Pause & Plate — Database v2 panel final mount hook.
   Loaded after all application modules so late renderers cannot hide the panel. */
(function(){
  "use strict";

  let mountTimer = null;
  let bodyObserver = null;
  let authUnsub = null;

  function ppDbV2FinalIsAdmin(){
    try{
      if(typeof window.ppIsAdmin === "function" && window.ppIsAdmin()) return true;
    }catch(_){}
    try{
      const user = window.firebase?.auth?.().currentUser;
      const adminEmail = String(window.PP_ADMIN_EMAIL || "asmaabd1987@gmail.com").toLowerCase();
      return !!user && String(user.email || "").toLowerCase() === adminEmail;
    }catch(_){
      return false;
    }
  }

  function ppDbV2FinalDirectChild(page,node){
    if(!page || !node) return null;
    let current = node;
    while(current && current.parentElement && current.parentElement !== page){
      current = current.parentElement;
    }
    return current && current.parentElement === page ? current : null;
  }

  function ppDbV2FinalAnchor(page){
    if(!page) return null;
    const headings = Array.from(page.querySelectorAll("h1,h2,h3,h4,h5"));
    const heading = headings.find(node =>
      String(node.textContent || "")
        .replace(/\s+/g," ")
        .trim()
        .toLowerCase() === "contenu de la base actuelle"
    );
    if(!heading) return null;
    const section = heading.closest(".section") || heading.parentElement || heading;
    return ppDbV2FinalDirectChild(page,section) || ppDbV2FinalDirectChild(page,heading);
  }

  function ppDbV2FinalMount(){
    if(!ppDbV2FinalIsAdmin()) return false;
    if(typeof window.ppDbV2RenderPanelPP !== "function") return false;

    const page = document.getElementById("exportsPage");
    if(!page) return false;

    let panel = document.getElementById("ppDbV2Panel");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "ppDbV2Panel";
    }

    const anchor = ppDbV2FinalAnchor(page);
    if(anchor){
      if(panel.parentElement !== page || panel.nextElementSibling !== anchor){
        page.insertBefore(panel,anchor);
      }
    }else if(panel.parentElement !== page){
      page.appendChild(panel);
    }

    window.ppDbV2RenderPanelPP();
    panel.dataset.ppDbV2FinalMounted = "1";
    return true;
  }

  function ppDbV2FinalSchedule(delay){
    clearTimeout(mountTimer);
    mountTimer = setTimeout(()=>{
      try{ ppDbV2FinalMount(); }catch(err){ console.warn("Database v2 panel mount",err); }
    }, Number(delay || 0));
  }

  function ppDbV2FinalWatch(){
    if(!document.body || bodyObserver) return;
    bodyObserver = new MutationObserver(mutations=>{
      const relevant = mutations.some(mutation =>
        mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)
      );
      if(relevant) ppDbV2FinalSchedule(40);
    });
    bodyObserver.observe(document.body,{childList:true,subtree:true});
  }

  function ppDbV2FinalBindAuth(){
    try{
      if(authUnsub || !window.firebase?.auth) return;
      authUnsub = window.firebase.auth().onAuthStateChanged(()=>{
        ppDbV2FinalSchedule(0);
        ppDbV2FinalSchedule(250);
      });
    }catch(_){ }
  }

  document.addEventListener("click",event=>{
    const nav = event.target?.closest?.('[data-page="exports"]');
    if(nav) ppDbV2FinalSchedule(0);
  },true);

  function start(){
    ppDbV2FinalWatch();
    ppDbV2FinalBindAuth();
    ppDbV2FinalSchedule(0);
    setTimeout(()=>ppDbV2FinalMount(),250);
    setTimeout(()=>ppDbV2FinalMount(),1000);
    setTimeout(()=>ppDbV2FinalMount(),2500);
  }

  window.ppDbV2ForceMountPP = ppDbV2FinalMount;

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
