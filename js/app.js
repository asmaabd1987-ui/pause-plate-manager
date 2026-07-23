/* =========================================================
   PAUSE & PLATE MANAGER
   COMPLETE APP.JS
   SMART PDF + HEADER SUPPLIER + TVA SUMMARY + TOTAL FALLBACK
========================================================= */


/* =========================================================
   STORAGE KEYS
========================================================= */

const STORAGE_KEYS = {

    products:
        "pause_plate_products",

    movements:
        "pause_plate_movements",

    suppliers:
        "pause_plate_suppliers",

    invoices:
        "pause_plate_invoices"

};


/* =========================================================
   DATA
========================================================= */

let products =
    loadStorage(
        STORAGE_KEYS.products,
        []
    );


let movements =
    loadStorage(
        STORAGE_KEYS.movements,
        []
    );


let suppliers =
    loadStorage(
        STORAGE_KEYS.suppliers,
        []
    );


let invoices =
    loadStorage(
        STORAGE_KEYS.invoices,
        []
    );


let scannedInvoiceText =
    "";


let scannedInvoiceData =
    null;


let scannedPDFPages =
    [];

let editingProductId = null;
let editingSupplierId = null;
let editingMovementId = null;
let editingInvoiceId = null;


/* =========================================================
   NORMALIZE DATA
========================================================= */

products =
    products.map(function(product){

        return {

            id:
                product.id ??
                createId(),

            name:
                String(
                    product.name ??
                    ""
                ),

            category:
                product.category ??
                "Autre",

            unit:
                product.unit ??
                "pièce",

            stock:
                Number(
                    product.stock ??
                    0
                ),

            minStock:
                Number(
                    product.minStock ??
                    0
                ),

            price:
                Number(
                    product.price ??
                    0
                ),

            // Preserve the last known purchase VAT across page reloads.
            // 0% is a valid VAT rate, so we must keep a separate "known" flag.
            lastPurchaseTVA:
                Number(
                    product.lastPurchaseTVA ??
                    0
                ),

            lastPurchaseTVAKnown:
                product.lastPurchaseTVAKnown === true,

            createdAt:
                product.createdAt ??
                new Date().toISOString()

        };

    });


movements =
    movements.map(function(movement){

        return {

            ...movement,

            quantity:
                Number(
                    movement.quantity ??
                    0
                )

        };

    });


suppliers =
    suppliers.map(function(supplier){

        return {

            id:
                supplier.id ??
                createId(),

            name:
                String(
                    supplier.name ??
                    ""
                ),

            phone:
                String(
                    supplier.phone ??
                    ""
                ),

            email:
                String(
                    supplier.email ??
                    ""
                ),

            ice:
                String(
                    supplier.ice ??
                    ""
                ),

            if:
                String(
                    supplier.if ??
                    supplier.ifNumber ??
                    ""
                ),

            address:
                String(
                    supplier.address ??
                    ""
                ),

            purchases:
                Number(
                    supplier.purchases ??
                    0
                ),

            paid:
                Number(
                    supplier.paid ??
                    0
                )

        };

    });


invoices =
    invoices.map(function(invoice){

        return {

            ...invoice,

            totalHT:
                Number(
                    invoice.totalHT ??
                    0
                ),

            tva:
                Number(
                    invoice.tva ??
                    0
                ),

            totalTTC:
                Number(
                    invoice.totalTTC ??
                    0
                ),

            paid:
                Number(
                    invoice.paid ??
                    0
                ),

            due:
                Number(
                    invoice.due ??
                    0
                ),

            lines:
                Array.isArray(
                    invoice.lines
                )
                ?
                invoice.lines
                :
                []

        };

    });


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        initializeNavigation();

        initializeForms();

        ensureTVAAchatsUIPP();

        renderAll();

    }
);


/* =========================================================
   STORAGE
========================================================= */

function loadStorage(
    key,
    fallback
){

    try{

        const raw =
            localStorage.getItem(
                key
            );


        if(!raw){

            return fallback;

        }


        return JSON.parse(
            raw
        ) ?? fallback;

    }
    catch(error){

        console.error(
            error
        );

        return fallback;

    }

}


function saveData(){

    localStorage.setItem(
        STORAGE_KEYS.products,
        JSON.stringify(
            products
        )
    );


    localStorage.setItem(
        STORAGE_KEYS.movements,
        JSON.stringify(
            movements
        )
    );


    localStorage.setItem(
        STORAGE_KEYS.suppliers,
        JSON.stringify(
            suppliers
        )
    );


    localStorage.setItem(
        STORAGE_KEYS.invoices,
        JSON.stringify(
            invoices
        )
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation(){

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(function(item){

        item.addEventListener(
            "click",
            function(){

                const page =
                    item.dataset.page;


                navItems.forEach(function(nav){

                    nav.classList.remove(
                        "active"
                    );

                });


                item.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".page"
                    )
                    .forEach(function(pageElement){

                        pageElement.classList.remove(
                            "active-page"
                        );

                    });


                document
                    .getElementById(
                        page + "Page"
                    )
                    ?.classList.add(
                        "active-page"
                    );


                updatePageTitle(
                    page
                );

            }
        );

    });

}


function updatePageTitle(page){

    const titles = {

        dashboard:[
            "Dashboard",
            "Bienvenue dans votre espace de gestion"
        ],

        stock:[
            "Gestion du Stock",
            "Gérez les entrées et sorties de vos produits"
        ],

        purchases:[
            "Achats & Factures",
            "Gérez vos factures fournisseurs et vos achats"
        ],

        suppliers:[
            "Fournisseurs",
            "Suivez vos fournisseurs et leurs situations"
        ],

        clients:[
            "Clients",
            "Gérez vos clients et leurs situations"
        ],

        sales:[
            "Ventes",
            "Suivez votre chiffre d'affaires"
        ],

        expenses:[
            "Dépenses",
            "Suivez toutes vos dépenses"
        ],

        recipes:[
            "Fiches Techniques",
            "Gérez vos recettes et coûts de production"
        ],

        accounting:[
            "TVA & Comptabilité",
            "Suivez votre TVA et vos données comptables"
        ],

        reports:[
            "Rapports",
            "Analysez votre activité"
        ]

    };


    if(!titles[page]){

        return;

    }


    setText(
        "pageTitle",
        titles[page][0]
    );


    setText(
        "pageSubtitle",
        titles[page][1]
    );

}


/* =========================================================
   FORMS
========================================================= */

function initializeForms(){

    document
        .getElementById(
            "productForm"
        )
        ?.addEventListener(
            "submit",
            function(event){

                event.preventDefault();

                addProduct();

            }
        );


    document
        .getElementById(
            "movementForm"
        )
        ?.addEventListener(
            "submit",
            function(event){

                event.preventDefault();

                saveMovement();

            }
        );


    document
        .getElementById(
            "supplierForm"
        )
        ?.addEventListener(
            "submit",
            function(event){

                event.preventDefault();

                addSupplier();

            }
        );


    document
        .getElementById(
            "invoiceForm"
        )
        ?.addEventListener(
            "submit",
            function(event){

                event.preventDefault();

                saveInvoice();

            }
        );

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll(){

    renderProducts();

    renderMovements();

    renderSuppliers();

    renderInvoices();

    updateDashboard();

    updateStockStats();

    updateSupplierStats();

    updateInvoiceStats();

    renderTVAAchatsPP();

}


/* =========================================================
   PRODUCTS
========================================================= */

function openProductModal(id = null){
    editingProductId = id ? Number(id) : null;
    const form = document.getElementById("productForm");
    if(form) form.reset();
    const title = document.querySelector("#productModal .modal-header h2");
    if(editingProductId){
        const product = products.find(p => Number(p.id) === editingProductId);
        if(!product) return;
        if(title) title.textContent = "Modifier un produit";
        setValue("productName", product.name);
        setValue("productCategory", product.category);
        setValue("productUnit", product.unit);
        setValue("productStock", product.stock);
        setValue("productMinStock", product.minStock);
        setValue("productPrice", product.price);
    } else {
        if(title) title.textContent = "Ajouter un produit";
        setValue("productStock", 0);
        setValue("productMinStock", 0);
        setValue("productPrice", 0);
    }
    openModal("productModal");
}


function addProduct(){
    const name = getValue("productName").trim();
    if(!name){ alert("Veuillez saisir le nom du produit."); return; }
    const duplicate = products.find(p => normalizeText(p.name) === normalizeText(name) && Number(p.id) !== Number(editingProductId));
    if(duplicate){ alert("Ce produit existe déjà."); return; }
    const data = {
        name,
        category:getValue("productCategory") || "Autre",
        unit:getValue("productUnit") || "pièce",
        stock:parseNumber(getValue("productStock")),
        minStock:parseNumber(getValue("productMinStock")),
        price:parseNumber(getValue("productPrice"))
    };
    if(editingProductId){
        const product=products.find(p=>Number(p.id)===Number(editingProductId));
        if(!product) return;
        Object.assign(product,data);
    } else {
        products.push({id:createId(),...data,createdAt:new Date().toISOString()});
    }
    editingProductId=null;
    saveData(); closeModal("productModal"); renderAll();
}


function renderProducts(){
    const table=document.getElementById("productsTable"); if(!table) return;
    const search=normalizeText(getValue("searchInput")); const category=getValue("categoryFilter");
    const filtered=products.filter(p=>normalizeText(p.name).includes(search)&&(!category||p.category===category));
    if(!filtered.length){ table.innerHTML='<tr><td colspan="7" class="empty">Aucun produit enregistré.</td></tr>'; return; }
    table.innerHTML=filtered.map(product=>{
        const value=Number(product.stock)*Number(product.price); const low=Number(product.stock)<=Number(product.minStock);
        return `<tr><td><strong>${escapeHTML(product.name)}</strong></td><td>${escapeHTML(product.category)}</td><td>${formatNumber(product.stock)} ${escapeHTML(product.unit)}</td><td>${formatMoney(product.price)}</td><td>${formatMoney(value)}</td><td><span class="status ${low?'danger':'success'}">${low?'Stock faible':'Normal'}</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewProduct(${product.id})" title="Voir">👁️</button><button class="btn small edit" onclick="openProductModal(${product.id})" title="Modifier">✏️</button><button class="btn small print" onclick="printProduct(${product.id})" title="Imprimer">🖨️</button><button class="btn small danger" onclick="deleteProduct(${product.id})" title="Supprimer">🗑️</button></div></td></tr>`;
    }).join("");
}


function deleteProduct(id){

    if(
        !confirm(
            "Voulez-vous supprimer ce produit ?"
        )
    ){

        return;

    }


    products =
        products.filter(function(product){

            return Number(
                product.id
            )
            !==
            Number(
                id
            );

        });


    saveData();

    renderAll();

}



function viewProduct(id){
    const p=products.find(x=>Number(x.id)===Number(id)); if(!p) return;
    showDetailsModal("Produit", [["Nom",p.name],["Catégorie",p.category],["Unité",p.unit],["Stock",formatNumber(p.stock)+" "+p.unit],["Stock minimum",formatNumber(p.minStock)+" "+p.unit],["Prix moyen",formatMoney(p.price)],["Valeur",formatMoney(Number(p.stock)*Number(p.price))]], ()=>printProduct(id));
}
function printProduct(id){
    const p=products.find(x=>Number(x.id)===Number(id)); if(!p) return;
    printDocument("Fiche produit - "+p.name, `<h2>Fiche produit</h2>${detailRowsHTML([["Produit",p.name],["Catégorie",p.category],["Unité",p.unit],["Stock",formatNumber(p.stock)+" "+p.unit],["Stock minimum",formatNumber(p.minStock)+" "+p.unit],["Prix moyen",formatMoney(p.price)],["Valeur stock",formatMoney(Number(p.stock)*Number(p.price))]])}`);
}

/* =========================================================
   STOCK MOVEMENTS
========================================================= */

function openMovementModal(type, id = null){
    if(!products.length){ alert("Ajoutez d'abord un produit."); return; }
    editingMovementId=id?Number(id):null;
    const form=document.getElementById("movementForm"); if(form) form.reset();
    const select=document.getElementById("movementProduct");
    if(select) select.innerHTML='<option value="">Sélectionner un produit</option>'+products.map(p=>`<option value="${p.id}">${escapeHTML(p.name)} — ${formatNumber(p.stock)} ${escapeHTML(p.unit)}</option>`).join('');
    if(editingMovementId){
        const m=movements.find(x=>Number(x.id)===editingMovementId); if(!m) return;
        setValue("movementType",m.type); setValue("movementProduct",m.productId); setValue("movementQuantity",m.quantity); setValue("movementReason",m.reason); setValue("movementNote",m.note||"");
        setText("movementTitle","Modifier le mouvement");
    } else { setValue("movementType",type); setText("movementTitle",type==="entry"?"➕ Entrée Stock":"➖ Sortie Stock"); }
    openModal("movementModal");
}


function saveMovement(){
    const type=getValue("movementType"); const productId=Number(getValue("movementProduct")); const quantity=parseNumber(getValue("movementQuantity"));
    const product=products.find(p=>Number(p.id)===productId); if(!product){alert("Veuillez sélectionner un produit.");return;} if(quantity<=0){alert("Quantité invalide.");return;}
    if(editingMovementId){
        const old=movements.find(m=>Number(m.id)===Number(editingMovementId)); if(!old) return;
        const oldProduct=products.find(p=>Number(p.id)===Number(old.productId));
        if(oldProduct) oldProduct.stock += old.type==="entry" ? -Number(old.quantity) : Number(old.quantity);
    }
    if(type==="exit" && Number(product.stock)<quantity){ alert("Stock insuffisant."); return; }
    product.stock += type==="entry" ? quantity : -quantity;
    const record={id:editingMovementId||createId(),date:editingMovementId?(movements.find(m=>Number(m.id)===Number(editingMovementId))?.date||new Date().toISOString()):new Date().toISOString(),productId:product.id,productName:product.name,type,quantity,unit:product.unit,reason:getValue("movementReason"),note:getValue("movementNote").trim()};
    if(editingMovementId){ const i=movements.findIndex(m=>Number(m.id)===Number(editingMovementId)); movements[i]=record; } else movements.unshift(record);
    editingMovementId=null; saveData(); closeModal("movementModal"); renderAll();
}


function renderMovements(){
    const table=document.getElementById("movementsTable"); if(!table) return;
    if(!movements.length){table.innerHTML='<tr><td colspan="6" class="empty">Aucun mouvement enregistré.</td></tr>';return;}
    table.innerHTML=movements.map(m=>`<tr><td>${formatDate(m.date)}</td><td>${escapeHTML(m.productName)}</td><td><span class="status ${m.type==='entry'?'success':'danger'}">${m.type==='entry'?'Entrée':'Sortie'}</span></td><td>${formatNumber(m.quantity)} ${escapeHTML(m.unit||'')}</td><td>${escapeHTML(m.reason)}</td><td><div class="action-buttons"><button class="btn small view" onclick="viewMovement(${m.id})">👁️</button><button class="btn small edit" onclick="openMovementModal('${m.type}',${m.id})">✏️</button><button class="btn small print" onclick="printMovement(${m.id})">🖨️</button><button class="btn small danger" onclick="deleteMovement(${m.id})">🗑️</button></div></td></tr>`).join('');
}



function viewMovement(id){ const m=movements.find(x=>Number(x.id)===Number(id)); if(!m)return; showDetailsModal("Mouvement de stock",[["Date",formatDate(m.date)],["Produit",m.productName],["Type",m.type==='entry'?'Entrée':'Sortie'],["Quantité",formatNumber(m.quantity)+' '+(m.unit||'')],["Motif",m.reason],["Note",m.note||'-']],()=>printMovement(id)); }
function printMovement(id){ const m=movements.find(x=>Number(x.id)===Number(id)); if(!m)return; printDocument("Mouvement de stock",`<h2>Mouvement de stock</h2>${detailRowsHTML([["Date",formatDate(m.date)],["Produit",m.productName],["Type",m.type==='entry'?'Entrée':'Sortie'],["Quantité",formatNumber(m.quantity)+' '+(m.unit||'')],["Motif",m.reason],["Note",m.note||'-']])}`); }
function deleteMovement(id){ const m=movements.find(x=>Number(x.id)===Number(id)); if(!m)return; if(!confirm("Supprimer ce mouvement ? Le stock sera corrigé automatiquement."))return; const p=products.find(x=>Number(x.id)===Number(m.productId)); if(p) p.stock += m.type==='entry'?-Number(m.quantity):Number(m.quantity); movements=movements.filter(x=>Number(x.id)!==Number(id)); saveData();renderAll(); }

/* =========================================================
   SUPPLIERS
========================================================= */

function openSupplierModal(id = null){
    editingSupplierId=id?Number(id):null; const form=document.getElementById("supplierForm"); if(form)form.reset(); const title=document.querySelector("#supplierModal .modal-header h2");
    if(editingSupplierId){ const x=suppliers.find(s=>Number(s.id)===editingSupplierId); if(!x)return; if(title)title.textContent="Modifier un fournisseur"; setValue("supplierName",x.name);setValue("supplierPhone",x.phone);setValue("supplierEmail",x.email);setValue("supplierIce",x.ice);setValue("supplierIf",x.if);setValue("supplierAddress",x.address);setValue("supplierPurchases",x.purchases);setValue("supplierPaid",x.paid); }
    else {if(title)title.textContent="Ajouter un fournisseur";setValue("supplierPurchases",0);setValue("supplierPaid",0);} openModal("supplierModal");
}


function addSupplier(){
    const name=getValue("supplierName").trim(); if(!name){alert("Veuillez saisir le nom du fournisseur.");return;}
    const data={name,phone:getValue("supplierPhone").trim(),email:getValue("supplierEmail").trim(),ice:getValue("supplierIce").trim(),if:getValue("supplierIf").trim(),address:getValue("supplierAddress").trim(),purchases:parseNumber(getValue("supplierPurchases")),paid:parseNumber(getValue("supplierPaid"))};
    if(editingSupplierId){const x=suppliers.find(s=>Number(s.id)===editingSupplierId);if(!x)return;Object.assign(x,data);invoices.forEach(inv=>{if(Number(inv.supplierId)===editingSupplierId)inv.supplierName=name;});}
    else suppliers.push({id:createId(),...data});
    editingSupplierId=null;saveData();closeModal("supplierModal");renderAll();
}


function renderSuppliers(){
    const table=document.getElementById("suppliersTable"); if(!table)return; const search=normalizeText(getValue("supplierSearch"));
    const filtered=suppliers.filter(s=>normalizeText(s.name).includes(search)||normalizeText(s.phone).includes(search)||normalizeText(s.ice).includes(search));
    if(!filtered.length){table.innerHTML='<tr><td colspan="8" class="empty">Aucun fournisseur enregistré.</td></tr>';return;}
    table.innerHTML=filtered.map(s=>{const purchases=Number(s.purchases||0),paid=Number(s.paid||0),due=Math.max(purchases-paid,0);let cls='success',txt='Soldé';if(due>0&&paid>0){cls='warning';txt='Partiellement payé';}else if(due>0){cls='danger';txt='Non payé';}
    return `<tr><td><strong>${escapeHTML(s.name)}</strong></td><td>${escapeHTML(s.phone||'-')}</td><td>${escapeHTML(s.ice||'-')}</td><td>${formatMoney(purchases)}</td><td>${formatMoney(paid)}</td><td>${formatMoney(due)}</td><td><span class="status ${cls}">${txt}</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewSupplier(${s.id})">👁️</button><button class="btn small edit" onclick="openSupplierModal(${s.id})">✏️</button><button class="btn small print" onclick="printSupplier(${s.id})">🖨️</button><button class="btn small danger" onclick="deleteSupplier(${s.id})">🗑️</button></div></td></tr>`;}).join('');
}


function deleteSupplier(id){

    const used =
        invoices.some(function(invoice){

            return Number(
                invoice.supplierId
            )
            ===
            Number(
                id
            );

        });


    if(used){

        alert(
            "Impossible de supprimer ce fournisseur car il possède déjà des factures."
        );

        return;

    }


    if(
        !confirm(
            "Voulez-vous supprimer ce fournisseur ?"
        )
    ){

        return;

    }


    suppliers =
        suppliers.filter(function(supplier){

            return Number(
                supplier.id
            )
            !==
            Number(
                id
            );

        });


    saveData();

    renderAll();

}



function viewSupplier(id){const s=suppliers.find(x=>Number(x.id)===Number(id));if(!s)return;showDetailsModal("Fournisseur",[["Nom",s.name],["Téléphone",s.phone||'-'],["Email",s.email||'-'],["ICE",s.ice||'-'],["IF",s.if||'-'],["Adresse",s.address||'-'],["Total achats",formatMoney(s.purchases)],["Payé",formatMoney(s.paid)],["Reste",formatMoney(Math.max(Number(s.purchases)-Number(s.paid),0))]],()=>printSupplier(id));}
function printSupplier(id){const s=suppliers.find(x=>Number(x.id)===Number(id));if(!s)return;printDocument("Fiche fournisseur - "+s.name,`<h2>Fiche fournisseur</h2>${detailRowsHTML([["Nom",s.name],["Téléphone",s.phone||'-'],["Email",s.email||'-'],["ICE",s.ice||'-'],["IF",s.if||'-'],["Adresse",s.address||'-'],["Total achats",formatMoney(s.purchases)],["Payé",formatMoney(s.paid)],["Reste",formatMoney(Math.max(Number(s.purchases)-Number(s.paid),0))]])}`);}

/* =========================================================
   INVOICE MODAL
========================================================= */

function openInvoiceModal(id = null){
    editingInvoiceId=id?Number(id):null; const form=document.getElementById("invoiceForm"); if(form)form.reset(); populateInvoiceSuppliers(); const container=document.getElementById("invoiceLines");if(container)container.innerHTML=""; const title=document.querySelector("#invoiceModal .modal-header h2");
    if(editingInvoiceId){ const inv=invoices.find(x=>Number(x.id)===editingInvoiceId);if(!inv)return;if(title)title.textContent="🧾 Modifier la facture d'achat";setValue("invoiceSupplier",inv.supplierId);setValue("invoiceNumber",inv.number);setValue("invoiceDate",inv.date);setValue("invoicePaid",inv.paid);(inv.lines||[]).forEach(line=>addInvoiceLine(line));if(!(inv.lines||[]).length)addInvoiceLine(); }
    else {if(title)title.textContent="🧾 Nouvelle facture d'achat";setValue("invoiceDate",new Date().toISOString().split("T")[0]);setValue("invoicePaid",0);addInvoiceLine();}
    updateInvoiceTotals();openModal("invoiceModal");
}


function populateInvoiceSuppliers(){

    const select =
        document.getElementById(
            "invoiceSupplier"
        );


    if(!select){

        return;

    }


    select.innerHTML = `

        <option value="">
            Sélectionner un fournisseur
        </option>

        ${
            suppliers.map(function(supplier){

                return `

                    <option value="${supplier.id}">

                        ${escapeHTML(supplier.name)}

                    </option>

                `;

            }).join("")
        }

    `;

}


/* =========================================================
   INVOICE LINE
========================================================= */

function addInvoiceLine(data = {}){

    const container =
        document.getElementById(
            "invoiceLines"
        );


    if(!container){

        return;

    }


    const line =
        document.createElement(
            "div"
        );


    line.className =
        "invoice-line";

    // Keep the provenance of the VAT value so that a real 0% can be distinguished
    // from an OCR line where TVA was simply not detected.
    line.dataset.vatKnown = data.vatKnown ? "1" : "0";
    line.dataset.vatSource = data.vatSource || "";


    const selectedCategory =
        data.category ||
        "Autre";


    const selectedUnit =
        data.unit ||
        "pièce";


    const selectedVat =
        Number(
            data.vatRate ??
            0
        );


    line.innerHTML = `

        <div>

            <label>
                Produit
            </label>

            <select
                class="invoice-product"
                onchange="handleInvoiceProductChange(this)"
            >

                <option value="">
                    Nouveau produit
                </option>

                ${
                    products.map(function(product){

                        const selected =
                            data.productId
                            &&
                            Number(
                                data.productId
                            )
                            ===
                            Number(
                                product.id
                            )
                            ?
                            "selected"
                            :
                            "";


                        return `

                            <option
                                value="${product.id}"
                                ${selected}
                            >

                                ${escapeHTML(product.name)}

                            </option>

                        `;

                    }).join("")
                }

            </select>


            <input
                type="text"
                class="invoice-new-product"
                placeholder="Nom du produit"
                value="${escapeHTML(data.name || "")}"
            >

        </div>


        <div>

            <label>
                Catégorie
            </label>

            <select class="invoice-category">

                ${
                    [
                        "Épicerie",
                        "Viandes",
                        "Poissons",
                        "Produits laitiers",
                        "Fruits & Légumes",
                        "Boissons",
                        "Autre"
                    ]
                    .map(function(category){

                        return `

                            <option
                                ${
                                    category ===
                                    selectedCategory
                                    ?
                                    "selected"
                                    :
                                    ""
                                }
                            >

                                ${category}

                            </option>

                        `;

                    })
                    .join("")
                }

            </select>

        </div>


        <div>

            <label>
                Quantité
            </label>

            <input
                type="number"
                class="invoice-quantity"
                min="0.000001"
                step="0.000001"
                value="${Number(data.quantity || 1)}"
                oninput="updateInvoiceTotals()"
            >

        </div>


        <div>

            <label>
                Unité
            </label>

            <select class="invoice-unit">

                ${
                    [
                        "kg",
                        "g",
                        "L",
                        "ml",
                        "pièce",
                        "carton",
                        "paquet"
                    ]
                    .map(function(unit){

                        return `

                            <option
                                ${
                                    unit ===
                                    selectedUnit
                                    ?
                                    "selected"
                                    :
                                    ""
                                }
                            >

                                ${unit}

                            </option>

                        `;

                    })
                    .join("")
                }

            </select>

        </div>


        <div>

            <label>
                Prix unitaire HT
            </label>

            <input
                type="number"
                class="invoice-price"
                min="0"
                step="0.000001"
                value="${Number(data.price || 0)}"
                oninput="updateInvoiceTotals()"
            >

        </div>


        <div>

            <label>
                TVA
            </label>

            <select
                class="invoice-vat"
                onchange="markInvoiceVatManual(this); updateInvoiceTotals()"
            >

                ${
                    [
                        0,
                        7,
                        10,
                        14,
                        20
                    ]
                    .map(function(rate){

                        return `

                            <option
                                value="${rate}"
                                ${
                                    Number(
                                        rate
                                    )
                                    ===
                                    selectedVat
                                    ?
                                    "selected"
                                    :
                                    ""
                                }
                            >

                                ${rate}%

                            </option>

                        `;

                    })
                    .join("")
                }

            </select>

        </div>


        <div>

            <label>
                Total HT
            </label>

            <input
                type="text"
                class="invoice-line-total"
                readonly
                value="0 DH"
            >

        </div>


        <button
            type="button"
            class="btn danger small"
            onclick="removeInvoiceLine(this)"
        >
            🗑️
        </button>

    `;


    container.appendChild(
        line
    );


    updateInvoiceTotals();

}


function removeInvoiceLine(button){

    button
        .closest(
            ".invoice-line"
        )
        ?.remove();


    if(
        !document.querySelector(
            "#invoiceLines .invoice-line"
        )
    ){

        addInvoiceLine();

    }


    updateInvoiceTotals();

}


function handleInvoiceProductChange(select){

    const line =
        select.closest(
            ".invoice-line"
        );


    if(!line){

        return;

    }


    const product =
        products.find(function(item){

            return Number(
                item.id
            )
            ===
            Number(
                select.value
            );

        });


    if(!product){

        return;

    }


    line.querySelector(
        ".invoice-new-product"
    ).value =
        product.name;


    line.querySelector(
        ".invoice-category"
    ).value =
        product.category;


    line.querySelector(
        ".invoice-unit"
    ).value =
        product.unit;


    line.querySelector(
        ".invoice-price"
    ).value =
        Number(
            product.price ||
            0
        );


    updateInvoiceTotals();

}


/* =========================================================
   INVOICE TOTALS
========================================================= */

function updateInvoiceTotals(){

    let totalHT =
        0;


    let totalTVA =
        0;


    document
        .querySelectorAll(
            "#invoiceLines .invoice-line"
        )
        .forEach(function(line){

            const quantity =
                parseNumber(
                    line.querySelector(
                        ".invoice-quantity"
                    )?.value
                );


            const price =
                parseNumber(
                    line.querySelector(
                        ".invoice-price"
                    )?.value
                );


            const vatRate =
                parseNumber(
                    line.querySelector(
                        ".invoice-vat"
                    )?.value
                );


            const lineHT =
                quantity *
                price;


            const lineTVA =
                lineHT *
                vatRate /
                100;


            totalHT +=
                lineHT;


            totalTVA +=
                lineTVA;


            const totalInput =
                line.querySelector(
                    ".invoice-line-total"
                );


            if(totalInput){

                totalInput.value =
                    formatMoney(
                        lineHT
                    );

            }

        });


    const totalTTC =
        totalHT +
        totalTVA;


    const paid =
        parseNumber(
            getValue(
                "invoicePaid"
            )
        );


    setText(
        "invoiceHTPreview",
        formatMoney(
            totalHT
        )
    );


    setText(
        "invoiceTVAPreview",
        formatMoney(
            totalTVA
        )
    );


    setText(
        "invoiceTTCPreview",
        formatMoney(
            totalTTC
        )
    );


    setText(
        "invoiceDuePreview",
        formatMoney(

            Math.max(
                totalTTC -
                paid,
                0
            )

        )
    );

}


/* =========================================================
   SAVE INVOICE
========================================================= */

function saveInvoice(){
    const supplierId=Number(getValue("invoiceSupplier")); const supplier=suppliers.find(x=>Number(x.id)===supplierId); if(!supplier){alert("Veuillez sélectionner un fournisseur.");return;}
    const number=getValue("invoiceNumber").trim(); if(!number){alert("Veuillez saisir le numéro de facture.");return;}
    const lines=[]; document.querySelectorAll("#invoiceLines .invoice-line").forEach(line=>{const productId=Number(line.querySelector(".invoice-product")?.value);const existing=products.find(p=>Number(p.id)===productId);const typed=(line.querySelector(".invoice-new-product")?.value||"").trim();const name=existing?existing.name:typed;const quantity=parseNumber(line.querySelector(".invoice-quantity")?.value);const price=parseNumber(line.querySelector(".invoice-price")?.value);const vatRate=parseNumber(line.querySelector(".invoice-vat")?.value);if(!name||quantity<=0)return;const totalHT=quantity*price,vatAmount=totalHT*vatRate/100;lines.push({productId:existing?existing.id:null,name,category:line.querySelector(".invoice-category")?.value||"Autre",unit:line.querySelector(".invoice-unit")?.value||"pièce",quantity,price,vatRate,vatKnown:line.dataset.vatKnown==="1",vatSource:line.dataset.vatSource||"",vatAmount,totalHT,totalTTC:totalHT+vatAmount});});
    if(!lines.length){alert("Ajoutez au moins un produit.");return;}
    const totalHT=lines.reduce((a,l)=>a+l.totalHT,0),totalTVA=lines.reduce((a,l)=>a+l.vatAmount,0),totalTTC=totalHT+totalTVA,paid=parseNumber(getValue("invoicePaid"));
    if(editingInvoiceId){ const old=invoices.find(x=>Number(x.id)===editingInvoiceId); if(old) reverseInvoiceEffects(old); }
    const invoice={id:editingInvoiceId||createId(),number,date:getValue("invoiceDate"),supplierId:supplier.id,supplierName:supplier.name,lines,totalHT,tva:totalTVA,totalTTC,paid,due:Math.max(totalTTC-paid,0),createdAt:editingInvoiceId?(invoices.find(x=>Number(x.id)===editingInvoiceId)?.createdAt||new Date().toISOString()):new Date().toISOString()};
    if(editingInvoiceId){const i=invoices.findIndex(x=>Number(x.id)===editingInvoiceId);invoices[i]=invoice;} else invoices.unshift(invoice);
    applyInvoiceEffects(invoice); editingInvoiceId=null;saveData();closeModal("invoiceModal");renderAll();alert("Facture enregistrée avec succès.");
}


/* =========================================================
   INVOICES TABLE
========================================================= */

function renderInvoices(){
    const table=document.getElementById("invoicesTable");if(!table)return;if(!invoices.length){table.innerHTML='<tr><td colspan="8" class="empty">Aucune facture enregistrée.</td></tr>';return;}
    table.innerHTML=invoices.map(inv=>{let cls='success',txt='Payée';if(Number(inv.due)>0&&Number(inv.paid)>0){cls='warning';txt='Partiellement payée';}else if(Number(inv.due)>0){cls='danger';txt='Non payée';}
    return `<tr><td>${formatDate(inv.date)}</td><td>${escapeHTML(inv.number)}</td><td>${escapeHTML(inv.supplierName)}</td><td>${formatMoney(inv.totalHT)}</td><td>${formatMoney(inv.tva)}</td><td>${formatMoney(inv.totalTTC)}</td><td><span class="status ${cls}">${txt}</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewInvoice(${inv.id})">👁️</button><button class="btn small edit" onclick="openInvoiceModal(${inv.id})">✏️</button><button class="btn small print" onclick="printInvoice(${inv.id})">🖨️</button><button class="btn small danger" onclick="deleteInvoice(${inv.id})">🗑️</button></div></td></tr>`;}).join('');
}


function viewInvoice(id){
    const inv=invoices.find(x=>Number(x.id)===Number(id));if(!inv)return;
    const lines=(inv.lines||[]).map(l=>`${escapeHTML(l.name)} — ${formatNumber(l.quantity)} ${escapeHTML(l.unit)} × ${formatMoney(l.price)} — TVA ${l.vatRate}%`).join('<br>');
    showDetailsModal("Facture "+inv.number,[["Fournisseur",inv.supplierName],["Date",formatDate(inv.date)],["Produits",lines||'-'],["Total HT",formatMoney(inv.totalHT)],["TVA",formatMoney(inv.tva)],["Total TTC",formatMoney(inv.totalTTC)],["Payé",formatMoney(inv.paid)],["Reste",formatMoney(inv.due)]],()=>printInvoice(id),true);
}



function applyInvoiceEffects(invoice){
    const supplier=suppliers.find(s=>Number(s.id)===Number(invoice.supplierId)); if(supplier){supplier.purchases=Number(supplier.purchases||0)+Number(invoice.totalTTC||0);supplier.paid=Number(supplier.paid||0)+Number(invoice.paid||0);}
    (invoice.lines||[]).forEach(line=>{let product=line.productId?products.find(p=>Number(p.id)===Number(line.productId)):findProductByName(line.name);if(!product){product={id:createId(),name:line.name,category:line.category||'Autre',unit:line.unit||'pièce',stock:0,minStock:0,price:Number(line.price||0),createdAt:new Date().toISOString()};products.push(product);line.productId=product.id;}const oldStock=Number(product.stock||0),oldPrice=Number(product.price||0),newStock=oldStock+Number(line.quantity||0);if(newStock>0)product.price=((oldStock*oldPrice)+(Number(line.quantity||0)*Number(line.price||0)))/newStock;product.stock=newStock;movements.unshift({id:createId(),date:new Date().toISOString(),productId:product.id,productName:product.name,type:'entry',quantity:Number(line.quantity||0),unit:product.unit,reason:'Achat - Facture '+invoice.number,note:'Entrée automatique via facture fournisseur',invoiceId:invoice.id});});
}
function reverseInvoiceEffects(invoice){
    const supplier=suppliers.find(s=>Number(s.id)===Number(invoice.supplierId));if(supplier){supplier.purchases=Math.max(0,Number(supplier.purchases||0)-Number(invoice.totalTTC||0));supplier.paid=Math.max(0,Number(supplier.paid||0)-Number(invoice.paid||0));}
    (invoice.lines||[]).forEach(line=>{const product=line.productId?products.find(p=>Number(p.id)===Number(line.productId)):findProductByName(line.name);if(product)product.stock=Math.max(0,Number(product.stock||0)-Number(line.quantity||0));});
    movements=movements.filter(m=>Number(m.invoiceId)!==Number(invoice.id) && normalizeText(m.reason)!==normalizeText('Achat - Facture '+invoice.number));
}
function deleteInvoice(id){const inv=invoices.find(x=>Number(x.id)===Number(id));if(!inv)return;if(!confirm('Supprimer cette facture ? Le stock et la situation fournisseur seront corrigés automatiquement.'))return;reverseInvoiceEffects(inv);invoices=invoices.filter(x=>Number(x.id)!==Number(id));saveData();renderAll();}
function printInvoice(id){const inv=invoices.find(x=>Number(x.id)===Number(id));if(!inv)return;const rows=(inv.lines||[]).map(l=>`<tr><td>${escapeHTML(l.name)}</td><td>${formatNumber(l.quantity)} ${escapeHTML(l.unit)}</td><td>${formatMoney(l.price)}</td><td>${l.vatRate}%</td><td>${formatMoney(l.totalHT)}</td></tr>`).join('');printDocument('Facture '+inv.number,`<div class="doc-head"><h1>Pause & Plate</h1><p>Manager</p></div><h2>Facture d'achat ${escapeHTML(inv.number)}</h2><p><strong>Fournisseur:</strong> ${escapeHTML(inv.supplierName)}<br><strong>Date:</strong> ${formatDate(inv.date)}</p><table><thead><tr><th>Produit</th><th>Quantité</th><th>PU HT</th><th>TVA</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><p>Total HT: <strong>${formatMoney(inv.totalHT)}</strong></p><p>TVA: <strong>${formatMoney(inv.tva)}</strong></p><p>Total TTC: <strong>${formatMoney(inv.totalTTC)}</strong></p><p>Payé: <strong>${formatMoney(inv.paid)}</strong></p><p>Reste: <strong>${formatMoney(inv.due)}</strong></p></div>`);}

/* =========================================================
   SCAN MODAL
========================================================= */

function openScanModal(){

    scannedInvoiceText =
        "";


    scannedInvoiceData =
        null;


    scannedPDFPages =
        [];


    const input =
        document.getElementById(
            "invoiceFile"
        );


    if(input){

        input.value =
            "";

    }


    const preview =
        document.getElementById(
            "scanPreview"
        );


    if(preview){

        preview.innerHTML =
            "";

    }


    openModal(
        "scanModal"
    );

}


/* =========================================================
   HANDLE FILE
========================================================= */

async function handleInvoiceFile(event){

    const file =
        event.target.files?.[0];


    if(!file){

        return;

    }


    try{

        if(
            file.type ===
            "application/pdf"

            ||

            file.name
                .toLowerCase()
                .endsWith(
                    ".pdf"
                )
        ){

            await scanPDFSmart(
                file
            );

            return;

        }


        if(
            file.type
                .startsWith(
                    "image/"
                )
        ){

            await scanImageImproved(
                file
            );

            return;

        }


        throw new Error(
            "Format non supporté."
        );

    }
    catch(error){

        console.error(
            error
        );


        document.getElementById(
            "scanPreview"
        ).innerHTML = `

            <div class="scan-note">

                ❌ Erreur pendant l'analyse.

                <br><br>

                ${escapeHTML(error.message)}

            </div>

        `;

    }

}


/* =========================================================
   SMART PDF
========================================================= */

async function scanPDFSmart(file){

    if(
        typeof pdfjsLib ===
        "undefined"
    ){

        throw new Error(
            "PDF.js n'est pas chargé."
        );

    }


    const arrayBuffer =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib
            .getDocument({

                data:
                    arrayBuffer

            })
            .promise;


    showPDFTextProgress(
        "Lecture directe du PDF...",
        5
    );


    const pages =
        [];


    let directText =
        "";


    for(
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ){

        const page =
            await pdf.getPage(
                pageNumber
            );


        const pageData =
            await extractPDFPageText(
                page
            );


        pages.push(
            pageData
        );


        directText +=

            "\n"

            +

            pageData.text

            +

            "\n";


        showPDFTextProgress(

            "Lecture directe du PDF...",

            Math.round(

                pageNumber
                /
                pdf.numPages
                *
                70

            )

        );

    }


    const score =
        scoreDirectPDFText(
            directText
        );


    if(
        score >=
        70
    ){

        scannedPDFPages =
            pages;


        scannedInvoiceText =
            directText;


        showPDFTextProgress(
            "Analyse de la facture...",
            95
        );


        await sleep(
            120
        );


        finishScan();

        return;

    }


    scannedPDFPages =
        [];


    await scanPDFWithOCRFallback(
        pdf
    );

}


/* =========================================================
   PDF PAGE TEXT + POSITIONS
========================================================= */

async function extractPDFPageText(page){

    const textContent =
        await page.getTextContent();


    const items =
        textContent.items
        .filter(function(item){

            return (

                item

                &&

                typeof item.str ===
                "string"

                &&

                item.str.trim()

            );

        })
        .map(function(item){

            const transform =
                item.transform ||
                [];


            return {

                text:
                    item.str.trim(),

                x:
                    Number(
                        transform[4] ||
                        0
                    ),

                y:
                    Number(
                        transform[5] ||
                        0
                    ),

                width:
                    Number(
                        item.width ||
                        0
                    )

            };

        });


    const rows =
        [];


    items.forEach(function(item){

        let row =
            rows.find(function(existing){

                return Math.abs(
                    existing.y -
                    item.y
                )
                <=
                3.5;

            });


        if(!row){

            row = {

                y:
                    item.y,

                items:
                    []

            };


            rows.push(
                row
            );

        }


        row.items.push(
            item
        );

    });


    rows.sort(function(a,b){

        return b.y -
            a.y;

    });


    rows.forEach(function(row){

        row.items.sort(function(a,b){

            return a.x -
                b.x;

        });

    });


    const structuredRows =
        rows.map(function(row){

            return {

                y:
                    row.y,

                columns:
                    row.items.map(function(item){

                        return {

                            text:
                                item.text,

                            x:
                                item.x,

                            width:
                                item.width

                        };

                    }),

                text:
                    row.items
                    .map(function(item){

                        return item.text;

                    })
                    .join(
                        " | "
                    )

            };

        });


    return {

        rows:
            structuredRows,

        text:
            structuredRows
            .map(function(row){

                return row.text;

            })
            .join(
                "\n"
            )

    };

}


/* =========================================================
   PDF QUALITY
========================================================= */

function scoreDirectPDFText(text){

    const normalized =
        normalizeText(
            text
        );


    let score =
        0;


    const letters =
        (
            text.match(
                /[A-Za-zÀ-ÿ]/g
            )
            ||
            []
        ).length;


    const numbers =
        (
            text.match(
                /\d+(?:[.,]\d+)?/g
            )
            ||
            []
        ).length;


    if(letters > 50){

        score +=
            20;

    }


    if(letters > 150){

        score +=
            20;

    }


    if(numbers >= 5){

        score +=
            15;

    }


    if(numbers >= 15){

        score +=
            15;

    }


    [

        "facture",
        "designation",
        "quantite",
        "total",
        "tva",
        "prix"

    ]
    .forEach(function(keyword){

        if(
            normalized.includes(
                normalizeText(
                    keyword
                )
            )
        ){

            score +=
                10;

        }

    });


    return score;

}


/* =========================================================
   PDF OCR FALLBACK
========================================================= */

async function scanPDFWithOCRFallback(pdf){

    if(
        typeof Tesseract ===
        "undefined"
    ){

        throw new Error(
            "Tesseract OCR n'est pas chargé."
        );

    }


    let fullText =
        "";


    for(
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ){

        const page =
            await pdf.getPage(
                pageNumber
            );


        const viewport =
            page.getViewport({

                scale:
                    3.5

            });


        const canvas =
            document.createElement(
                "canvas"
            );


        const context =
            canvas.getContext(
                "2d"
            );


        canvas.width =
            Math.ceil(
                viewport.width
            );


        canvas.height =
            Math.ceil(
                viewport.height
            );


        context.fillStyle =
            "#FFFFFF";


        context.fillRect(

            0,

            0,

            canvas.width,

            canvas.height

        );


        await page.render({

            canvasContext:
                context,

            viewport:
                viewport

        }).promise;


        const text =
            await runDualOCR(

                canvas,

                preprocessCanvas(
                    canvas
                ),

                `Page ${pageNumber}`

            );


        fullText +=
            "\n" +
            text +
            "\n";

    }


    scannedInvoiceText =
        fullText;


    scannedPDFPages =
        [];


    finishScan();

}


/* =========================================================
   IMAGE OCR
========================================================= */

async function scanImageImproved(file){

    const imageBitmap =
        await createImageBitmap(
            file
        );


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        Math.round(
            imageBitmap.width *
            2.5
        );


    canvas.height =
        Math.round(
            imageBitmap.height *
            2.5
        );


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(

        imageBitmap,

        0,

        0,

        canvas.width,

        canvas.height

    );


    scannedInvoiceText =
        await runDualOCR(

            canvas,

            preprocessCanvas(
                canvas
            ),

            "Image"

        );


    scannedPDFPages =
        [];


    finishScan();

}


/* =========================================================
   OCR
========================================================= */

async function runDualOCR(
    originalCanvas,
    processedCanvas,
    label
){

    const originalBlob =
        await canvasToBlob(
            originalCanvas
        );


    const processedBlob =
        await canvasToBlob(
            processedCanvas
        );


    const original =
        await Tesseract.recognize(

            originalBlob,

            "fra+eng"

        );


    const processed =
        await Tesseract.recognize(

            processedBlob,

            "fra+eng"

        );


    return String(
        processed.data.text ||
        ""
    ).length
    >
    String(
        original.data.text ||
        ""
    ).length
    ?
    processed.data.text
    :
    original.data.text;

}


/* =========================================================
   PREPROCESS
========================================================= */

function preprocessCanvas(sourceCanvas){

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        sourceCanvas.width;


    canvas.height =
        sourceCanvas.height;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.drawImage(

        sourceCanvas,

        0,

        0

    );


    return canvas;

}


function canvasToBlob(canvas){

    return new Promise(function(resolve){

        canvas.toBlob(

            resolve,

            "image/png",

            1

        );

    });

}


/* =========================================================
   FINISH SCAN
========================================================= */

function finishScan(){

    scannedInvoiceData =
        extractInvoiceData(
            scannedInvoiceText
        );


    // Merge repeated articles detected on the same invoice.
    // Quantities are added and the unit price becomes a weighted average
    // so the original total HT is preserved exactly.
    if(
        scannedInvoiceData
        &&
        Array.isArray(scannedInvoiceData.products)
    ){

        scannedInvoiceData.products =
            deduplicateScannedProducts(
                scannedInvoiceData.products
            );

    }


    renderScanResult();

}


/* =========================================================
   MAIN PARSER
========================================================= */

function extractInvoiceData(text){

    const clean =
        normalizeOCRText(
            text
        );


    let detectedProducts =
        [];


    let structuredTotals = {

        totalHT:
            0,

        tvaAmount:
            0,

        totalTTC:
            0

    };


    let structuredSupplier =
        "";


    let vatSummary =
        [];


    if(
        Array.isArray(
            scannedPDFPages
        )
        &&
        scannedPDFPages.length
    ){

        detectedProducts =
            extractProductsFromStructuredPDF(
                scannedPDFPages
            );


        structuredTotals =
            extractStructuredTotals(
                scannedPDFPages
            );


        structuredSupplier =
            extractHeaderSupplier(
                scannedPDFPages
            );


        vatSummary =
            extractStructuredVatSummary(
                scannedPDFPages
            );

    }


    if(
        !detectedProducts.length
    ){

        detectedProducts =
            extractProductsFromTextTable(
                clean
            );

    }


    const textTotalHT =
        extractTotalHT(
            clean
        );


    const textTVA =
        extractTVAAmount(
            clean
        );


    const textTTC =
        extractTotalTTC(
            clean
        );


    let totalHT =
        structuredTotals.totalHT
        ||
        textTotalHT;


    let tvaAmount =
        structuredTotals.tvaAmount
        ||
        textTVA;


    let totalTTC =
        structuredTotals.totalTTC
        ||
        textTTC;


    /*
       FALLBACK:
       if HT and TTC exist but TVA doesn't,
       calculate total TVA
    */

    if(
        !tvaAmount
        &&
        totalHT > 0
        &&
        totalTTC > 0
        &&
        totalTTC >= totalHT
    ){

        tvaAmount =
            roundMoney(
                totalTTC -
                totalHT
            );

    }


    /*
       If no per-product TVA is available,
       DON'T invent one.
       Keep product vatRate at 0,
       but keep real VAT summary separately.
    */


    return {

        number:
            extractInvoiceNumber(
                clean
            ),

        date:
            extractInvoiceDate(
                clean
            ),

        supplier:
            detectSupplier(
                clean,
                structuredSupplier
            ),

        detectedSupplierName:
            structuredSupplier
            ||
            extractSupplierName(
                clean
            ),

        totalHT:
            totalHT,

        tvaAmount:
            tvaAmount,

        totalTTC:
            totalTTC,

        vatSummary:
            vatSummary,

        products:
            detectedProducts,

        rawText:
            clean

    };

}


/* =========================================================
   HEADER SUPPLIER
========================================================= */

function extractHeaderSupplier(pages){
    const firstPage=pages?.[0]; if(!firstPage||!Array.isArray(firstPage.rows)) return "";
    const cities=["biougra","agadir","ait melloul","aït melloul","casablanca","marrakech","rabat","kenitra","kénitra","tanger","fes","fès","meknes","meknès","tetouan","tétouan","sale","salé"];
    const tableIndex=firstPage.rows.findIndex(r=>isTableHeader(normalizeText(r.text||""))); const limit=tableIndex>0?tableIndex:Math.min(firstPage.rows.length,25);
    const savedNames=suppliers.filter(s=>!isOurRestaurantName(normalizeText(s.name))).map(s=>({raw:s.name,norm:normalizeText(s.name)}));
    for(const row of firstPage.rows.slice(0,limit)){const norm=normalizeText(row.text||"");for(const s of savedNames){if(s.norm&&norm.includes(s.norm))return s.raw;}}
    const candidates=[];
    firstPage.rows.slice(0,limit).forEach((row,index)=>{const chunks=(row.columns||[]).map(c=>String(c.text||'').trim()).filter(Boolean);for(const chunk of chunks){const n=normalizeText(chunk);if(!n||n.length<3||isOurRestaurantName(n)||cities.includes(n)||looksLikeAddressLine(n)||isAdministrativeText(n)||/\d{2,}/.test(n)||/^(facture|client|adresse|tel|ice|if|rc|date)/.test(n))continue;let score=Math.max(0,35-index);if(chunk.length<=35)score+=20;if(chunk===chunk.toUpperCase()&&/[A-ZÀ-Ÿ]{4,}/.test(chunk))score+=35;if(/sarl|sarl au|soci[eé]t[eé]|\bste\b/i.test(chunk))score+=30;if(/novamar|gastromixte/i.test(chunk))score+=100;candidates.push({text:chunk,score});}}
    );
    candidates.sort((a,b)=>b.score-a.score); return candidates[0]?.text||"";
}


/* =========================================================
   ADDRESS DETECTION
========================================================= */

function looksLikeAddressLine(normalized){

    const words = [

        "route",
        "avenue",
        "boulevard",
        "quartier",
        "lot ",
        "lotissement",
        "zone industrielle",
        "bp ",
        "rue ",
        "km ",
        "hay ",
        "douar",
        "tel ",
        "tél ",
        "telephone",
        "téléphone",
        "mobile",
        "fax",
        "email",
        "e-mail",
        "ice ",
        "if ",
        "rc ",
        "patente"

    ];


    return words.some(function(word){

        return normalized.includes(
            normalizeText(
                word
            )
        );

    });

}


/* =========================================================
   STRUCTURED TVA SUMMARY
========================================================= */

function extractStructuredVatSummary(pages){

    const result =
        [];


    pages.forEach(function(page){

        if(
            !page
            ||
            !Array.isArray(
                page.rows
            )
        ){

            return;

        }


        let vatTableFound =
            false;


        page.rows.forEach(function(row,index){

            const normalized =
                normalizeText(
                    row.text
                );


            /*
               detect VAT summary header
            */

            if(
                normalized.includes(
                    "taux"
                )
                &&
                (
                    normalized.includes(
                        "tva"
                    )
                    ||
                    normalized.includes(
                        "base"
                    )
                )
            ){

                vatTableFound =
                    true;

                return;

            }


            if(!vatTableFound){

                return;

            }


            /*
               Stop when we leave summary block
            */

            if(
                normalized.includes(
                    "arretee"
                )
                ||
                normalized.includes(
                    "arrêtée"
                )
                ||
                normalized.includes(
                    "condition de paiement"
                )
                ||
                normalized.includes(
                    "references bancaires"
                )
            ){

                vatTableFound =
                    false;

                return;

            }


            const values =
                extractNumericValuesFromColumns(
                    row.columns
                );


            if(
                values.length <
                2
            ){

                return;

            }


            /*
               Find allowed VAT rate in this row
            */

            const rate =
                values.find(function(value){

                    return isAllowedVatRate(
                        value
                    );

                });


            if(
                rate ===
                undefined
            ){

                return;

            }


            let base =
                0;


            let amount =
                0;


            /*
               Common structure:
               Base | Taux | TVA
            */

            const remaining =
                values.filter(function(value){

                    return Number(
                        value
                    ) !==
                    Number(
                        rate
                    );

                });


            if(
                remaining.length >=
                1
            ){

                base =
                    remaining[0];

            }


            if(
                remaining.length >=
                2
            ){

                amount =
                    remaining[
                        remaining.length -
                        1
                    ];

            }


            if(
                base > 0
                ||
                amount > 0
            ){

                result.push({

                    rate:
                        Number(
                            rate
                        ),

                    base:
                        Number(
                            base
                        ),

                    amount:
                        Number(
                            amount
                        )

                });

            }

        });

    });


    return result;

}


/* =========================================================
   STRUCTURED TOTALS
========================================================= */

function extractStructuredTotals(pages){

    const result = {

        totalHT:
            0,

        tvaAmount:
            0,

        totalTTC:
            0

    };


    pages.forEach(function(page){

        page.rows.forEach(function(row,index){

            const normalized =
                normalizeText(
                    row.text
                );


            const values =
                extractNumericValuesFromColumns(
                    row.columns
                );


            if(
                normalized.includes(
                    "total ht"
                )
                &&
                values.length
            ){

                result.totalHT =
                    values[
                        values.length -
                        1
                    ];

            }


            if(
                (
                    normalized.includes(
                        "total tva"
                    )
                    ||
                    normalized.includes(
                        "montant tva"
                    )
                )
                &&
                values.length
            ){

                result.tvaAmount =
                    values[
                        values.length -
                        1
                    ];

            }


            if(
                (
                    normalized.includes(
                        "total ttc"
                    )
                    ||
                    normalized.includes(
                        "net a payer"
                    )
                    ||
                    normalized.includes(
                        "total a payer"
                    )
                )
                &&
                values.length
            ){

                result.totalTTC =
                    values[
                        values.length -
                        1
                    ];

            }


            if(
                normalized ===
                "total ht"
                &&
                !result.totalHT
            ){

                result.totalHT =
                    findAmountInNextRows(
                        page.rows,
                        index
                    );

            }


            if(
                normalized ===
                "total tva"
                &&
                !result.tvaAmount
            ){

                result.tvaAmount =
                    findAmountInNextRows(
                        page.rows,
                        index
                    );

            }


            if(
                (
                    normalized ===
                    "total ttc"
                    ||
                    normalized ===
                    "net a payer"
                )
                &&
                !result.totalTTC
            ){

                result.totalTTC =
                    findAmountInNextRows(
                        page.rows,
                        index
                    );

            }

        });

    });


    return result;

}


function findAmountInNextRows(
    rows,
    index
){

    for(
        let i = index + 1;
        i <= index + 3;
        i++
    ){

        if(!rows[i]){

            break;

        }


        const values =
            extractNumericValuesFromColumns(
                rows[i].columns
            );


        if(values.length){

            return values[
                values.length -
                1
            ];

        }

    }


    return 0;

}


function extractNumericValuesFromColumns(columns){

    return columns
        .map(function(column){

            const raw =
                String(
                    column.text ||
                    ""
                )
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /%/g,
                    ""
                )
                .trim();


            if(
                /^-?\d+(?:[.,]\d+)?$/.test(
                    raw
                )
            ){

                return parseNumber(
                    raw
                );

            }


            return null;

        })
        .filter(function(value){

            return value !==
                null;

        });

}


/* =========================================================
   STRUCTURED PRODUCTS
========================================================= */

function extractProductsFromStructuredPDF(pages){

    const result =
        [];


    let tableActive =
        false;


    pages.forEach(function(page){

        page.rows.forEach(function(row){

            const normalized =
                normalizeText(
                    row.text
                );


            if(
                isTableHeader(
                    normalized
                )
            ){

                tableActive =
                    true;

                return;

            }


            if(
                tableActive
                &&
                isProductTableEnd(
                    normalized
                )
            ){

                tableActive =
                    false;

                return;

            }


            if(!tableActive){

                return;

            }


            const product =
                parseStructuredPDFRow(
                    row.columns
                );


            if(product){

                result.push(
                    product
                );

            }

        });

    });


    return deduplicateScannedProducts(
        result
    );

}


function isTableHeader(normalized){

    return (

        normalized.includes(
            "designation"
        )

        &&

        (
            normalized.includes(
                "quantite"
            )
            ||
            normalized.includes(
                "prix"
            )
            ||
            normalized.includes(
                "p.u"
            )
        )

    );

}


function isProductTableEnd(normalized){

    return [

        "total ht",
        "total tva",
        "total ttc",
        "net a payer",
        "total a payer",
        "base taux",
        "condition de paiement",
        "conditions de paiement",
        "references bancaires",
        "arretee"

    ]
    .some(function(value){

        return normalized.startsWith(
            normalizeText(
                value
            )
        );

    });

}


function parseStructuredPDFRow(columns){

    if(
        !Array.isArray(
            columns
        )
        ||
        columns.length <
        2
    ){

        return null;

    }


    const sorted =
        [...columns]
        .sort(function(a,b){

            return Number(
                a.x ||
                0
            )
            -
            Number(
                b.x ||
                0
            );

        });


    const fullLine =
        sorted
        .map(function(column){

            return String(
                column.text ||
                ""
            ).trim();

        })
        .join(
            " "
        );


    const normalized =
        normalizeText(
            fullLine
        );


    if(
        isAdministrativeText(
            normalized
        )
        ||
        isProductTableEnd(
            normalized
        )
    ){

        return null;

    }


    const numeric =
        sorted
        .map(function(column){

            const raw =
                String(
                    column.text ||
                    ""
                )
                .replace(
                    /\s/g,
                    ""
                )
                .trim();


            if(
                /^-?\d+(?:[.,]\d+)?%?$/.test(
                    raw
                )
            ){

                return {

                    x:
                        Number(
                            column.x ||
                            0
                        ),

                    raw:
                        raw,

                    value:
                        parseNumber(
                            raw
                        ),

                    isPercent:
                        raw.includes(
                            "%"
                        )

                };

            }


            return null;

        })
        .filter(Boolean);


    if(
        numeric.length <
        2
    ){

        return null;

    }


    const firstNumericX =
        Math.min(
            ...numeric.map(function(item){

                return item.x;

            })
        );


    const name =
        cleanProductName(

            sorted
            .filter(function(column){

                return (

                    Number(
                        column.x ||
                        0
                    )
                    <
                    firstNumericX

                    &&

                    /[A-Za-zÀ-ÿ]/.test(
                        column.text
                    )

                );

            })
            .map(function(column){

                return column.text;

            })
            .join(
                " "
            )

        );


    if(
        !isValidProductName(
            name
        )
    ){

        return null;

    }


    /*
       VAT is only accepted if it is clearly
       present in the product row.
       Otherwise 0 = unknown/not assigned.
    */

    let vatRate =
        0;


    const explicitPercent =
        numeric.find(function(item){

            return (

                item.isPercent

                &&

                isAllowedVatRate(
                    item.value
                )

            );

        });


    if(explicitPercent){

        vatRate =
            Number(
                explicitPercent.value
            );

    }


    let business =
        numeric.filter(function(item){

            return !item.isPercent;

        });


    /*
       If no explicit percentage:
       DO NOT treat random 20/14/10 value as TVA
       unless row is clearly a VAT-column invoice.
    */

    if(
        business.length <
        2
    ){

        return null;

    }


    const quantity =
        Number(
            business[0].value
        );


    const price =
        Number(
            business[1].value
        );


    if(
        quantity <= 0
        ||
        price < 0
    ){

        return null;

    }


    let totalHT =
        quantity *
        price;


    if(
        business.length >=
        3
        &&
        business[2].value >
        0
    ){

        totalHT =
            Number(
                business[2].value
            );

    }


    const vatAmount =
        totalHT *
        vatRate /
        100;


    const totalTTC =
        totalHT +
        vatAmount;


    return {

        name:
            name,

        quantity:
            quantity,

        unit:
            detectUnitFromText(
                fullLine
            ),

        price:
            price,

        vatRate:
            vatRate,

        // True only when a VAT percentage was explicitly present on this product row.
        vatDetected:
            Boolean(explicitPercent),

        vatAmount:
            vatAmount,

        totalHT:
            totalHT,

        totalTTC:
            totalTTC,

        category:
            guessCategory(
                name
            )

    };

}


/* =========================================================
   TEXT TABLE FALLBACK
========================================================= */

function extractProductsFromTextTable(text){

    const lines =
        getCleanLines(
            text
        );


    let start =
        -1;


    let end =
        lines.length;


    for(
        let i = 0;
        i < lines.length;
        i++
    ){

        if(
            isTableHeader(
                normalizeText(
                    lines[i]
                )
            )
        ){

            start =
                i + 1;

            break;

        }

    }


    if(start === -1){

        return [];

    }


    for(
        let i = start;
        i < lines.length;
        i++
    ){

        if(
            isProductTableEnd(
                normalizeText(
                    lines[i]
                )
            )
        ){

            end =
                i;

            break;

        }

    }


    return lines
        .slice(
            start,
            end
        )
        .map(function(line){

            return parseTextProductLine(
                line
            );

        })
        .filter(Boolean);

}


function parseTextProductLine(line){

    const normalized =
        normalizeText(
            line
        );


    if(
        isAdministrativeText(
            normalized
        )
    ){

        return null;

    }


    const matches =
        [...line.matchAll(
            /\d+(?:[.,]\d+)?%?/g
        )];


    if(
        matches.length <
        2
    ){

        return null;

    }


    const values =
        matches.map(function(match){

            return {

                value:
                    parseNumber(
                        match[0]
                    ),

                index:
                    match.index,

                raw:
                    match[0]

            };

        });


    const name =
        cleanProductName(

            line.substring(
                0,
                values[0].index
            )

        );


    if(
        !isValidProductName(
            name
        )
    ){

        return null;

    }


    let vatRate =
        0;


    const vatMatch =
        line.match(
            /\b(0|7|10|14|20)(?:[.,]00)?\s*%/
        );


    if(vatMatch){

        vatRate =
            Number(
                vatMatch[1]
            );

    }


    const quantity =
        values[0].value;


    const price =
        values[1].value;


    const totalHT =
        quantity *
        price;


    const vatAmount =
        totalHT *
        vatRate /
        100;


    return {

        name:
            name,

        quantity:
            quantity,

        unit:
            detectUnitFromText(
                line
            ),

        price:
            price,

        vatRate:
            vatRate,

        // True only when a VAT percentage was explicitly present on this product row.
        vatDetected:
            Boolean(vatMatch),

        vatAmount:
            vatAmount,

        totalHT:
            totalHT,

        totalTTC:
            totalHT +
            vatAmount,

        category:
            guessCategory(
                name
            )

    };

}


/* =========================================================
   SUPPLIER MATCHING
========================================================= */

function detectSupplier(
    text,
    detectedHeaderName = ""
){

    const normalizedText =
        normalizeText(
            text
        );


    const normalizedHeader =
        normalizeText(
            detectedHeaderName
        );


    /*
       First: match saved supplier with header name
    */

    if(normalizedHeader){

        const byHeader =
            suppliers.find(function(supplier){

                const name =
                    normalizeText(
                        supplier.name
                    );


                return (

                    name

                    &&

                    (
                        normalizedHeader.includes(
                            name
                        )

                        ||

                        name.includes(
                            normalizedHeader
                        )
                    )

                );

            });


        if(byHeader){

            return byHeader;

        }

    }


    /*
       Second: search full document,
       excluding our restaurant name
    */

    let best =
        null;


    let bestScore =
        0;


    suppliers.forEach(function(supplier){

        const name =
            normalizeText(
                supplier.name
            );


        if(
            !name
            ||
            isOurRestaurantName(
                name
            )
        ){

            return;

        }


        if(
            normalizedText.includes(
                name
            )
            &&
            name.length >
            bestScore
        ){

            best =
                supplier;

            bestScore =
                name.length;

        }

    });


    return best;

}


function extractSupplierName(text){

    const lines =
        getCleanLines(
            text
        );


    const candidates =
        lines
        .slice(
            0,
            15
        )
        .filter(function(line){

            const normalized =
                normalizeText(
                    line
                );


            return (

                !isOurRestaurantName(
                    normalized
                )

                &&

                !looksLikeAddressLine(
                    normalized
                )

                &&

                !isAdministrativeText(
                    normalized
                )

                &&

                /[A-Za-zÀ-ÿ]{3,}/.test(
                    line
                )

            );

        });


    if(!candidates.length){

        return "";

    }


    candidates.sort(function(a,b){

        return supplierCandidateScore(
            b
        )
        -
        supplierCandidateScore(
            a
        );

    });


    return cleanSupplierName(
        candidates[0]
    );

}


/* =========================================================
   INVOICE NUMBER + DATE
========================================================= */

function extractInvoiceNumber(text){

    const lines =
        getCleanLines(
            text
        );


    for(
        let i = 0;
        i < lines.length - 1;
        i++
    ){

        const normalized =
            normalizeText(
                lines[i]
            );


        if(
            normalized.includes(
                "numero"
            )
            &&
            normalized.includes(
                "date"
            )
        ){

            const next =
                lines[
                    i + 1
                ];


            const date =
                next.match(
                    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/
                );


            const beforeDate =
                date
                ?
                next.substring(
                    0,
                    date.index
                )
                :
                next;


            const matches =
                beforeDate.match(
                    /[A-Z0-9][A-Z0-9\/_.-]{2,}/gi
                )
                ||
                [];


            for(
                const candidate
                of matches
            ){

                if(
                    /\d/.test(
                        candidate
                    )
                ){

                    return candidate;

                }

            }

        }

    }


    const fa =
        text.match(
            /\bFA[\/\-][A-Z0-9\/_.-]+\b/i
        );


    if(fa){

        return fa[0];

    }


    return "";

}


function extractInvoiceDate(text){

    const match =
        text.match(
            /\b([0-3]?\d[\/.-][01]?\d[\/.-]\d{4})\b/
        );


    return match
        ?
        match[1]
        :
        "";

}


/* =========================================================
   TEXT TOTALS FALLBACK
========================================================= */

function extractTotalHT(text){

    return extractNamedAmount(
        text,
        [
            "TOTAL HT",
            "MONTANT HT"
        ]
    );

}


function extractTVAAmount(text){

    return extractNamedAmount(
        text,
        [
            "TOTAL TVA",
            "MONTANT TVA"
        ]
    );

}


function extractTotalTTC(text){

    return extractNamedAmount(
        text,
        [
            "TOTAL TTC",
            "NET A PAYER",
            "TOTAL A PAYER"
        ]
    );

}


function extractNamedAmount(
    text,
    labels
){

    const lines =
        getCleanLines(
            text
        );


    for(
        const line
        of lines
    ){

        const normalized =
            normalizeText(
                line
            );


        if(
            labels.some(function(label){

                return normalized.includes(
                    normalizeText(
                        label
                    )
                );

            })
        ){

            const numbers =
                line.match(
                    /\d[\d\s]*(?:[.,]\d+)?/g
                )
                ||
                [];


            if(numbers.length){

                return parseNumber(
                    numbers[
                        numbers.length -
                        1
                    ]
                );

            }

        }

    }


    return 0;

}


/* =========================================================
   SCAN RESULT
========================================================= */

function renderScanResult(){

    const preview =
        document.getElementById(
            "scanPreview"
        );


    if(!preview){

        return;

    }


    const supplierName =
        scannedInvoiceData.supplier
        ?
        scannedInvoiceData.supplier.name
        :
        scannedInvoiceData.detectedSupplierName
        ||
        "Non détecté";


    const vatSummaryDisplay =
        scannedInvoiceData.vatSummary
        &&
        scannedInvoiceData.vatSummary.length
        ?
        scannedInvoiceData.vatSummary
            .map(function(item){

                return (
                    item.rate
                    +
                    "%"
                );

            })
            .join(
                " / "
            )
        :
        buildVatSummary(
            scannedInvoiceData.products
        );


    preview.innerHTML = `

        <div class="scan-result">

            <h3>
                ✅ Facture analysée
            </h3>


            <div class="ocr-summary">

                <p>
                    <strong>Fournisseur :</strong>
                    ${escapeHTML(supplierName)}
                </p>

                <p>
                    <strong>N° Facture :</strong>
                    ${
                        escapeHTML(
                            scannedInvoiceData.number ||
                            "Non détecté"
                        )
                    }
                </p>

                <p>
                    <strong>Date :</strong>
                    ${
                        escapeHTML(
                            scannedInvoiceData.date ||
                            "Non détectée"
                        )
                    }
                </p>

                <p>
                    <strong>Produits détectés :</strong>
                    ${scannedInvoiceData.products.length}
                </p>

                <p>
                    <strong>TVA détectée :</strong>
                    ${escapeHTML(vatSummaryDisplay)}
                </p>

                <p>
                    <strong>Total HT détecté :</strong>
                    ${
                        scannedInvoiceData.totalHT
                        ?
                        formatMoney(
                            scannedInvoiceData.totalHT
                        )
                        :
                        "Non détecté"
                    }
                </p>

                <p>
                    <strong>Total TVA détecté :</strong>
                    ${
                        scannedInvoiceData.tvaAmount
                        ?
                        formatMoney(
                            scannedInvoiceData.tvaAmount
                        )
                        :
                        "Non détecté"
                    }
                </p>

                <p>
                    <strong>Total TTC détecté :</strong>
                    ${
                        scannedInvoiceData.totalTTC
                        ?
                        formatMoney(
                            scannedInvoiceData.totalTTC
                        )
                        :
                        "Non détecté"
                    }
                </p>

            </div>


            <div class="ocr-products-block">

                <strong>
                    Produits détectés :
                </strong>


                <div class="ocr-products-list">

                    ${
                        scannedInvoiceData.products
                        .map(function(product){

                            return `

                                <div class="ocr-product-item">

                                    <strong>
                                        ${escapeHTML(product.name)}
                                    </strong>

                                    <br>

                                    Quantité :

                                    ${formatNumber(product.quantity)}

                                    ${escapeHTML(product.unit)}

                                    —

                                    PU HT :

                                    ${formatMoney(product.price)}

                                    ${
                                        product.vatRate > 0
                                        ?
                                        `— TVA : ${product.vatRate}%`
                                        :
                                        ""
                                    }

                                </div>

                            `;

                        })
                        .join("")
                    }

                </div>

            </div>


            <button
                type="button"
                class="btn primary"
                style="margin-top:18px;"
                onclick="useScannedInvoiceData()"
            >

                ➕ Utiliser ces informations

            </button>

        </div>

    `;

}


/* =========================================================
   IMPORT SCAN DATA
========================================================= */

function useScannedInvoiceData(){

    if(!scannedInvoiceData){

        return;

    }


    const data =
        scannedInvoiceData;


    /*
       Determine a reliable default VAT rate for OCR lines.
       Some supplier PDFs expose VAT only in the totals/summary,
       not on each product row. In that case we infer the rate from
       Total TVA / Total HT and fall back to the detected VAT summary.
    */
    const supportedVatRates = [0, 7, 10, 14, 20];

    let detectedDefaultVatRate = 0;

    if(
        Number(data.totalHT) > 0
        &&
        Number(data.tvaAmount) >= 0
    ){

        const effectiveRate =
            Number(data.tvaAmount)
            /
            Number(data.totalHT)
            *
            100;

        const nearestRate = supportedVatRates.reduce(function(best, rate){

            return Math.abs(rate - effectiveRate) < Math.abs(best - effectiveRate)
                ? rate
                : best;

        }, supportedVatRates[0]);

        if(Math.abs(nearestRate - effectiveRate) <= 0.75){

            detectedDefaultVatRate = nearestRate;

        }

    }

    if(
        !detectedDefaultVatRate
        &&
        Array.isArray(data.vatSummary)
        &&
        data.vatSummary.length
    ){

        const validRates = data.vatSummary
            .map(function(item){ return Number(item.rate); })
            .filter(function(rate){ return supportedVatRates.includes(rate); });

        if(validRates.length === 1){

            detectedDefaultVatRate = validRates[0];

        }

    }

    if(!detectedDefaultVatRate){

        detectedDefaultVatRate = parseNumber(
            getValue(
                "invoiceTVARate"
            )
        );

    }


    closeModal(
        "scanModal"
    );


    openInvoiceModal();


    if(document.getElementById("invoiceTVARate")){

        setValue(
            "invoiceTVARate",
            detectedDefaultVatRate
        );

    }


    if(data.number){

        setValue(
            "invoiceNumber",
            data.number
        );

    }


    if(data.date){

        const converted =
            convertDateToInput(
                data.date
            );


        if(converted){

            setValue(
                "invoiceDate",
                converted
            );

        }

    }


    if(data.supplier){

        setValue(
            "invoiceSupplier",
            data.supplier.id
        );

    }


    if(
        data.products.length
    ){

        document.getElementById(
            "invoiceLines"
        ).innerHTML =
            "";


        data.products.forEach(function(product){

            const existing =
                findProductByName(
                    product.name
                );


            addInvoiceLine({

                productId:
                    existing
                    ?
                    existing.id
                    :
                    null,

                name:
                    existing
                    ?
                    existing.name
                    :
                    product.name,

                category:
                    existing
                    ?
                    existing.category
                    :
                    product.category,

                unit:
                    existing
                    ?
                    existing.unit
                    :
                    product.unit,

                quantity:
                    product.quantity,

                price:
                    product.price,

                vatRate:
                    Number(product.vatRate) > 0
                    ?
                    Number(product.vatRate)
                    :
                    detectedDefaultVatRate

            });

        });

    }


    updateInvoiceTotals();

}


/* =========================================================
   HELPERS
========================================================= */

function findProductByName(name){

    const normalized =
        normalizeText(
            name
        );


    return products.find(function(product){

        return normalizeText(
            product.name
        )
        ===
        normalized;

    })
    ||
    null;

}


function cleanProductName(name){

    return String(
        name ||
        ""
    )
    // Remove delivery-note / BL references accidentally captured before the designation.
    // Examples: "BL26-05157 SURIMI...", "BL 26/05157 - SURIMI...", "BL N° 2605157 SURIMI...".
    .replace(
        /^\s*B\.?\s*L\.?\s*(?:N(?:[°ºo]|O)?\s*)?[A-Z0-9][A-Z0-9\-\/.]*\s*[-:–—]?\s*/i,
        ""
    )
    .replace(
        /^[^A-Za-zÀ-ÿ0-9]+/,
        ""
    )
    .replace(
        /[^A-Za-zÀ-ÿ0-9()\-_'\/,.% ]+$/g,
        ""
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


function isValidProductName(name){

    const normalized =
        normalizeText(
            name
        );


    if(
        !normalized
        ||
        normalized.length <
        2
    ){

        return false;

    }


    return !isAdministrativeText(
        normalized
    );

}


function detectUnitFromText(text){

    const match =
        String(
            text ||
            ""
        )
        .match(
            /\b(KG|KGS?|G|L|LTR|LITRE|ML|PCS?|PC|PI[EÈ]CES?|UNITE|UNITÉ|UNITES|UNITÉS|CTN|CARTONS?|PAQUETS?)\b/i
        );


    if(!match){

        return "pièce";

    }


    return normalizeUnit(
        match[1]
    );

}


function normalizeUnit(unit){

    const value =
        normalizeText(
            unit
        );


    if(
        value === "kg"
        ||
        value === "kgs"
    ){

        return "kg";

    }


    if(value === "g"){

        return "g";

    }


    if(
        value === "l"
        ||
        value === "ltr"
        ||
        value === "litre"
    ){

        return "L";

    }


    if(value === "ml"){

        return "ml";

    }


    if(
        value.includes(
            "carton"
        )
        ||
        value === "ctn"
    ){

        return "carton";

    }


    return "pièce";

}


function guessCategory(name){

    const value =
        normalizeText(
            name
        );


    if(
        [
            "saumon",
            "thon",
            "crevette",
            "poisson",
            "calamar",
            "surimi",
            "moule",
            "rascasse",
            "anchois",
            "poulpe"
        ]
        .some(function(word){

            return value.includes(
                word
            );

        })
    ){

        return "Poissons";

    }


    if(
        value.includes(
            "mozzarella"
        )
        ||
        value.includes(
            "fromage"
        )
        ||
        value.includes(
            "lait"
        )
    ){

        return "Produits laitiers";

    }


    return "Épicerie";

}


function deduplicateScannedProducts(items){

    const groups =
        new Map();


    (items || []).forEach(function(item){

        if(!item){
            return;
        }


        const cleanedName =
            cleanProductName(
                item.name || ""
            );


        if(!cleanedName){
            return;
        }


        const quantity =
            Number(item.quantity || 0);


        const unit =
            item.unit || "pièce";


        const vatRate =
            Number(item.vatRate || 0);


        const vatDetected =
            item.vatDetected === true;


        /*
           Same designation + same unit = same article.
           If OCR explicitly detected two different VAT rates for the same
           designation, keep them separate to avoid changing invoice VAT.
        */
        const baseKey =
            normalizeText(cleanedName)
            + "||"
            + normalizeText(unit);


        let key =
            baseKey;


        if(vatDetected){

            const existingSameArticle =
                [...groups.entries()]
                .find(function(entry){

                    return entry[1].baseKey === baseKey;

                });


            if(
                existingSameArticle
                &&
                existingSameArticle[1].vatDetected
                &&
                Number(existingSameArticle[1].vatRate) !== vatRate
            ){

                key =
                    baseKey
                    + "||vat:"
                    + vatRate;

            }

        }


        const lineHT =
            Number.isFinite(Number(item.totalHT))
            &&
            Number(item.totalHT) >= 0
            ?
            Number(item.totalHT)
            :
            quantity * Number(item.price || 0);


        const lineVatAmount =
            Number.isFinite(Number(item.vatAmount))
            ?
            Number(item.vatAmount)
            :
            lineHT * vatRate / 100;


        if(!groups.has(key)){

            groups.set(key,{
                ...item,
                name:cleanedName,
                quantity:quantity,
                price:quantity > 0 ? lineHT / quantity : Number(item.price || 0),
                totalHT:lineHT,
                vatRate:vatRate,
                vatDetected:vatDetected,
                vatAmount:lineVatAmount,
                totalTTC:lineHT + lineVatAmount,
                baseKey:baseKey
            });

            return;

        }


        const current =
            groups.get(key);


        const newQuantity =
            Number(current.quantity || 0)
            +
            quantity;


        const newTotalHT =
            Number(current.totalHT || 0)
            +
            lineHT;


        const newVatAmount =
            Number(current.vatAmount || 0)
            +
            lineVatAmount;


        current.quantity =
            newQuantity;


        // Weighted average: total value / total quantity.
        current.price =
            newQuantity > 0
            ?
            newTotalHT / newQuantity
            :
            0;


        current.totalHT =
            newTotalHT;


        current.vatAmount =
            newVatAmount;


        current.totalTTC =
            newTotalHT + newVatAmount;


        // Prefer an explicitly detected VAT over an unknown row.
        if(!current.vatDetected && vatDetected){
            current.vatRate = vatRate;
            current.vatDetected = true;
        }


        // Keep the most useful metadata when one duplicate row has it.
        if(
            (!current.category || current.category === "Autre")
            &&
            item.category
        ){
            current.category = item.category;
        }

    });


    return [...groups.values()]
        .map(function(item){

            const copy = {...item};
            delete copy.baseKey;
            return copy;

        });

}


function isAdministrativeText(normalized){

    return [

        "total",
        "facture",
        "numero",
        "numéro",
        "date",
        "page",
        "client",
        "adresse",
        "telephone",
        "téléphone",
        "ice",
        "siege social",
        "siège social",
        "capital",
        "condition de paiement",
        "references bancaires"

    ]
    .some(function(value){

        return normalized.startsWith(
            normalizeText(
                value
            )
        );

    });

}


function isAllowedVatRate(value){

    return [
        0,
        7,
        10,
        14,
        20
    ]
    .includes(
        Number(
            value
        )
    );

}


function buildVatSummary(list){

    const rates =
        [
            ...new Set(

                list
                    .map(function(product){

                        return Number(
                            product.vatRate ||
                            0
                        );

                    })
                    .filter(function(rate){

                        return rate >
                            0;

                    })

            )
        ]
        .sort(function(a,b){

            return a -
                b;

        });


    return rates.length
        ?
        rates
        .map(function(rate){

            return rate +
                "%";

        })
        .join(
            " / "
        )
        :
        "Non détectée";

}


function isOurRestaurantName(normalized){

    return (

        normalized.includes(
            "pause plate"
        )

        ||

        normalized.includes(
            "pause & plate"
        )

        ||

        normalized.includes(
            "pause and plate"
        )

    );

}


function supplierCandidateScore(text){

    const normalized =
        normalizeText(
            text
        );


    let score =
        0;


    if(
        normalized.includes(
            "sarl"
        )
        ||
        normalized.includes(
            "societe"
        )
    ){

        score +=
            30;

    }


    if(
        text.length <=
        40
    ){

        score +=
            20;

    }


    if(
        isOurRestaurantName(
            normalized
        )
    ){

        score -=
            200;

    }


    return score;

}


function cleanSupplierName(value){

    return String(
        value ||
        ""
    )
    .replace(
        /\|/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}



function detailRowsHTML(rows, allowHtml=false){return `<div class="details-grid">${rows.map(([k,v])=>`<div class="details-label">${escapeHTML(k)}</div><div class="details-value">${allowHtml?String(v):escapeHTML(String(v??''))}</div>`).join('')}</div>`;}
function showDetailsModal(title,rows,onPrint=null,allowHtml=false){let modal=document.getElementById('detailsModal');if(!modal){modal=document.createElement('div');modal.id='detailsModal';modal.className='modal-overlay';modal.innerHTML='<div class="modal details-modal"><div class="modal-header"><h2 id="detailsModalTitle"></h2><button type="button" onclick="closeModal(\'detailsModal\')">×</button></div><div id="detailsModalBody"></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal(\'detailsModal\')">Fermer</button><button type="button" class="btn print" id="detailsPrintBtn">🖨️ Imprimer</button></div></div>';document.body.appendChild(modal);}document.getElementById('detailsModalTitle').textContent=title;document.getElementById('detailsModalBody').innerHTML=detailRowsHTML(rows,allowHtml);const btn=document.getElementById('detailsPrintBtn');btn.style.display=onPrint?'inline-block':'none';btn.onclick=onPrint||null;openModal('detailsModal');}
function printDocument(title,bodyHtml){
    /*
      Impression sans popup:
      - fonctionne sur Safari / Chrome / Edge
      - évite le blocage de window.open() sur GitHub Pages
      - imprime dans un iframe invisible puis le supprime
    */
    try{
        const oldFrame=document.getElementById('ppPrintFrame');
        if(oldFrame)oldFrame.remove();

        const frame=document.createElement('iframe');
        frame.id='ppPrintFrame';
        frame.setAttribute('aria-hidden','true');
        frame.style.position='fixed';
        frame.style.right='0';
        frame.style.bottom='0';
        frame.style.width='0';
        frame.style.height='0';
        frame.style.border='0';
        frame.style.opacity='0';
        frame.style.pointerEvents='none';
        document.body.appendChild(frame);

        const doc=frame.contentWindow.document;
        doc.open();
        doc.write(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(title)}</title>
<style>
@page{size:auto;margin:12mm}
*{box-sizing:border-box}
html,body{background:#fff!important}
body{font-family:Arial,"Helvetica Neue",sans-serif;color:#18251b;margin:0;padding:8px;font-size:12px;line-height:1.4}
h1,h2,h3{color:#094B2D;page-break-after:avoid}
h1{font-size:24px}h2{font-size:19px}h3{font-size:15px}
.doc-head{border-bottom:3px solid #D9A51E;margin-bottom:20px;padding-bottom:8px}
.doc-head h1{margin:0}.doc-head p{margin:4px 0 0;color:#666}
table{width:100%;border-collapse:collapse;margin:14px 0;page-break-inside:auto}
thead{display:table-header-group}
tfoot{display:table-footer-group}
tr{page-break-inside:avoid;page-break-after:auto}
th,td{border:1px solid #cfd6d2;padding:7px;text-align:left;vertical-align:top}
th{background:#EAF3EE!important;color:#094B2D;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.details-grid{display:grid;grid-template-columns:180px 1fr;border:1px solid #ddd}
.details-label,.details-value{padding:9px;border-bottom:1px solid #eee}
.details-label{font-weight:bold;background:#f6f6f6!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.totals{margin-left:auto;max-width:340px;text-align:right}
.totals p{margin:6px 0}
.status{border:1px solid #ddd;padding:2px 6px;border-radius:8px}
button,.btn,.action-buttons{display:none!important}
@media print{
  html,body{width:100%;padding:0!important;margin:0!important}
  a{text-decoration:none;color:inherit}
}
</style>
</head>
<body>${bodyHtml}</body>
</html>`);
        doc.close();

        const doPrint=()=>{
            try{
                frame.contentWindow.focus();
                frame.contentWindow.print();
            }catch(err){
                console.error('Erreur impression:',err);
                alert("Impossible d'ouvrir l'impression sur ce navigateur.");
            }
            setTimeout(()=>{ if(frame && frame.parentNode) frame.remove(); },1500);
        };

        // Give Safari/Chrome enough time to lay out tables and images.
        if(doc.readyState==='complete'){
            setTimeout(doPrint,250);
        }else{
            frame.onload=()=>setTimeout(doPrint,250);
            setTimeout(()=>{
                if(document.getElementById('ppPrintFrame')) doPrint();
            },900);
        }
    }catch(err){
        console.error('Erreur printDocument:',err);
        alert("Erreur lors de la préparation de l'impression.");
    }
}

/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboard(){

    const value =
        products.reduce(function(total,product){

            return total +

                Number(
                    product.stock ||
                    0
                )

                *

                Number(
                    product.price ||
                    0
                );

        },0);


    setText(
        "stockValue",
        formatMoney(
            value
        )
    );


    setText(
        "productCount",
        products.length
    );

}


function updateStockStats(){

    const value =
        products.reduce(function(total,product){

            return total +

                Number(
                    product.stock ||
                    0
                )

                *

                Number(
                    product.price ||
                    0
                );

        },0);


    setText(
        "stockProductsCount",
        products.length
    );


    setText(
        "stockTotalValue",
        formatMoney(
            value
        )
    );


    setText(
        "lowStockCount",
        products.filter(function(product){

            return Number(
                product.stock
            )
            <=
            Number(
                product.minStock
            );

        }).length
    );

}


function updateSupplierStats(){

    const purchases =
        suppliers.reduce(function(total,supplier){

            return total +
                Number(
                    supplier.purchases ||
                    0
                );

        },0);


    const paid =
        suppliers.reduce(function(total,supplier){

            return total +
                Number(
                    supplier.paid ||
                    0
                );

        },0);


    setText(
        "supplierCount",
        suppliers.length
    );


    setText(
        "totalPurchases",
        formatMoney(
            purchases
        )
    );


    setText(
        "totalPaid",
        formatMoney(
            paid
        )
    );


    setText(
        "totalDue",
        formatMoney(
            Math.max(
                purchases -
                paid,
                0
            )
        )
    );

}


function updateInvoiceStats(){

    setText(
        "invoiceCount",
        invoices.length
    );


    setText(
        "invoiceTotalHT",
        formatMoney(

            invoices.reduce(function(total,invoice){

                return total +
                    Number(
                        invoice.totalHT ||
                        0
                    );

            },0)

        )
    );


    setText(
        "invoiceTotalTVA",
        formatMoney(

            invoices.reduce(function(total,invoice){

                return total +
                    Number(
                        invoice.tva ||
                        0
                    );

            },0)

        )
    );


    setText(
        "invoiceTotalTTC",
        formatMoney(

            invoices.reduce(function(total,invoice){

                return total +
                    Number(
                        invoice.totalTTC ||
                        0
                    );

            },0)

        )
    );

}


/* =========================================================
   MODALS
========================================================= */

function openModal(id){

    document
        .getElementById(
            id
        )
        ?.classList.add(
            "active"
        );

}


function closeModal(id){

    document
        .getElementById(
            id
        )
        ?.classList.remove(
            "active"
        );

}


/* =========================================================
   GENERIC HELPERS
========================================================= */

function createId(){

    return Date.now()
        +
        Math.floor(
            Math.random() *
            1000000
        );

}


function getValue(id){

    return String(
        document
        .getElementById(
            id
        )
        ?.value
        ??
        ""
    );

}


function setValue(
    id,
    value
){

    const element =
        document.getElementById(
            id
        );


    if(element){

        element.value =
            value;

    }

}


function setText(
    id,
    value
){

    const element =
        document.getElementById(
            id
        );


    if(element){

        element.textContent =
            value;

    }

}


function formatMoney(value){

    return Number(
        value ||
        0
    )
    .toLocaleString(
        "fr-FR",
        {

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

        }
    )
    +
    " DH";

}


function formatNumber(value){

    return Number(
        value ||
        0
    )
    .toLocaleString(
        "fr-FR",
        {

            maximumFractionDigits:
                4

        }
    );

}


function formatDate(value){

    if(!value){

        return "-";

    }


    const date =
        new Date(
            value
        );


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return value;

    }


    return date.toLocaleDateString(
        "fr-FR"
    );

}


function parseNumber(value){

    let text =
        String(
            value ??
            ""
        )
        .trim()
        .replace(
            /%/g,
            ""
        )
        .replace(
            /\s/g,
            ""
        );


    if(
        text.includes(
            "."
        )
        &&
        text.includes(
            ","
        )
    ){

        if(
            text.lastIndexOf(
                ","
            )
            >
            text.lastIndexOf(
                "."
            )
        ){

            text =
                text
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

        }
        else{

            text =
                text.replace(
                    /,/g,
                    ""
                );

        }

    }
    else{

        text =
            text.replace(
                ",",
                "."
            );

    }


    return Number(
        text.replace(
            /[^0-9.-]/g,
            ""
        )
    )
    ||
    0;

}


function normalizeOCRText(text){

    return String(
        text ||
        ""
    )
    .replace(
        /\r/g,
        ""
    )
    .replace(
        /\u00A0/g,
        " "
    );

}


function normalizeText(value){

    return String(
        value ||
        ""
    )
    .normalize(
        "NFD"
    )
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .toLowerCase()
    .replace(
        /\|/g,
        " "
    )
    .replace(
        /\s+/g,
        " "
    )
    .trim();

}


function getCleanLines(text){

    return String(
        text ||
        ""
    )
    .split(
        "\n"
    )
    .map(function(line){

        return line
            .replace(
                /\|/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    })
    .filter(Boolean);

}


function convertDateToInput(value){

    const parts =
        String(
            value ||
            ""
        )
        .split(
            /[\/.-]/
        );


    if(
        parts.length !==
        3
    ){

        return "";

    }


    return (

        parts[2]

        +

        "-"

        +

        parts[1]
        .padStart(
            2,
            "0"
        )

        +

        "-"

        +

        parts[0]
        .padStart(
            2,
            "0"
        )

    );

}


function roundMoney(value){

    return Math.round(
        Number(
            value ||
            0
        )
        *
        100
    )
    /
    100;

}


function escapeHTML(value){

    return String(
        value ??
        ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


function sleep(ms){

    return new Promise(function(resolve){

        setTimeout(
            resolve,
            ms
        );

    });

}


/* =========================================================
   PROGRESS
========================================================= */

function showPDFTextProgress(
    message,
    percent
){

    const preview =
        document.getElementById(
            "scanPreview"
        );


    if(!preview){

        return;

    }


    preview.innerHTML = `

        <div class="scan-loading">

            <div style="font-size:45px;">
                📄
            </div>

            <h3>
                ${escapeHTML(message)}
            </h3>

            <p>
                ${percent}%
            </p>

            <progress
                value="${percent}"
                max="100"
            ></progress>

        </div>

    `;

}

/* =========================================================
   PAUSE & PLATE — UNIFIED MANAGEMENT EXTENSION
   Fournisseurs + Règlements + Grand Livre
   Clients + Règlements + Grand Livre
   Stock filter + fiche de stock
   TVA historique article
========================================================= */

const PP_EXTRA_KEYS = {
    supplierPayments: "pause_plate_supplier_payments",
    clients: "pause_plate_clients",
    clientInvoices: "pause_plate_client_invoices",
    clientPayments: "pause_plate_client_payments",
    sales: "pause_plate_sales",
    expenses: "pause_plate_expenses",
    recipes: "pause_plate_recipes",
    dailySalesScans: "pause_plate_daily_sales_scans"
};

let supplierPaymentsPP = loadStorage(PP_EXTRA_KEYS.supplierPayments, []);
let clientsPP = loadStorage(PP_EXTRA_KEYS.clients, []);
let clientInvoicesPP = loadStorage(PP_EXTRA_KEYS.clientInvoices, []);
let clientPaymentsPP = loadStorage(PP_EXTRA_KEYS.clientPayments, []);
let salesPP = loadStorage(PP_EXTRA_KEYS.sales, []);
let expensesPP = loadStorage(PP_EXTRA_KEYS.expenses, []);
let recipesPP = loadStorage(PP_EXTRA_KEYS.recipes, []);
let dailySalesScansPP = loadStorage(PP_EXTRA_KEYS.dailySalesScans, []);

supplierPaymentsPP = Array.isArray(supplierPaymentsPP) ? supplierPaymentsPP : [];
clientsPP = Array.isArray(clientsPP) ? clientsPP : [];
clientInvoicesPP = Array.isArray(clientInvoicesPP) ? clientInvoicesPP : [];
clientPaymentsPP = Array.isArray(clientPaymentsPP) ? clientPaymentsPP : [];
salesPP = Array.isArray(salesPP) ? salesPP : [];
salesPP = salesPP.map(s => ({...s, totalTTC:Number(s.totalTTC ?? 0), items:Array.isArray(s.items)?s.items:[]}));
expensesPP = Array.isArray(expensesPP) ? expensesPP : [];
expensesPP = expensesPP.map(e => {
    const totalTTC = Number(e.totalTTC ?? e.amount ?? 0);
    const vatRate = Number(e.vatRate ?? 0);
    const totalHT = Number(e.totalHT ?? (vatRate > 0 ? totalTTC / (1 + vatRate / 100) : totalTTC));
    const vatAmount = Number(e.vatAmount ?? Math.max(totalTTC - totalHT, 0));
    return {
        ...e,
        amount: totalTTC,
        totalHT,
        vatRate,
        vatAmount,
        totalTTC,
        paymentDate: e.paymentDate ?? e.date ?? "",
        ice: String(e.ice ?? "")
    };
});
recipesPP = Array.isArray(recipesPP) ? recipesPP : [];
recipesPP = recipesPP.map(r=>({...r,ingredients:Array.isArray(r.ingredients)?r.ingredients:[],salePrice:Number(r.salePrice||0)}));
dailySalesScansPP = Array.isArray(dailySalesScansPP) ? dailySalesScansPP : [];


clientsPP = clientsPP.map(c => ({
    id: c.id ?? createId(),
    name: String(c.name ?? ""),
    phone: String(c.phone ?? ""),
    email: String(c.email ?? ""),
    ice: String(c.ice ?? ""),
    address: String(c.address ?? "")
}));

clientInvoicesPP = clientInvoicesPP.map(inv => ({
    ...inv,
    totalTTC: Number(inv.totalTTC ?? 0),
    paid: Number(inv.paid ?? 0),
    due: Number(inv.due ?? Math.max(Number(inv.totalTTC ?? 0)-Number(inv.paid ?? 0),0))
}));

supplierPaymentsPP = supplierPaymentsPP.map(p => ({...p, amount:Number(p.amount ?? 0), allocations:Array.isArray(p.allocations)?p.allocations:[]}));
clientPaymentsPP = clientPaymentsPP.map(p => ({...p, amount:Number(p.amount ?? 0), allocations:Array.isArray(p.allocations)?p.allocations:[]}));

// Recover the latest REAL purchase VAT for every existing product from invoice history.
// Important: a 0% created by an OCR fallback must not block a known historical TVA.
products.forEach(function(product){
    const historicalVat = findLastPurchaseVatForProduct(product.id, product.name);
    if(historicalVat.found){
        product.lastPurchaseTVA = historicalVat.rate;
        product.lastPurchaseTVAKnown = true;
    } else if(!Number.isFinite(Number(product.lastPurchaseTVA))){
        product.lastPurchaseTVA = 0;
        product.lastPurchaseTVAKnown = false;
    }
});

function saveData(){
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(movements));
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
    localStorage.setItem(PP_EXTRA_KEYS.supplierPayments, JSON.stringify(supplierPaymentsPP));
    localStorage.setItem(PP_EXTRA_KEYS.clients, JSON.stringify(clientsPP));
    localStorage.setItem(PP_EXTRA_KEYS.clientInvoices, JSON.stringify(clientInvoicesPP));
    localStorage.setItem(PP_EXTRA_KEYS.clientPayments, JSON.stringify(clientPaymentsPP));
    localStorage.setItem(PP_EXTRA_KEYS.sales, JSON.stringify(salesPP));
    localStorage.setItem(PP_EXTRA_KEYS.expenses, JSON.stringify(expensesPP));
    localStorage.setItem(PP_EXTRA_KEYS.recipes, JSON.stringify(recipesPP));
    localStorage.setItem(PP_EXTRA_KEYS.dailySalesScans, JSON.stringify(dailySalesScansPP));
}

function renderAll(){
    ensurePPExtraUI();
    renderProducts();
    renderMovements();
    renderSuppliers();
    ensureSupplierSubmenuPP();
    renderSupplierPaymentsPP();
    renderInvoices();
    renderClientsPP();
    ensureClientSubmenuPP();
    renderClientPaymentsPP();
    updateDashboard();
    updateStockStats();
    updateSupplierStats();
    updateInvoiceStats();
    renderTVAAchatsPP();
    renderTVACollecteePP();
    renderTVASituationPP();
    showTVASubmodulePP(ppActiveTVAModule);
    renderSalesPP();
    renderExpensesPP();
    renderRecipesPP();
}

function ensurePPExtraUI(){
    ensureStockToolsPP();
    ensureSupplierPaymentModalPP();
    ensureClientsModulePP();
    ensureClientModalsPP();
}

// Firebase bootstrap handles initial rendering after authentication.

/* ======================== TVA HISTORIQUE ======================== */
function findLastPurchaseVatForProduct(productId, productName){
    const sorted = [...invoices].sort((a,b)=>{
        const db = new Date(b.date || b.createdAt || 0).getTime() || 0;
        const da = new Date(a.date || a.createdAt || 0).getTime() || 0;
        return db - da;
    });

    const wantedName = normalizeText(productName || "");
    let legacyZeroCandidate = false;

    for(const inv of sorted){
        const matchingLines = (inv.lines || []).filter(function(line){
            const sameId = productId && line.productId && Number(line.productId) === Number(productId);
            const sameName = wantedName && normalizeText(line.name || "") === wantedName;
            return sameId || sameName;
        });

        for(const line of matchingLines){
            const rate = Number(line.vatRate);
            if(!Number.isFinite(rate)) continue;

            // New invoices: vatKnown/vatSource tells us whether 0% was genuinely chosen/detected.
            if(line.vatKnown === true || ["manual","ocrLine","history","invoiceFallback"].includes(line.vatSource)){
                return {found:true, rate};
            }

            // Old invoices: a positive VAT rate is unambiguous.
            if(rate > 0){
                return {found:true, rate};
            }

            if(rate === 0){
                const invHT = Number(inv.totalHT || 0);
                const invTVA = Number(inv.tva || 0);
                const invTTC = Number(inv.totalTTC || 0);

                // Invoice entirely at 0%: this 0% is certain.
                if(Math.abs(invTVA) < 0.005 && (invHT <= 0 || invTTC <= 0 || Math.abs(invTTC - invHT) < 0.01)){
                    return {found:true, rate:0};
                }

                // Legacy data did not store vatKnown. Keep the 0% as a candidate,
                // but continue searching older invoices first. If we find a 7/10/14/20 later,
                // that positive historical rate wins. If this article has only 0% history,
                // the legacy 0% is considered its real purchase VAT.
                legacyZeroCandidate = true;
            }
        }
    }

    if(legacyZeroCandidate){
        return {found:true, rate:0};
    }

    return {found:false, rate:0};
}

function getPurchaseVatInfoForProduct(product){
    if(!product) return {found:false, rate:0};

    const historical = findLastPurchaseVatForProduct(product.id, product.name);
    if(historical.found){
        product.lastPurchaseTVA = historical.rate;
        product.lastPurchaseTVAKnown = true;
        return historical;
    }

    const cached = Number(product.lastPurchaseTVA);
    if(product.lastPurchaseTVAKnown === true && Number.isFinite(cached)){
        return {found:true, rate:cached};
    }

    return {found:false, rate:0};
}

function getPurchaseVatForProduct(product){
    const info = getPurchaseVatInfoForProduct(product);
    return info.found ? info.rate : null;
}

function markInvoiceVatManual(select){
    const line = select?.closest?.(".invoice-line");
    if(!line) return;
    line.dataset.vatKnown = "1";
    line.dataset.vatSource = "manual";
}

function handleInvoiceProductChange(select){
    const line=select.closest(".invoice-line"); if(!line)return;
    const product=products.find(item=>Number(item.id)===Number(select.value)); if(!product)return;
    const name=line.querySelector(".invoice-new-product"); if(name)name.value=product.name;
    const cat=line.querySelector(".invoice-category"); if(cat)cat.value=product.category;
    const unit=line.querySelector(".invoice-unit"); if(unit)unit.value=product.unit;
    const price=line.querySelector(".invoice-price"); if(price)price.value=Number(product.price||0);
    const vat=line.querySelector(".invoice-vat");
    if(vat){
        const hist = getPurchaseVatInfoForProduct(product);
        if(hist.found && [...vat.options].some(o=>Number(o.value)===Number(hist.rate))){
            vat.value=String(hist.rate);
            line.dataset.vatKnown="1";
            line.dataset.vatSource="history";
        }
    }
    updateInvoiceTotals();
}

function useScannedInvoiceData(){
    if(!scannedInvoiceData)return;
    const data=scannedInvoiceData;
    const supported=[0,7,10,14,20];
    let defaultVat=0;
    if(Number(data.totalHT)>0 && Number(data.tvaAmount)>=0){
        const eff=Number(data.tvaAmount)/Number(data.totalHT)*100;
        const nearest=supported.reduce((best,r)=>Math.abs(r-eff)<Math.abs(best-eff)?r:best,supported[0]);
        if(Math.abs(nearest-eff)<=0.75)defaultVat=nearest;
    }
    if(!defaultVat && Array.isArray(data.vatSummary)){
        const rates=[...new Set(data.vatSummary.map(x=>Number(x.rate)).filter(r=>supported.includes(r)))];
        if(rates.length===1)defaultVat=rates[0];
    }
    closeModal("scanModal"); openInvoiceModal();
    if(data.number)setValue("invoiceNumber",data.number);
    if(data.date){const d=convertDateToInput(data.date);if(d)setValue("invoiceDate",d);}
    if(data.supplier)setValue("invoiceSupplier",data.supplier.id);
    if(data.products?.length){
        const c=document.getElementById("invoiceLines"); if(c)c.innerHTML="";
        data.products.forEach(function(item){
            const cleanedName=cleanProductName(item.name);
            const existing=findProductByName(cleanedName);
            let vatRate=Number(item.vatRate||0);
            let vatKnown=Boolean(item.vatDetected);
            let vatSource=vatKnown?"ocrLine":"";

            // Priority: TVA explicitly detected on this row -> latest known purchase TVA for this article
            // (including a genuine 0%) -> invoice-level fallback.
            if(!vatKnown && existing){
                const hist=getPurchaseVatInfoForProduct(existing);
                if(hist.found){
                    vatRate=hist.rate;
                    vatKnown=true;
                    vatSource="history";
                }
            }
            if(!vatKnown){
                vatRate=defaultVat;
                vatKnown=true;
                vatSource="invoiceFallback";
            }
            addInvoiceLine({
                productId:existing?existing.id:null,
                name:existing?existing.name:cleanedName,
                category:existing?existing.category:item.category,
                unit:existing?existing.unit:item.unit,
                quantity:item.quantity,
                price:item.price,
                vatRate,
                vatKnown,
                vatSource
            });
        });
    }
    updateInvoiceTotals();
}

function applyInvoiceEffects(invoice){
    const supplier=suppliers.find(s=>Number(s.id)===Number(invoice.supplierId));
    if(supplier){supplier.purchases=Number(supplier.purchases||0)+Number(invoice.totalTTC||0);supplier.paid=Number(supplier.paid||0)+Number(invoice.paid||0);}
    (invoice.lines||[]).forEach(line=>{
        let product=line.productId?products.find(p=>Number(p.id)===Number(line.productId)):findProductByName(line.name);
        if(!product){
            product={id:createId(),name:cleanProductName(line.name),category:line.category||'Autre',unit:line.unit||'pièce',stock:0,minStock:0,price:Number(line.price||0),lastPurchaseTVA:Number(line.vatRate||0),lastPurchaseTVAKnown:Boolean(line.vatKnown),createdAt:new Date().toISOString()};
            products.push(product); line.productId=product.id;
        }
        // Update the product VAT only when the line's VAT is genuinely known.
        // A known 0% is valid and must be remembered just like 10% or 20%.
        if(line.vatKnown === true || Number(line.vatRate)>0){
            product.lastPurchaseTVA=Number(line.vatRate||0);
            product.lastPurchaseTVAKnown=true;
        }
        const oldStock=Number(product.stock||0), oldPrice=Number(product.price||0), qty=Number(line.quantity||0), newStock=oldStock+qty;
        if(newStock>0)product.price=((oldStock*oldPrice)+(qty*Number(line.price||0)))/newStock;
        product.stock=newStock;
        movements.unshift({id:createId(),date:new Date().toISOString(),productId:product.id,productName:product.name,type:'entry',quantity:qty,unit:product.unit,reason:'Achat - Facture '+invoice.number,note:'Entrée automatique via facture fournisseur',invoiceId:invoice.id});
    });
}

/* ======================== STOCK ======================== */
function ensureStockToolsPP(){
    const tableBody=document.getElementById("movementsTable"); if(!tableBody)return;
    const table=tableBody.closest("table"); if(!table || document.getElementById("ppStockTools"))return;
    const box=document.createElement("div"); box.id="ppStockTools";
    box.style.cssText="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:12px 0;padding:12px;border:1px solid #e2e8e4;border-radius:12px;background:#fff";
    box.innerHTML=`<div style="min-width:240px"><label style="display:block;font-weight:700;margin-bottom:5px">Filtrer par article</label><select id="ppStockProductFilter" onchange="renderMovements()" style="width:100%;padding:9px"><option value="">Tous les articles</option></select></div><div id="ppStockSelectedInfo" style="font-weight:700;min-width:210px"></div><button type="button" class="btn print" onclick="printStockCardPP()">🖨️ Imprimer fiche de stock</button>`;
    table.parentNode.insertBefore(box,table);
}

function refreshStockFilterOptionsPP(){
    const sel=document.getElementById("ppStockProductFilter"); if(!sel)return;
    const current=sel.value;
    sel.innerHTML='<option value="">Tous les articles</option>'+products.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
    if([...sel.options].some(o=>o.value===current))sel.value=current;
}

function movementBalancesPP(){
    const result=new Map();
    products.forEach(p=>{
        let balance=Number(p.stock||0);
        const list=movements.filter(m=>Number(m.productId)===Number(p.id)).slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
        list.forEach(m=>{
            const after=balance;
            const before=m.type==='entry'?after-Number(m.quantity||0):after+Number(m.quantity||0);
            result.set(String(m.id),{before,after});
            balance=before;
        });
    });
    return result;
}

function renderMovements(){
    ensureStockToolsPP(); refreshStockFilterOptionsPP();
    const table=document.getElementById("movementsTable"); if(!table)return;
    const filter=Number(getValue("ppStockProductFilter"))||0;
    const balances=movementBalancesPP();
    const selected=filter?products.find(p=>Number(p.id)===filter):null;
    const info=document.getElementById("ppStockSelectedInfo");
    if(info)info.innerHTML=selected?`Stock actuel : <strong>${formatNumber(selected.stock)} ${escapeHTML(selected.unit)}</strong>`:'Stock actuel : —';
    const rows=movements.filter(m=>!filter||Number(m.productId)===filter);
    if(!rows.length){table.innerHTML='<tr><td colspan="8" class="empty">Aucun mouvement enregistré.</td></tr>';return;}
    table.innerHTML=rows.map(m=>{
        const b=balances.get(String(m.id))||{before:'-',after:'-'};
        const locked=!!m.invoiceId;
        return `<tr><td>${formatDate(m.date)}</td><td>${escapeHTML(m.productName)}</td><td><span class="status ${m.type==='entry'?'success':'danger'}">${m.type==='entry'?'Entrée':'Sortie'}</span></td><td>${formatNumber(m.quantity)} ${escapeHTML(m.unit||'')}</td><td>${typeof b.before==='number'?formatNumber(b.before):'-'}</td><td><strong>${typeof b.after==='number'?formatNumber(b.after):'-'}</strong></td><td>${escapeHTML(m.reason||'')}</td><td><div class="action-buttons"><button class="btn small view" onclick="viewMovement(${m.id})">👁️</button>${locked?'':`<button class="btn small edit" onclick="openMovementModal('${m.type}',${m.id})">✏️</button>`}<button class="btn small print" onclick="printMovement(${m.id})">🖨️</button>${locked?'':`<button class="btn small danger" onclick="deleteMovement(${m.id})">🗑️</button>`}</div></td></tr>`;
    }).join('');
}

function openMovementModal(type,id=null){
    if(id){const m=movements.find(x=>Number(x.id)===Number(id));if(m?.invoiceId){alert("Ce mouvement provient d'une facture. Modifiez la facture pour corriger le stock.");return;}}
    if(!products.length){alert("Ajoutez d'abord un produit.");return;}
    editingMovementId=id?Number(id):null;
    const form=document.getElementById("movementForm"); if(form)form.reset();
    const select=document.getElementById("movementProduct"); if(select)select.innerHTML='<option value="">Sélectionner un produit</option>'+products.map(p=>`<option value="${p.id}">${escapeHTML(p.name)} — ${formatNumber(p.stock)} ${escapeHTML(p.unit)}</option>`).join('');
    if(editingMovementId){const m=movements.find(x=>Number(x.id)===editingMovementId);if(!m)return;setValue("movementType",m.type);setValue("movementProduct",m.productId);setValue("movementQuantity",m.quantity);setValue("movementReason",m.reason);setValue("movementNote",m.note||"");setText("movementTitle","Modifier le mouvement");}
    else{setValue("movementType",type);setText("movementTitle",type==="entry"?"➕ Entrée Stock":"➖ Sortie Stock");}
    const q=document.getElementById("movementQuantity");if(q){q.step="0.000001";q.min="0.000001";}
    openModal("movementModal");
}

function deleteMovement(id){
    const m=movements.find(x=>Number(x.id)===Number(id)); if(!m)return;
    if(m.invoiceId){alert("Ce mouvement provient d'une facture. Supprimez ou modifiez la facture.");return;}
    if(!confirm("Supprimer ce mouvement ? Le stock sera corrigé automatiquement."))return;
    const p=products.find(x=>Number(x.id)===Number(m.productId)); if(p)p.stock+=m.type==='entry'?-Number(m.quantity):Number(m.quantity);
    movements=movements.filter(x=>Number(x.id)!==Number(id));saveData();renderAll();
}

function printStockCardPP(){
    const id=Number(getValue("ppStockProductFilter"));
    if(!id){alert("Sélectionnez d'abord un article pour imprimer sa fiche de stock.");return;}
    const p=products.find(x=>Number(x.id)===id);if(!p)return;
    const balances=movementBalancesPP();
    const list=movements.filter(m=>Number(m.productId)===id).slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const rows=list.map(m=>{const b=balances.get(String(m.id))||{};return `<tr><td>${formatDate(m.date)}</td><td>${m.type==='entry'?'Entrée':'Sortie'}</td><td>${formatNumber(m.quantity)} ${escapeHTML(m.unit||p.unit)}</td><td>${formatNumber(b.before||0)}</td><td>${formatNumber(b.after||0)}</td><td>${escapeHTML(m.reason||'')}</td></tr>`;}).join('');
    printDocument('Fiche de stock - '+p.name,`<div class="doc-head"><h1>Pause & Plate</h1><p>Fiche de stock</p></div><h2>${escapeHTML(p.name)}</h2><p><strong>Unité:</strong> ${escapeHTML(p.unit)} &nbsp; | &nbsp; <strong>Stock actuel:</strong> ${formatNumber(p.stock)} ${escapeHTML(p.unit)}</p><table><thead><tr><th>Date</th><th>Opération</th><th>Quantité</th><th>Stock avant</th><th>Stock après</th><th>Motif</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Aucun mouvement</td></tr>'}</tbody></table>`);
}

/* ======================== FOURNISSEURS ======================== */
function renderSuppliers(){
    const table=document.getElementById("suppliersTable"); if(!table)return;
    const search=normalizeText(getValue("supplierSearch"));
    const filtered=suppliers.filter(s=>normalizeText(s.name).includes(search)||normalizeText(s.phone).includes(search)||normalizeText(s.ice).includes(search));
    if(!filtered.length){table.innerHTML='<tr><td colspan="8" class="empty">Aucun fournisseur enregistré.</td></tr>';return;}
    table.innerHTML=filtered.map(s=>{
        const invs=invoices.filter(i=>Number(i.supplierId)===Number(s.id));
        const purchases=invs.length?invs.reduce((a,i)=>a+Number(i.totalTTC||0),0):Number(s.purchases||0);
        const paid=Math.max(Number(s.paid||0),invs.reduce((a,i)=>a+Number(i.paid||0),0));
        const due=Math.max(purchases-paid,0); let cls='success',txt='Soldé';
        if(due>0&&paid>0){cls='warning';txt='Partiellement payé';}else if(due>0){cls='danger';txt='Non payé';}
        return `<tr><td><strong>${escapeHTML(s.name)}</strong></td><td>${escapeHTML(s.phone||'-')}</td><td>${escapeHTML(s.ice||'-')}</td><td>${formatMoney(purchases)}</td><td>${formatMoney(paid)}</td><td>${formatMoney(due)}</td><td><span class="status ${cls}">${txt}</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewSupplierSituationPP(${s.id})" title="Situation & Grand Livre">📊</button><button class="btn small" onclick="openSupplierPaymentPP(${s.id})" title="Règlement">💰</button><button class="btn small edit" onclick="openSupplierModal(${s.id})">✏️</button><button class="btn small print" onclick="printSupplierSituationPP(${s.id})">🖨️</button><button class="btn small danger" onclick="deleteSupplier(${s.id})">🗑️</button></div></td></tr>`;
    }).join('');
}

function supplierInvoicesPP(id){return invoices.filter(i=>Number(i.supplierId)===Number(id));}
function paymentAllocatedToInvoicePP(invoiceId){return supplierPaymentsPP.reduce((t,p)=>t+(p.allocations||[]).filter(a=>Number(a.invoiceId)===Number(invoiceId)).reduce((x,a)=>x+Number(a.amount||0),0),0);}

function supplierLedgerPP(id){
    const s=suppliers.find(x=>Number(x.id)===Number(id)); if(!s)return [];
    const invs=supplierInvoicesPP(id); const events=[];
    invs.forEach(inv=>{
        events.push({date:inv.date||inv.createdAt,piece:inv.number||'',label:'Facture achat',debit:Number(inv.totalTTC||0),credit:0});
        const allocated=paymentAllocatedToInvoicePP(inv.id);
        const base=Math.max(Number(inv.paid||0)-allocated,0);
        if(base>0)events.push({date:inv.date||inv.createdAt,piece:inv.number||'',label:'Paiement saisi avec facture',debit:0,credit:base});
    });
    supplierPaymentsPP.filter(p=>Number(p.supplierId)===Number(id)).forEach(p=>events.push({date:p.date||p.createdAt,piece:p.reference||p.id,label:'Règlement '+(p.mode||''),debit:0,credit:Number(p.amount||0),paymentId:p.id}));
    const recordedUnallocated=supplierPaymentsPP.filter(p=>Number(p.supplierId)===Number(id)).reduce((sum,p)=>sum+Math.max(Number(p.amount||0)-(p.allocations||[]).reduce((a,x)=>a+Number(x.amount||0),0),0),0);
    const invPaid=invs.reduce((a,i)=>a+Number(i.paid||0),0);
    const opening=Math.max(Number(s.paid||0)-invPaid-recordedUnallocated,0);
    if(opening>0)events.push({date:'1900-01-01',piece:'SOLDE',label:'Solde / règlement antérieur',debit:0,credit:opening});
    events.sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    let balance=0;return events.map(e=>{balance+=e.debit-e.credit;return {...e,balance};});
}

function viewSupplierSituationPP(id){
    const s=suppliers.find(x=>Number(x.id)===Number(id));if(!s)return;
    const invs=supplierInvoicesPP(id);const purchases=invs.reduce((a,i)=>a+Number(i.totalTTC||0),0);const paid=Number(s.paid||0);const due=Math.max(purchases-paid,0);const advance=Math.max(paid-purchases,0);const ledger=supplierLedgerPP(id);
    const ledgerHtml=`<div style="overflow:auto;max-height:380px"><table style="width:100%;border-collapse:collapse"><thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead><tbody>${ledger.map(e=>`<tr><td>${e.date==='1900-01-01'?'-':formatDate(e.date)}</td><td>${escapeHTML(e.piece||'')}</td><td>${escapeHTML(e.label)}</td><td>${e.debit?formatMoney(e.debit):'-'}</td><td>${e.credit?formatMoney(e.credit):'-'}</td><td><strong>${formatMoney(e.balance)}</strong></td></tr>`).join('')||'<tr><td colspan="6">Aucune opération</td></tr>'}</tbody></table></div><div style="margin-top:12px"><button class="btn primary" onclick="closeModal('detailsModal');openSupplierPaymentPP(${s.id})">💰 Nouveau règlement</button></div>`;
    showDetailsModal('Situation fournisseur - '+s.name,[["Total achats",formatMoney(purchases)],["Total réglé",formatMoney(paid)],["Reste à payer",formatMoney(due)],["Avance",formatMoney(advance)],["Nombre de factures",String(invs.length)],["Grand Livre",ledgerHtml]],()=>printSupplierSituationPP(id),true);
}

function printSupplierSituationPP(id){
    const s=suppliers.find(x=>Number(x.id)===Number(id));if(!s)return;const invs=supplierInvoicesPP(id);const purchases=invs.reduce((a,i)=>a+Number(i.totalTTC||0),0);const paid=Number(s.paid||0),due=Math.max(purchases-paid,0),ledger=supplierLedgerPP(id);
    const rows=ledger.map(e=>`<tr><td>${e.date==='1900-01-01'?'-':formatDate(e.date)}</td><td>${escapeHTML(e.piece||'')}</td><td>${escapeHTML(e.label)}</td><td>${e.debit?formatMoney(e.debit):'-'}</td><td>${e.credit?formatMoney(e.credit):'-'}</td><td>${formatMoney(e.balance)}</td></tr>`).join('');
    printDocument('Situation fournisseur - '+s.name,`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation fournisseur & Grand Livre</p></div><h2>${escapeHTML(s.name)}</h2>${detailRowsHTML([["Téléphone",s.phone||'-'],["ICE",s.ice||'-'],["Total achats",formatMoney(purchases)],["Total réglé",formatMoney(paid)],["Reste à payer",formatMoney(due)]])}<h2>Grand Livre</h2><table><thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Aucune opération</td></tr>'}</tbody></table>`);
}

function viewSupplier(id){viewSupplierSituationPP(id);}
function printSupplier(id){printSupplierSituationPP(id);}

function ensureSupplierPaymentModalPP(){
    if(document.getElementById('ppSupplierPaymentModal'))return;
    const m=document.createElement('div');m.id='ppSupplierPaymentModal';m.className='modal-overlay';
    m.innerHTML=`<div class="modal"><div class="modal-header"><h2>💰 Règlement fournisseur</h2><button type="button" onclick="closeModal('ppSupplierPaymentModal')">×</button></div><form id="ppSupplierPaymentForm"><input type="hidden" id="ppSupplierPaymentId"><input type="hidden" id="ppSupplierPaymentSupplier"><div class="form-grid"><div><label>Fournisseur</label><input id="ppSupplierPaymentName" readonly></div><div><label>Date</label><input id="ppSupplierPaymentDate" type="date" required></div><div><label>Facture à affecter</label><select id="ppSupplierPaymentInvoice"></select></div><div><label>Montant</label><input id="ppSupplierPaymentAmount" type="number" min="0.01" step="0.01" required></div><div><label>Mode</label><select id="ppSupplierPaymentMode"><option>Espèces</option><option>Virement</option><option>Chèque</option><option>Carte</option><option>Autre</option></select></div><div><label>Référence</label><input id="ppSupplierPaymentRef" placeholder="N° chèque / virement..."></div></div><div><label>Observation</label><textarea id="ppSupplierPaymentNote"></textarea></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppSupplierPaymentModal')">Annuler</button><button type="submit" class="btn primary">Enregistrer</button></div></form></div>`;
    document.body.appendChild(m);document.getElementById('ppSupplierPaymentForm').addEventListener('submit',e=>{e.preventDefault();saveSupplierPaymentPP();});
}

function rollbackSupplierPaymentPP(p){
    if(!p)return;
    (p.allocations||[]).forEach(a=>{
        const inv=invoices.find(i=>Number(i.id)===Number(a.invoiceId));
        if(inv){
            inv.paid=Math.max(Number(inv.paid||0)-Number(a.amount||0),0);
            inv.due=Math.max(Number(inv.totalTTC||0)-Number(inv.paid||0),0);
        }
    });
    const s=suppliers.find(x=>Number(x.id)===Number(p.supplierId));
    if(s)s.paid=Math.max(Number(s.paid||0)-Number(p.amount||0),0);
}

function openSupplierPaymentPP(id,paymentId=null){
    ensureSupplierPaymentModalPP();
    const p=paymentId?supplierPaymentsPP.find(x=>Number(x.id)===Number(paymentId)):null;
    const supplierId=p?Number(p.supplierId):Number(id);
    const s=suppliers.find(x=>Number(x.id)===supplierId);if(!s)return;

    setValue('ppSupplierPaymentId',p?.id||'');
    setValue('ppSupplierPaymentSupplier',s.id);
    setValue('ppSupplierPaymentName',s.name);
    setValue('ppSupplierPaymentDate',p?.date||new Date().toISOString().slice(0,10));
    setValue('ppSupplierPaymentAmount',p?.amount||'');
    setValue('ppSupplierPaymentMode',p?.mode||'Espèces');
    setValue('ppSupplierPaymentRef',p?.reference||'');
    setValue('ppSupplierPaymentNote',p?.note||'');

    // During editing, include the invoices already allocated to this payment.
    const allocatedIds=new Set((p?.allocations||[]).map(a=>Number(a.invoiceId)));
    const invs=supplierInvoicesPP(supplierId)
        .filter(i=>Number(i.due||0)>0||allocatedIds.has(Number(i.id)))
        .sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const sel=document.getElementById('ppSupplierPaymentInvoice');
    sel.innerHTML='<option value="">Affectation automatique — plus anciennes factures</option>'+invs.map(i=>`<option value="${i.id}">${escapeHTML(i.number)} — reste ${formatMoney(i.due)}</option>`).join('');
    if(p && (p.allocations||[]).length===1) setValue('ppSupplierPaymentInvoice',p.allocations[0].invoiceId);
    openModal('ppSupplierPaymentModal');
}

function saveSupplierPaymentPP(){
    const paymentId=Number(getValue('ppSupplierPaymentId'))||null;
    const supplierId=Number(getValue('ppSupplierPaymentSupplier')),amount=Number(getValue('ppSupplierPaymentAmount'));if(!(amount>0))return;
    const s=suppliers.find(x=>Number(x.id)===supplierId);if(!s)return;

    const old=paymentId?supplierPaymentsPP.find(x=>Number(x.id)===paymentId):null;
    if(old) rollbackSupplierPaymentPP(old);

    let remaining=amount;const allocations=[];const selected=Number(getValue('ppSupplierPaymentInvoice'))||0;
    let targets=selected?invoices.filter(i=>Number(i.id)===selected):supplierInvoicesPP(supplierId).filter(i=>Number(i.due||0)>0).sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    for(const inv of targets){
        if(remaining<=0)break;
        const due=Math.max(Number(inv.totalTTC||0)-Number(inv.paid||0),0);
        const part=Math.min(remaining,due);if(part<=0)continue;
        inv.paid=Number(inv.paid||0)+part;
        inv.due=Math.max(Number(inv.totalTTC||0)-Number(inv.paid||0),0);
        allocations.push({invoiceId:inv.id,amount:part});remaining-=part;
    }

    const obj={id:paymentId||createId(),supplierId,amount,date:getValue('ppSupplierPaymentDate'),mode:getValue('ppSupplierPaymentMode'),reference:getValue('ppSupplierPaymentRef').trim(),note:getValue('ppSupplierPaymentNote').trim(),allocations,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(paymentId){
        const n=supplierPaymentsPP.findIndex(x=>Number(x.id)===paymentId);
        if(n>=0)supplierPaymentsPP[n]=obj;
    }else supplierPaymentsPP.push(obj);
    s.paid=Number(s.paid||0)+amount;
    saveData();closeModal('ppSupplierPaymentModal');renderAll();renderPaymentsCenterPP();
}

function deleteSupplierPaymentPP(id){
    const p=supplierPaymentsPP.find(x=>Number(x.id)===Number(id));if(!p||!confirm('Supprimer ce règlement ?'))return;
    rollbackSupplierPaymentPP(p);
    supplierPaymentsPP=supplierPaymentsPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();renderPaymentsCenterPP();
}

/* ======================== CLIENTS ======================== */
function ensureClientsModulePP(){
    const page=document.getElementById('clientsPage');if(!page||document.getElementById('ppClientsModule'))return;
    const wrap=document.createElement('div');wrap.id='ppClientsModule';
    wrap.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin:15px 0"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="openClientModalPP()">➕ Nouveau client</button><button class="btn" onclick="openClientInvoicePP()">🧾 Nouvelle facture client</button></div><input id="ppClientSearch" placeholder="Rechercher un client..." oninput="renderClientsPP()" style="max-width:320px;padding:9px"></div><div style="overflow:auto"><table style="width:100%"><thead><tr><th>Client</th><th>Téléphone</th><th>ICE</th><th>Total facturé</th><th>Encaissé</th><th>Solde</th><th>Situation</th><th>Actions</th></tr></thead><tbody id="ppClientsTable"></tbody></table></div>`;
    page.appendChild(wrap);
}

function renderClientsPP(){
    ensureClientsModulePP();const t=document.getElementById('ppClientsTable');if(!t)return;const q=normalizeText(getValue('ppClientSearch'));
    const list=clientsPP.filter(c=>!q||normalizeText(c.name+' '+c.phone+' '+c.ice).includes(q));
    if(!list.length){t.innerHTML='<tr><td colspan="8" class="empty">Aucun client enregistré.</td></tr>';return;}
    t.innerHTML=list.map(c=>{const invs=clientInvoicesPP.filter(i=>Number(i.clientId)===Number(c.id));const total=invs.reduce((a,i)=>a+Number(i.totalTTC||0),0),paid=invs.reduce((a,i)=>a+Number(i.paid||0),0),due=Math.max(total-paid,0);let cls=due?'danger':'success',txt=due?'Débiteur':'Soldé';return `<tr><td><strong>${escapeHTML(c.name)}</strong></td><td>${escapeHTML(c.phone||'-')}</td><td>${escapeHTML(c.ice||'-')}</td><td>${formatMoney(total)}</td><td>${formatMoney(paid)}</td><td>${formatMoney(due)}</td><td><span class="status ${cls}">${txt}</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewClientSituationPP(${c.id})">📊</button><button class="btn small" onclick="openClientPaymentPP(${c.id})">💰</button><button class="btn small edit" onclick="openClientModalPP(${c.id})">✏️</button><button class="btn small print" onclick="printClientSituationPP(${c.id})">🖨️</button><button class="btn small danger" onclick="deleteClientPP(${c.id})">🗑️</button></div></td></tr>`;}).join('');
}

function ensureClientModalsPP(){
    if(!document.getElementById('ppClientModal')){const m=document.createElement('div');m.id='ppClientModal';m.className='modal-overlay';m.innerHTML=`<div class="modal"><div class="modal-header"><h2 id="ppClientModalTitle">Client</h2><button onclick="closeModal('ppClientModal')">×</button></div><form id="ppClientForm"><input type="hidden" id="ppClientId"><div class="form-grid"><div><label>Nom</label><input id="ppClientName" required></div><div><label>Téléphone</label><input id="ppClientPhone"></div><div><label>Email</label><input id="ppClientEmail" type="email"></div><div><label>ICE</label><input id="ppClientIce"></div></div><div><label>Adresse</label><textarea id="ppClientAddress"></textarea></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppClientModal')">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form></div>`;document.body.appendChild(m);document.getElementById('ppClientForm').addEventListener('submit',e=>{e.preventDefault();saveClientPP();});}
    if(!document.getElementById('ppClientInvoiceModal')){const m=document.createElement('div');m.id='ppClientInvoiceModal';m.className='modal-overlay';m.innerHTML=`<div class="modal"><div class="modal-header"><h2>🧾 Facture client</h2><button onclick="closeModal('ppClientInvoiceModal')">×</button></div><form id="ppClientInvoiceForm"><input type="hidden" id="ppClientInvoiceId"><div class="form-grid"><div><label>Client</label><select id="ppClientInvoiceClient" required></select></div><div><label>N° facture</label><input id="ppClientInvoiceNumber" required></div><div><label>Date</label><input id="ppClientInvoiceDate" type="date" required></div><div><label>Total TTC</label><input id="ppClientInvoiceTotal" type="number" min="0" step="0.01" required></div><div><label>Payé à la facture</label><input id="ppClientInvoicePaid" type="number" min="0" step="0.01" value="0"></div><div><label>Libellé</label><input id="ppClientInvoiceLabel"></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppClientInvoiceModal')">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form></div>`;document.body.appendChild(m);document.getElementById('ppClientInvoiceForm').addEventListener('submit',e=>{e.preventDefault();saveClientInvoicePP();});}
    if(!document.getElementById('ppClientPaymentModal')){const m=document.createElement('div');m.id='ppClientPaymentModal';m.className='modal-overlay';m.innerHTML=`<div class="modal"><div class="modal-header"><h2>💰 Encaissement client</h2><button onclick="closeModal('ppClientPaymentModal')">×</button></div><form id="ppClientPaymentForm"><input type="hidden" id="ppClientPaymentId"><input type="hidden" id="ppClientPaymentClient"><div class="form-grid"><div><label>Client</label><input id="ppClientPaymentName" readonly></div><div><label>Date</label><input id="ppClientPaymentDate" type="date" required></div><div><label>Facture à affecter</label><select id="ppClientPaymentInvoice"></select></div><div><label>Montant</label><input id="ppClientPaymentAmount" type="number" min="0.01" step="0.01" required></div><div><label>Mode</label><select id="ppClientPaymentMode"><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div><div><label>Référence</label><input id="ppClientPaymentRef"></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppClientPaymentModal')">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div></form></div>`;document.body.appendChild(m);document.getElementById('ppClientPaymentForm').addEventListener('submit',e=>{e.preventDefault();saveClientPaymentPP();});}
}

function openClientModalPP(id=null){ensureClientModalsPP();const c=id?clientsPP.find(x=>Number(x.id)===Number(id)):null;setValue('ppClientId',c?.id||'');setValue('ppClientName',c?.name||'');setValue('ppClientPhone',c?.phone||'');setValue('ppClientEmail',c?.email||'');setValue('ppClientIce',c?.ice||'');setValue('ppClientAddress',c?.address||'');setText('ppClientModalTitle',c?'Modifier le client':'Nouveau client');openModal('ppClientModal');}
function saveClientPP(){const id=Number(getValue('ppClientId'))||null,name=getValue('ppClientName').trim();if(!name)return;const data={name,phone:getValue('ppClientPhone').trim(),email:getValue('ppClientEmail').trim(),ice:getValue('ppClientIce').trim(),address:getValue('ppClientAddress').trim()};if(id){const c=clientsPP.find(x=>Number(x.id)===id);if(c)Object.assign(c,data);clientInvoicesPP.forEach(i=>{if(Number(i.clientId)===id)i.clientName=name;});}else clientsPP.push({id:createId(),...data});saveData();closeModal('ppClientModal');renderAll();}
function deleteClientPP(id){if(clientInvoicesPP.some(i=>Number(i.clientId)===Number(id))){alert('Impossible de supprimer ce client car il possède des factures.');return;}if(!confirm('Supprimer ce client ?'))return;clientsPP=clientsPP.filter(x=>Number(x.id)!==Number(id));saveData();renderAll();}
function openClientInvoicePP(id=null){ensureClientModalsPP();if(!clientsPP.length){alert("Ajoutez d'abord un client.");return;}const inv=id?clientInvoicesPP.find(x=>Number(x.id)===Number(id)):null;const s=document.getElementById('ppClientInvoiceClient');s.innerHTML='<option value="">Sélectionner</option>'+clientsPP.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');setValue('ppClientInvoiceId',inv?.id||'');setValue('ppClientInvoiceClient',inv?.clientId||'');setValue('ppClientInvoiceNumber',inv?.number||'');setValue('ppClientInvoiceDate',inv?.date||new Date().toISOString().slice(0,10));setValue('ppClientInvoiceTotal',inv?.totalTTC||'');setValue('ppClientInvoicePaid',inv?.paid||0);setValue('ppClientInvoiceLabel',inv?.label||'');openModal('ppClientInvoiceModal');}
function saveClientInvoicePP(){const id=Number(getValue('ppClientInvoiceId'))||null,clientId=Number(getValue('ppClientInvoiceClient')),c=clientsPP.find(x=>Number(x.id)===clientId);if(!c)return;const total=Number(getValue('ppClientInvoiceTotal')||0),paid=Math.min(Number(getValue('ppClientInvoicePaid')||0),total);const obj={id:id||createId(),clientId,clientName:c.name,number:getValue('ppClientInvoiceNumber').trim(),date:getValue('ppClientInvoiceDate'),label:getValue('ppClientInvoiceLabel').trim(),totalTTC:total,paid,due:Math.max(total-paid,0),createdAt:new Date().toISOString()};if(id){const n=clientInvoicesPP.findIndex(x=>Number(x.id)===id);if(n>=0)clientInvoicesPP[n]=obj;}else clientInvoicesPP.unshift(obj);saveData();closeModal('ppClientInvoiceModal');renderAll();}
function rollbackClientPaymentPP(p){
    if(!p)return;
    (p.allocations||[]).forEach(a=>{
        const inv=clientInvoicesPP.find(i=>Number(i.id)===Number(a.invoiceId));
        if(inv){
            inv.paid=Math.max(Number(inv.paid||0)-Number(a.amount||0),0);
            inv.due=Math.max(Number(inv.totalTTC||0)-Number(inv.paid||0),0);
        }
    });
}

function openClientPaymentPP(id,paymentId=null){
    ensureClientModalsPP();
    const p=paymentId?clientPaymentsPP.find(x=>Number(x.id)===Number(paymentId)):null;
    const clientId=p?Number(p.clientId):Number(id);
    const c=clientsPP.find(x=>Number(x.id)===clientId);if(!c)return;
    setValue('ppClientPaymentId',p?.id||'');
    setValue('ppClientPaymentClient',c.id);setValue('ppClientPaymentName',c.name);
    setValue('ppClientPaymentDate',p?.date||new Date().toISOString().slice(0,10));
    setValue('ppClientPaymentAmount',p?.amount||'');
    setValue('ppClientPaymentMode',p?.mode||'Espèces');
    setValue('ppClientPaymentRef',p?.reference||'');
    const allocatedIds=new Set((p?.allocations||[]).map(a=>Number(a.invoiceId)));
    const invs=clientInvoicesPP.filter(i=>Number(i.clientId)===clientId&&(Number(i.due)>0||allocatedIds.has(Number(i.id)))).sort((a,b)=>new Date(a.date)-new Date(b.date));
    document.getElementById('ppClientPaymentInvoice').innerHTML='<option value="">Affectation automatique — plus anciennes factures</option>'+invs.map(i=>`<option value="${i.id}">${escapeHTML(i.number)} — reste ${formatMoney(i.due)}</option>`).join('');
    if(p && (p.allocations||[]).length===1)setValue('ppClientPaymentInvoice',p.allocations[0].invoiceId);
    openModal('ppClientPaymentModal');
}

function saveClientPaymentPP(){
    const paymentId=Number(getValue('ppClientPaymentId'))||null;
    const clientId=Number(getValue('ppClientPaymentClient')),amount=Number(getValue('ppClientPaymentAmount'));if(!(amount>0))return;
    const old=paymentId?clientPaymentsPP.find(x=>Number(x.id)===paymentId):null;
    if(old)rollbackClientPaymentPP(old);

    let rem=amount;const allocations=[];const selected=Number(getValue('ppClientPaymentInvoice'))||0;
    const targets=selected?clientInvoicesPP.filter(i=>Number(i.id)===selected):clientInvoicesPP.filter(i=>Number(i.clientId)===clientId&&Number(i.due)>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
    for(const inv of targets){if(rem<=0)break;const part=Math.min(rem,Number(inv.due||0));if(part<=0)continue;inv.paid=Number(inv.paid||0)+part;inv.due=Math.max(Number(inv.totalTTC||0)-Number(inv.paid||0),0);allocations.push({invoiceId:inv.id,amount:part});rem-=part;}
    const obj={id:paymentId||createId(),clientId,amount,date:getValue('ppClientPaymentDate'),mode:getValue('ppClientPaymentMode'),reference:getValue('ppClientPaymentRef').trim(),allocations,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(paymentId){const n=clientPaymentsPP.findIndex(x=>Number(x.id)===paymentId);if(n>=0)clientPaymentsPP[n]=obj;}else clientPaymentsPP.push(obj);
    saveData();closeModal('ppClientPaymentModal');renderAll();renderPaymentsCenterPP();
}

function deleteClientPaymentPP(id){
    const p=clientPaymentsPP.find(x=>Number(x.id)===Number(id));if(!p||!confirm('Supprimer cet encaissement ?'))return;
    rollbackClientPaymentPP(p);
    clientPaymentsPP=clientPaymentsPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();renderPaymentsCenterPP();
}

function clientLedgerPP(id){const events=[];const invs=clientInvoicesPP.filter(i=>Number(i.clientId)===Number(id));invs.forEach(inv=>{events.push({date:inv.date,piece:inv.number,label:inv.label||'Facture client',debit:Number(inv.totalTTC||0),credit:0});const alloc=clientPaymentsPP.reduce((t,p)=>t+(p.allocations||[]).filter(a=>Number(a.invoiceId)===Number(inv.id)).reduce((x,a)=>x+Number(a.amount||0),0),0);const base=Math.max(Number(inv.paid||0)-alloc,0);if(base>0)events.push({date:inv.date,piece:inv.number,label:'Encaissement saisi avec facture',debit:0,credit:base});});clientPaymentsPP.filter(p=>Number(p.clientId)===Number(id)).forEach(p=>events.push({date:p.date,piece:p.reference||p.id,label:'Encaissement '+(p.mode||''),debit:0,credit:Number(p.amount||0)}));events.sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));let bal=0;return events.map(e=>{bal+=e.debit-e.credit;return {...e,balance:bal};});}
function viewClientSituationPP(id){const c=clientsPP.find(x=>Number(x.id)===Number(id));if(!c)return;const invs=clientInvoicesPP.filter(i=>Number(i.clientId)===Number(id)),total=invs.reduce((a,i)=>a+Number(i.totalTTC||0),0),paid=invs.reduce((a,i)=>a+Number(i.paid||0),0),due=Math.max(total-paid,0),ledger=clientLedgerPP(id);const html=`<div style="overflow:auto;max-height:380px"><table style="width:100%"><thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead><tbody>${ledger.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${escapeHTML(e.piece||'')}</td><td>${escapeHTML(e.label)}</td><td>${e.debit?formatMoney(e.debit):'-'}</td><td>${e.credit?formatMoney(e.credit):'-'}</td><td><strong>${formatMoney(e.balance)}</strong></td></tr>`).join('')||'<tr><td colspan="6">Aucune opération</td></tr>'}</tbody></table></div><div style="margin-top:12px;display:flex;gap:8px"><button class="btn primary" onclick="closeModal('detailsModal');openClientPaymentPP(${id})">💰 Encaisser</button><button class="btn" onclick="closeModal('detailsModal');openClientInvoicePP()">🧾 Nouvelle facture</button></div>`;showDetailsModal('Situation client - '+c.name,[["Total facturé",formatMoney(total)],["Total encaissé",formatMoney(paid)],["Solde client",formatMoney(due)],["Nombre de factures",String(invs.length)],["Grand Livre",html]],()=>printClientSituationPP(id),true);}
function printClientSituationPP(id){const c=clientsPP.find(x=>Number(x.id)===Number(id));if(!c)return;const invs=clientInvoicesPP.filter(i=>Number(i.clientId)===Number(id)),total=invs.reduce((a,i)=>a+Number(i.totalTTC||0),0),paid=invs.reduce((a,i)=>a+Number(i.paid||0),0),due=Math.max(total-paid,0),ledger=clientLedgerPP(id);const rows=ledger.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${escapeHTML(e.piece||'')}</td><td>${escapeHTML(e.label)}</td><td>${e.debit?formatMoney(e.debit):'-'}</td><td>${e.credit?formatMoney(e.credit):'-'}</td><td>${formatMoney(e.balance)}</td></tr>`).join('');printDocument('Situation client - '+c.name,`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation client & Grand Livre</p></div><h2>${escapeHTML(c.name)}</h2>${detailRowsHTML([["Téléphone",c.phone||'-'],["ICE",c.ice||'-'],["Total facturé",formatMoney(total)],["Total encaissé",formatMoney(paid)],["Solde",formatMoney(due)]])}<h2>Grand Livre</h2><table><thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Aucune opération</td></tr>'}</tbody></table>`);}





/* =========================================================
   SOUS-MENU TVA & COMPTABILITÉ
========================================================= */

let ppActiveTVAModule = "deductible";

function ensureTVASubmenuPP(){
    const page=document.getElementById('accountingPage');
    if(!page) return;
    if(document.getElementById('ppTVASubmenu')) return;

    const nav=document.createElement('div');
    nav.id='ppTVASubmenu';
    nav.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:22px';
    nav.innerHTML=`
        <button id="ppTVATabDeductible" type="button" class="btn primary" onclick="showTVASubmodulePP('deductible')" style="padding:16px;text-align:left">
            <div style="font-size:17px;font-weight:800">TVA Déductible</div>
            <div style="font-size:12px;opacity:.8;margin-top:4px">Achats fournisseurs</div>
        </button>
        <button id="ppTVATabCollectee" type="button" class="btn" onclick="showTVASubmodulePP('collectee')" style="padding:16px;text-align:left">
            <div style="font-size:17px;font-weight:800">TVA Collectée</div>
            <div style="font-size:12px;opacity:.8;margin-top:4px">Ventes — taux 10%</div>
        </button>
        <button id="ppTVATabSituation" type="button" class="btn" onclick="showTVASubmodulePP('situation')" style="padding:16px;text-align:left">
            <div style="font-size:17px;font-weight:800">Situation TVA</div>
            <div style="font-size:12px;opacity:.8;margin-top:4px">TVA à payer / Crédit TVA</div>
        </button>`;
    page.prepend(nav);
}

function showTVASubmodulePP(name){
    ppActiveTVAModule=name;
    ensureTVASubmenuPP();

    const modules={
        deductible:document.getElementById('ppTVAAchatsModule'),
        collectee:document.getElementById('ppTVACollecteeModule'),
        situation:document.getElementById('ppTVASituationModule')
    };

    Object.entries(modules).forEach(([key,el])=>{
        if(el) el.style.display=key===name?'block':'none';
    });

    const tabs={
        deductible:document.getElementById('ppTVATabDeductible'),
        collectee:document.getElementById('ppTVATabCollectee'),
        situation:document.getElementById('ppTVATabSituation')
    };

    Object.entries(tabs).forEach(([key,btn])=>{
        if(!btn) return;
        btn.classList.toggle('primary',key===name);
    });

    if(name==='deductible') renderTVAAchatsPP();
    if(name==='collectee') renderTVACollecteePP();
    if(name==='situation') renderTVASituationPP();
}

/* =========================================================
   TVA DÉDUCTIBLE ACHATS — PAUSE & PLATE
   1 ligne par facture + taux; TVA 0% exclue
========================================================= */

function ensureTVAAchatsUIPP(){
    const page=document.getElementById('accountingPage');
    ensureTVASubmenuPP();
    if(!page) return;

    // Replace the previous TVA module if it already exists in the DOM.
    document.getElementById('ppTVAAchatsModule')?.remove();

    const wrap=document.createElement('div');
    wrap.id='ppTVAAchatsModule';
    wrap.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
            <div>
                <h2 style="margin:0 0 4px">Situation TVA déductible</h2>
                <p style="margin:0;color:#667085">TVA déductible selon la date de règlement. Les factures non réglées et les lignes à 0% sont exclues.</p>
            </div>
            <button type="button" class="btn print" onclick="printTVAAchatsPP()">🖨️ Imprimer la situation</button>
        </div>

        <div id="ppTVAFilters" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:16px">
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppTVAFrom" type="date" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"></div>
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppTVATo" type="date" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"></div>
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Fournisseur</label><select id="ppTVASupplier" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"><option value="">Tous</option></select></div>
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Taux TVA</label><select id="ppTVARate" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"><option value="">Tous</option><option value="7">7%</option><option value="10">10%</option><option value="14">14%</option><option value="20">20%</option></select></div>
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Nature fournisseur</label><select id="ppTVANature" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"><option value="">Toutes</option></select></div>
            <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode règlement</label><select id="ppTVAPaymentMode" onchange="renderTVAAchatsPP()" style="width:100%;padding:9px"><option value="">Tous</option></select></div>
            <div style="display:flex;align-items:end"><button type="button" class="btn" onclick="resetTVAFiltersPP()" style="width:100%">Réinitialiser</button></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
            <div class="stat-card" style="padding:16px"><div style="color:#667085">Base HT déductible</div><strong id="ppTVAHT" style="font-size:22px">0 DH</strong></div>
            <div class="stat-card" style="padding:16px"><div style="color:#667085">TVA déductible</div><strong id="ppTVADeductible" style="font-size:22px">0 DH</strong></div>
            <div class="stat-card" style="padding:16px"><div style="color:#667085">TTC déductible</div><strong id="ppTVATTC" style="font-size:22px">0 DH</strong></div>
            <div class="stat-card" style="padding:16px"><div style="color:#667085">Factures concernées</div><strong id="ppTVAInvoiceCount" style="font-size:22px">0</strong></div>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:16px;overflow:auto">
            <h3 style="margin-top:0">Récapitulatif par taux</h3>
            <table style="width:100%;min-width:620px">
                <thead><tr><th>Taux TVA</th><th>Base HT</th><th>TVA déductible</th><th>TTC déductible</th><th>Factures</th></tr></thead>
                <tbody id="ppTVARateSummary"></tbody>
            </table>
        </div>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
            <table style="width:100%;min-width:1450px">
                <thead><tr>
                    <th>Date facture</th><th>N° facture</th><th>Fournisseur</th><th>ICE FRS</th><th>Nature fournisseur</th>
                    <th>Taux TVA</th><th>Montant HT</th><th>Montant TVA</th><th>Montant TTC</th>
                    <th>Mode règlement</th><th>Date règlement</th><th></th>
                </tr></thead>
                <tbody id="ppTVATable"></tbody>
            </table>
        </div>`;
    page.appendChild(wrap);
}

function ppSupplierNatureTVA(supplier){
    if(!supplier) return '-';
    return String(
        supplier.nature ??
        supplier.type ??
        supplier.category ??
        supplier.activity ??
        supplier.activite ??
        supplier.natureFournisseur ??
        '-'
    ).trim() || '-';
}

function ppInvoicePaymentInfoTVA(inv){
    const invoiceId=Number(inv?.id);
    const payments=(typeof supplierPaymentsPP!=='undefined' && Array.isArray(supplierPaymentsPP))
        ? supplierPaymentsPP.filter(p=>(p.allocations||[]).some(a=>Number(a.invoiceId)===invoiceId))
        : [];

    if(payments.length){
        const modes=[...new Set(payments.map(p=>String(p.mode||'').trim()).filter(Boolean))];
        const dates=[...new Set(payments.map(p=>String(p.date||'').slice(0,10)).filter(Boolean))].sort();
        return {
            mode:modes.join(' / ') || 'Règlement',
            date:dates.join(' / '),
            status:Number(inv?.due||0)>0?'Partiel':'Réglée'
        };
    }

    // Legacy amount entered directly on the purchase invoice.
    if(Number(inv?.paid||0)>0){
        return {
            mode:String(inv.paymentMode||inv.modeReglement||inv.paymentMethod||'Saisi avec facture'),
            date:String(inv.paymentDate||inv.dateReglement||inv.date||'').slice(0,10),
            status:Number(inv?.due||0)>0?'Partiel':'Réglée'
        };
    }

    return {mode:'Non réglée',date:'',status:'Non réglée'};
}

function refreshTVASupplierOptionsPP(){
    const select=document.getElementById('ppTVASupplier'); if(!select)return;
    const current=select.value;
    const list=suppliers.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'));
    select.innerHTML='<option value="">Tous</option>'+list.map(s=>`<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
}

function refreshTVAExtraFiltersPP(){
    const natureSelect=document.getElementById('ppTVANature');
    if(natureSelect){
        const current=natureSelect.value;
        const values=[...new Set([
            ...suppliers.map(ppSupplierNatureTVA).filter(x=>x && x!=='-'),
            ...(typeof expensesPP!=='undefined'?expensesPP.map(e=>e.category).filter(Boolean):[])
        ])].sort((a,b)=>a.localeCompare(b,'fr'));
        natureSelect.innerHTML='<option value="">Toutes</option>'+values.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('');
        if([...natureSelect.options].some(o=>o.value===current)) natureSelect.value=current;
    }

    const modeSelect=document.getElementById('ppTVAPaymentMode');
    if(modeSelect){
        const current=modeSelect.value;
        const values=[...new Set([
            ...invoices.map(ppInvoicePaymentInfoTVA).map(x=>x.mode).filter(Boolean),
            ...(typeof expensesPP!=='undefined'?expensesPP.map(e=>e.mode).filter(Boolean):[])
        ])].sort((a,b)=>a.localeCompare(b,'fr'));
        modeSelect.innerHTML='<option value="">Tous</option>'+values.map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('');
        if([...modeSelect.options].some(o=>o.value===current)) modeSelect.value=current;
    }
}

function ppInvoicePaymentEventsTVA(inv){
    const invoiceId=Number(inv?.id);
    const events=[];
    let allocatedTotal=0;

    if(typeof supplierPaymentsPP!=='undefined' && Array.isArray(supplierPaymentsPP)){
        supplierPaymentsPP.forEach(p=>{
            (p.allocations||[]).forEach(a=>{
                if(Number(a.invoiceId)!==invoiceId)return;
                const amount=Math.max(Number(a.amount||0),0);
                if(!(amount>0))return;
                allocatedTotal+=amount;
                events.push({
                    date:String(p.date||'').slice(0,10),
                    amount,
                    mode:String(p.mode||'Règlement'),
                    reference:String(p.reference||'')
                });
            });
        });
    }

    // Ancien montant "payé à la facture" non représenté par un règlement séparé.
    const directPaid=Math.max(Number(inv?.paid||0)-allocatedTotal,0);
    if(directPaid>0){
        events.push({
            date:String(
                inv?.paymentDate ||
                inv?.dateReglement ||
                inv?.payment_date ||
                inv?.date ||
                ''
            ).slice(0,10),
            amount:directPaid,
            mode:String(
                inv?.paymentMode ||
                inv?.modeReglement ||
                inv?.paymentMethod ||
                'Saisi avec facture'
            ),
            reference:''
        });
    }

    return events
        .filter(e=>e.date && e.amount>0)
        .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}

function getTVAAchatRowsPP(){
    const rows=[];

    invoices.forEach(inv=>{
        const supplier=suppliers.find(s=>Number(s.id)===Number(inv.supplierId));
        const lines=Array.isArray(inv.lines)?inv.lines:[];
        const grouped=new Map();

        lines.forEach(line=>{
            const rate=Number(line.vatRate ?? 0);

            // TVA 0% n'entre jamais dans la TVA déductible.
            if(!(rate>0))return;

            const ht=Number(
                (line.totalHT ?? (Number(line.quantity||0)*Number(line.price||0))) || 0
            );
            const vat=Number((line.vatAmount ?? (ht*rate/100)) || 0);
            const ttc=Number((line.totalTTC ?? (ht+vat)) || 0);

            if(!grouped.has(rate))grouped.set(rate,{ht:0,vat:0,ttc:0});
            const g=grouped.get(rate);
            g.ht+=ht;
            g.vat+=vat;
            g.ttc+=ttc;
        });

        // Compatibilité anciennes factures sans détail de lignes.
        if(!lines.length && Number(inv.tva||0)>0 && Number(inv.totalHT||0)>0){
            const ht=Number(inv.totalHT||0);
            const vat=Number(inv.tva||0);
            const raw=vat/ht*100;
            const allowed=[7,10,14,20];
            const rate=allowed.reduce(
                (best,x)=>Math.abs(x-raw)<Math.abs(best-raw)?x:best,
                allowed[0]
            );
            grouped.set(rate,{
                ht,
                vat,
                ttc:Number(inv.totalTTC||ht+vat)
            });
        }

        // Une facture non réglée ne génère aucune TVA déductible.
        const paymentEvents=ppInvoicePaymentEventsTVA(inv);
        if(!paymentEvents.length || !grouped.size)return;

        /*
          La déduction suit le règlement.
          En cas de paiement partiel, chaque paiement est ventilé
          proportionnellement sur toutes les composantes de la facture,
          y compris la partie à TVA 0%. Seule la part taxable est ensuite
          retenue dans la TVA déductible.
        */
        const invoiceTTC=Math.max(
            Number(inv.totalTTC||0),
            [...grouped.values()].reduce((a,g)=>a+Number(g.ttc||0),0)
        );
        if(!(invoiceTTC>0))return;

        let remainingInvoiceTTC=invoiceTTC;

        paymentEvents.forEach(event=>{
            if(!(remainingInvoiceTTC>0))return;

            const paidPart=Math.min(Number(event.amount||0),remainingInvoiceTTC);
            if(!(paidPart>0))return;

            const ratio=paidPart/invoiceTTC;

            grouped.forEach((amounts,rate)=>{
                const ht=Number(amounts.ht||0)*ratio;
                const vat=Number(amounts.vat||0)*ratio;
                const ttc=Number(amounts.ttc||0)*ratio;

                // Evite les lignes insignifiantes dues aux arrondis.
                if(!(ttc>0.000001 || vat>0.000001))return;

                rows.push({
                    source:'invoice-payment',
                    invoiceId:inv.id,
                    date:inv.date,                 // date facture affichée
                    deductionDate:event.date,      // date utilisée pour période/trimestre TVA
                    invoiceNumber:inv.number||'',
                    supplierId:inv.supplierId,
                    supplierName:inv.supplierName||supplier?.name||'',
                    supplierICE:String(
                        supplier?.ice ||
                        inv.supplierICE ||
                        inv.ice ||
                        ''
                    ),
                    supplierNature:ppSupplierNatureTVA(supplier),
                    rate:Number(rate),
                    ht,
                    vat,
                    ttc,
                    paymentMode:event.mode||'Règlement',
                    paymentDate:event.date,
                    paymentReference:event.reference||'',
                    paymentStatus:Number(inv?.due||0)>0?'Partiel':'Réglée'
                });
            });

            remainingInvoiceTTC-=paidPart;
        });
    });

    /*
      Dépenses avec TVA (banque, électricité, internet, téléphone...).
      Elles sont considérées déductibles à leur date de règlement.
    */
    if(typeof expensesPP!=='undefined' && Array.isArray(expensesPP)){
        expensesPP.forEach(e=>{
            const rate=Number(e.vatRate||0);
            if(!(rate>0))return;

            const paymentDate=String(e.paymentDate||e.date||'').slice(0,10);
            if(!paymentDate)return;

            const ht=Number(e.totalHT||0);
            const vat=Number(e.vatAmount||0);
            const ttc=Number(e.totalTTC??e.amount??(ht+vat));

            rows.push({
                source:'expense',
                expenseId:e.id,
                invoiceId:'expense-'+e.id,
                date:e.date,
                deductionDate:paymentDate,
                invoiceNumber:e.reference||'DÉP-'+e.id,
                supplierId:null,
                supplierName:e.beneficiary||e.category||'Dépense',
                supplierICE:String(e.ice||''),
                supplierNature:e.category||'Dépense',
                rate,
                ht,
                vat,
                ttc,
                paymentMode:e.mode||'-',
                paymentDate,
                paymentStatus:'Réglée'
            });
        });
    }

    return rows;
}

function filteredTVAAchatRowsPP(){
    const from=getValue('ppTVAFrom');
    const to=getValue('ppTVATo');
    const supplier=Number(getValue('ppTVASupplier'))||0;
    const rateRaw=getValue('ppTVARate');
    const nature=getValue('ppTVANature');
    const paymentMode=getValue('ppTVAPaymentMode');
    const hasRate=rateRaw!=='';
    const rate=Number(rateRaw);

    return getTVAAchatRowsPP().filter(r=>{
        const d=String(r.deductionDate||r.paymentDate||r.date||'').slice(0,10);
        if(from && d<from)return false;
        if(to && d>to)return false;
        if(supplier && Number(r.supplierId)!==supplier)return false;
        if(hasRate && Number(r.rate)!==rate)return false;
        if(nature && String(r.supplierNature)!==nature)return false;
        if(paymentMode && String(r.paymentMode)!==paymentMode)return false;
        return true;
    });
}

function renderTVAAchatsPP(){
    // Preserve filter values while rebuilding the upgraded UI once.
    if(!document.getElementById('ppTVARateSummary')){
        const old={
            from:getValue('ppTVAFrom'),to:getValue('ppTVATo'),supplier:getValue('ppTVASupplier'),rate:getValue('ppTVARate')
        };
        ensureTVAAchatsUIPP();
        setValue('ppTVAFrom',old.from);setValue('ppTVATo',old.to);setValue('ppTVASupplier',old.supplier);setValue('ppTVARate',old.rate);
    }

    const table=document.getElementById('ppTVATable'); if(!table)return;
    refreshTVASupplierOptionsPP();
    refreshTVAExtraFiltersPP();

    const rows=filteredTVAAchatRowsPP();
    const totalHT=rows.reduce((a,r)=>a+Number(r.ht||0),0);
    const totalTVA=rows.reduce((a,r)=>a+Number(r.vat||0),0);
    const totalTTC=rows.reduce((a,r)=>a+Number(r.ttc||0),0);
    const invoiceCount=new Set(rows.map(r=>String(r.invoiceId))).size;

    setText('ppTVAHT',formatMoney(totalHT));
    setText('ppTVADeductible',formatMoney(totalTVA));
    setText('ppTVATTC',formatMoney(totalTTC));
    setText('ppTVAInvoiceCount',String(invoiceCount));

    const rates=[7,10,14,20];
    const summary=document.getElementById('ppTVARateSummary');
    if(summary){
        const summaryRows=rates.map(rate=>{
            const rr=rows.filter(r=>Number(r.rate)===rate);
            const ht=rr.reduce((a,r)=>a+Number(r.ht||0),0);
            const vat=rr.reduce((a,r)=>a+Number(r.vat||0),0);
            const ttc=rr.reduce((a,r)=>a+Number(r.ttc||0),0);
            const count=new Set(rr.map(r=>String(r.invoiceId))).size;
            return `<tr><td><strong>${rate}%</strong></td><td>${formatMoney(ht)}</td><td><strong>${formatMoney(vat)}</strong></td><td>${formatMoney(ttc)}</td><td>${count}</td></tr>`;
        }).join('');
        summary.innerHTML=summaryRows+`<tr style="font-weight:800"><td>TOTAL</td><td>${formatMoney(totalHT)}</td><td>${formatMoney(totalTVA)}</td><td>${formatMoney(totalTTC)}</td><td>${invoiceCount}</td></tr>`;
    }

    const sorted=rows.slice().sort((a,b)=>{
        const d=new Date(b.deductionDate||b.paymentDate||b.date||0)-new Date(a.deductionDate||a.paymentDate||a.date||0);
        return d || String(a.invoiceNumber||'').localeCompare(String(b.invoiceNumber||'')) || Number(a.rate)-Number(b.rate);
    });

    if(!sorted.length){
        table.innerHTML='<tr><td colspan="12" class="empty">Aucune TVA déductible pour cette période.</td></tr>';
        return;
    }

    table.innerHTML=sorted.map(r=>`<tr>
        <td>${formatDate(r.date)}</td>
        <td>${escapeHTML(r.invoiceNumber||'-')}</td>
        <td>${escapeHTML(r.supplierName||'-')}</td>
        <td>${escapeHTML(r.supplierICE||'-')}</td>
        <td>${escapeHTML(r.supplierNature||'-')}</td>
        <td><strong>${formatNumber(r.rate)}%</strong></td>
        <td>${formatMoney(r.ht)}</td>
        <td><strong>${formatMoney(r.vat)}</strong></td>
        <td>${formatMoney(r.ttc)}</td>
        <td>${escapeHTML(r.paymentMode||'-')}</td>
        <td>${r.paymentDate?escapeHTML(r.paymentDate.split(' / ').map(d=>formatDate(d)).join(' / ')):'-'}</td>
        <td><button class="btn small view" onclick="${r.source==='expense'?`openExpensePP(${r.expenseId})`:`viewInvoice(${r.invoiceId})`}" title="Voir">👁️</button></td>
    </tr>`).join('');
}

function resetTVAFiltersPP(){
    setValue('ppTVAFrom','');
    setValue('ppTVATo','');
    setValue('ppTVASupplier','');
    setValue('ppTVARate','');
    setValue('ppTVANature','');
    setValue('ppTVAPaymentMode','');
    renderTVAAchatsPP();
}

function printTVAAchatsPP(){
    const rows=filteredTVAAchatRowsPP();
    const totalHT=rows.reduce((a,r)=>a+Number(r.ht||0),0);
    const totalTVA=rows.reduce((a,r)=>a+Number(r.vat||0),0);
    const totalTTC=rows.reduce((a,r)=>a+Number(r.ttc||0),0);
    const invoiceCount=new Set(rows.map(r=>String(r.invoiceId))).size;
    const rates=[7,10,14,20];

    const ventilation=rates.map(rate=>{
        const rr=rows.filter(r=>Number(r.rate)===rate);
        const ht=rr.reduce((a,r)=>a+Number(r.ht||0),0);
        const vat=rr.reduce((a,r)=>a+Number(r.vat||0),0);
        const ttc=rr.reduce((a,r)=>a+Number(r.ttc||0),0);
        const count=new Set(rr.map(r=>String(r.invoiceId))).size;
        return `<tr><td>${rate}%</td><td>${formatMoney(ht)}</td><td>${formatMoney(vat)}</td><td>${formatMoney(ttc)}</td><td>${count}</td></tr>`;
    }).join('');

    const body=rows.slice().sort((a,b)=>new Date(a.deductionDate||a.paymentDate||a.date||0)-new Date(b.deductionDate||b.paymentDate||b.date||0) || Number(a.rate)-Number(b.rate)).map(r=>`<tr>
        <td>${formatDate(r.date)}</td><td>${escapeHTML(r.invoiceNumber||'')}</td><td>${escapeHTML(r.supplierName||'')}</td>
        <td>${escapeHTML(r.supplierICE||'-')}</td><td>${escapeHTML(r.supplierNature||'-')}</td><td>${formatNumber(r.rate)}%</td>
        <td>${formatMoney(r.ht)}</td><td>${formatMoney(r.vat)}</td><td>${formatMoney(r.ttc)}</td>
        <td>${escapeHTML(r.paymentMode||'-')}</td><td>${r.paymentDate?escapeHTML(r.paymentDate.split(' / ').map(d=>formatDate(d)).join(' / ')):'-'}</td>
    </tr>`).join('');

    const from=getValue('ppTVAFrom'),to=getValue('ppTVATo');
    const period=(from||to)?`${from?formatDate(from):'Début'} au ${to?formatDate(to):"Aujourd’hui"}`:'Toutes périodes';

    printDocument('Situation TVA déductible',`
        <div class="doc-head"><h1>Pause & Plate</h1><p>Situation TVA déductible — Achats</p></div>
        <p><strong>Période :</strong> ${escapeHTML(period)}</p>
        <h2>Totaux déductibles</h2>
        ${detailRowsHTML([
            ['Base HT déductible',formatMoney(totalHT)],
            ['TVA déductible',formatMoney(totalTVA)],
            ['TTC déductible',formatMoney(totalTTC)],
            ['Nombre de factures',String(invoiceCount)]
        ])}
        <h2>Récapitulatif par taux</h2>
        <table><thead><tr><th>Taux</th><th>Base HT</th><th>TVA déductible</th><th>TTC</th><th>Factures</th></tr></thead>
        <tbody>${ventilation}<tr><th>TOTAL</th><th>${formatMoney(totalHT)}</th><th>${formatMoney(totalTVA)}</th><th>${formatMoney(totalTTC)}</th><th>${invoiceCount}</th></tr></tbody></table>
        <h2>Détail</h2>
        <table><thead><tr><th>Date facture</th><th>N° facture</th><th>Fournisseur</th><th>ICE FRS</th><th>Nature</th><th>Taux</th><th>HT</th><th>TVA</th><th>TTC</th><th>Mode règlement</th><th>Date règlement</th></tr></thead>
        <tbody>${body||'<tr><td colspan="11">Aucune donnée</td></tr>'}</tbody></table>
    `);
}



/* =========================================================
   TVA COLLECTÉE — VENTES — PAUSE & PLATE
   Taux fixe 10%
========================================================= */

function ensureTVACollecteeUIPP(){
    const page=document.getElementById('accountingPage');
    ensureTVASubmenuPP();
    if(!page || document.getElementById('ppTVACollecteeModule')) return;

    const wrap=document.createElement('div');
    wrap.id='ppTVACollecteeModule';
    wrap.style.marginTop='28px';
    wrap.innerHTML=`
        <div style="border-top:2px solid #e5e7eb;padding-top:22px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
                <div>
                    <h2 style="margin:0 0 4px">TVA Collectée — Ventes</h2>
                    <p style="margin:0;color:#667085">Toutes les ventes sont calculées automatiquement au taux fixe de 10%.</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn primary" onclick="openSalePP()">➕ Nouvelle vente</button>
                    <button type="button" class="btn print" onclick="printTVACollecteePP()">🖨️ Imprimer</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:16px">
                <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppTVACFrom" type="date" onchange="renderTVACollecteePP()" style="width:100%;padding:9px"></div>
                <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppTVACTo" type="date" onchange="renderTVACollecteePP()" style="width:100%;padding:9px"></div>
                <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode encaissement</label><select id="ppTVACMode" onchange="renderTVACollecteePP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
                <div style="display:flex;align-items:end"><button class="btn" type="button" onclick="resetTVACollecteeFiltersPP()" style="width:100%">Réinitialiser</button></div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:16px">
                <div class="stat-card" style="padding:16px"><div style="color:#667085">Total HT ventes</div><strong id="ppTVACHT" style="font-size:22px">0 DH</strong></div>
                <div class="stat-card" style="padding:16px"><div style="color:#667085">TVA collectée 10%</div><strong id="ppTVACVAT" style="font-size:22px">0 DH</strong></div>
                <div class="stat-card" style="padding:16px"><div style="color:#667085">Total TTC ventes</div><strong id="ppTVACTTC" style="font-size:22px">0 DH</strong></div>
                <div class="stat-card" style="padding:16px"><div style="color:#667085">Nombre de pièces</div><strong id="ppTVACCount" style="font-size:22px">0</strong></div>
            </div>

            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
                <table style="width:100%;min-width:1120px">
                    <thead><tr><th>Date</th><th>N° pièce</th><th>Client / Vente</th><th>HT</th><th>Taux TVA</th><th>TVA collectée</th><th>TTC</th><th>Mode encaissement</th><th>Date encaissement</th><th>Actions</th></tr></thead>
                    <tbody id="ppTVACTable"></tbody>
                </table>
            </div>
        </div>`;
    page.appendChild(wrap);
    wrap.style.display=ppActiveTVAModule==='collectee'?'block':'none';
    ensureSaleModalPP();
}

function ensureSaleModalPP(){
    if(document.getElementById('ppSaleModal')) return;
    const m=document.createElement('div');
    m.id='ppSaleModal';
    m.className='modal-overlay';
    m.innerHTML=`<div class="modal">
        <div class="modal-header"><h2 id="ppSaleModalTitle">Nouvelle vente</h2><button onclick="closeModal('ppSaleModal')">×</button></div>
        <form id="ppSaleForm">
            <input type="hidden" id="ppSaleId">
            <div class="form-grid">
                <div><label>Date vente</label><input id="ppSaleDate" type="date" required></div>
                <div><label>N° pièce</label><input id="ppSaleNumber" required></div>
                <div><label>Client / Vente</label><input id="ppSaleClient" placeholder="Ventes comptoir"></div>
                <div><label>Montant TTC</label><input id="ppSaleTTC" type="number" min="0.01" step="0.01" required></div>
                <div><label>Mode encaissement</label><select id="ppSaleMode"><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
                <div><label>Date encaissement</label><input id="ppSalePaymentDate" type="date" required></div>
            </div>
            <div style="margin-top:12px;padding:12px;border-radius:10px;background:#f8fafc">
                <strong>TVA fixe : 10%</strong> — HT et TVA seront calculés automatiquement à partir du TTC.
            </div>
            <div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppSaleModal')">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    document.body.appendChild(m);
    document.getElementById('ppSaleForm').addEventListener('submit',e=>{e.preventDefault();saveSalePP();});
}

function openSalePP(id=null){
    ensureSaleModalPP();
    const s=id?salesPP.find(x=>Number(x.id)===Number(id)):null;
    const today=new Date().toISOString().slice(0,10);
    setValue('ppSaleId',s?.id||'');
    setValue('ppSaleDate',s?.date||today);
    setValue('ppSaleNumber',s?.number||'');
    setValue('ppSaleClient',s?.client||'Ventes comptoir');
    setValue('ppSaleTTC',s?.totalTTC||'');
    setValue('ppSaleMode',s?.mode||'Espèces');
    setValue('ppSalePaymentDate',s?.paymentDate||s?.date||today);
    setText('ppSaleModalTitle',s?'Modifier la vente':'Nouvelle vente');
    openModal('ppSaleModal');
}

function saveSalePP(){
    const id=Number(getValue('ppSaleId'))||null;
    const totalTTC=Number(getValue('ppSaleTTC')||0);
    if(!(totalTTC>0)) return;
    const obj={
        id:id||createId(),
        date:getValue('ppSaleDate'),
        number:getValue('ppSaleNumber').trim(),
        client:getValue('ppSaleClient').trim()||'Ventes comptoir',
        totalTTC,
        mode:getValue('ppSaleMode'),
        paymentDate:getValue('ppSalePaymentDate'),
        createdAt:new Date().toISOString()
    };
    if(id){
        const i=salesPP.findIndex(x=>Number(x.id)===id);
        if(i>=0) salesPP[i]=obj;
    }else salesPP.unshift(obj);
    saveData();
    closeModal('ppSaleModal');
    renderTVACollecteePP();
}

function deleteSalePP(id){
    if(!confirm('Supprimer cette vente ?')) return;
    salesPP=salesPP.filter(x=>Number(x.id)!==Number(id));
    saveData();
    renderTVACollecteePP();
}

function getTVACollecteeRowsPP(){
    const manual=salesPP.map(s=>{
        const ttc=Number(s.totalTTC||0);
        const ht=ttc/1.10;
        const vat=ttc-ht;
        return {id:s.id,source:'sale',date:s.date,number:s.number||'',client:s.client||'Ventes comptoir',ht,rate:10,vat,ttc,mode:s.mode||'-',paymentDate:s.paymentDate||s.date||''};
    });

    // Existing client invoices are also included automatically.
    const clientRows=clientInvoicesPP.map(inv=>{
        const ttc=Number(inv.totalTTC||0);
        const ht=ttc/1.10;
        const vat=ttc-ht;
        const payments=clientPaymentsPP.filter(p=>(p.allocations||[]).some(a=>Number(a.invoiceId)===Number(inv.id)));
        const modes=[...new Set(payments.map(p=>String(p.mode||'').trim()).filter(Boolean))];
        const dates=[...new Set(payments.map(p=>String(p.date||'').slice(0,10)).filter(Boolean))].sort();
        const directPaid=Math.max(Number(inv.paid||0)-payments.reduce((t,p)=>t+(p.allocations||[]).filter(a=>Number(a.invoiceId)===Number(inv.id)).reduce((x,a)=>x+Number(a.amount||0),0),0),0);
        return {
            id:inv.id,source:'clientInvoice',date:inv.date,number:inv.number||'',client:inv.clientName||'Client',
            ht,rate:10,vat,ttc,
            mode:modes.join(' / ') || (directPaid>0?'Saisi avec facture':'Non encaissée'),
            paymentDate:dates.join(' / ') || (directPaid>0?String(inv.date||'').slice(0,10):'')
        };
    });

    return manual.concat(clientRows);
}

function filteredTVACollecteeRowsPP(){
    const from=getValue('ppTVACFrom'),to=getValue('ppTVACTo'),mode=getValue('ppTVACMode');
    return getTVACollecteeRowsPP().filter(r=>{
        const d=String(r.date||'').slice(0,10);
        if(from&&d<from)return false;
        if(to&&d>to)return false;
        if(mode&&String(r.mode)!==mode)return false;
        return true;
    });
}

function renderTVACollecteePP(){
    ensureTVACollecteeUIPP();
    const table=document.getElementById('ppTVACTable'); if(!table)return;
    const rows=filteredTVACollecteeRowsPP();
    const ht=rows.reduce((a,r)=>a+r.ht,0),vat=rows.reduce((a,r)=>a+r.vat,0),ttc=rows.reduce((a,r)=>a+r.ttc,0);
    setText('ppTVACHT',formatMoney(ht));setText('ppTVACVAT',formatMoney(vat));setText('ppTVACTTC',formatMoney(ttc));setText('ppTVACCount',String(rows.length));
    const sorted=rows.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    if(!sorted.length){table.innerHTML='<tr><td colspan="10" class="empty">Aucune vente pour cette période.</td></tr>';return;}
    table.innerHTML=sorted.map(r=>`<tr>
        <td>${formatDate(r.date)}</td><td>${escapeHTML(r.number||'-')}</td><td>${escapeHTML(r.client||'Ventes comptoir')}</td>
        <td>${formatMoney(r.ht)}</td><td><strong>10%</strong></td><td><strong>${formatMoney(r.vat)}</strong></td><td>${formatMoney(r.ttc)}</td>
        <td>${escapeHTML(r.mode||'-')}</td><td>${r.paymentDate?escapeHTML(r.paymentDate.split(' / ').map(d=>formatDate(d)).join(' / ')):'-'}</td>
        <td>${r.source==='sale'?`<button class="btn small edit" onclick="openSalePP(${r.id})">✏️</button> <button class="btn small danger" onclick="deleteSalePP(${r.id})">🗑️</button>`:`<span class="status success">Client</span>`}</td>
    </tr>`).join('');
}

function resetTVACollecteeFiltersPP(){
    setValue('ppTVACFrom','');setValue('ppTVACTo','');setValue('ppTVACMode','');renderTVACollecteePP();
}

function printTVACollecteePP(){
    const rows=filteredTVACollecteeRowsPP();
    const ht=rows.reduce((a,r)=>a+r.ht,0),vat=rows.reduce((a,r)=>a+r.vat,0),ttc=rows.reduce((a,r)=>a+r.ttc,0);
    const body=rows.slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)).map(r=>`<tr>
        <td>${formatDate(r.date)}</td><td>${escapeHTML(r.number||'-')}</td><td>${escapeHTML(r.client||'Ventes comptoir')}</td>
        <td>${formatMoney(r.ht)}</td><td>10%</td><td>${formatMoney(r.vat)}</td><td>${formatMoney(r.ttc)}</td>
        <td>${escapeHTML(r.mode||'-')}</td><td>${r.paymentDate?escapeHTML(r.paymentDate.split(' / ').map(d=>formatDate(d)).join(' / ')):'-'}</td>
    </tr>`).join('');
    const from=getValue('ppTVACFrom'),to=getValue('ppTVACTo');
    const period=(from||to)?`${from?formatDate(from):'Début'} au ${to?formatDate(to):"Aujourd’hui"}`:'Toutes périodes';
    printDocument('Situation TVA Collectée',`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation TVA Collectée — Ventes (10%)</p></div>
        <p><strong>Période :</strong> ${escapeHTML(period)}</p>
        ${detailRowsHTML([['Total HT ventes',formatMoney(ht)],['TVA collectée 10%',formatMoney(vat)],['Total TTC ventes',formatMoney(ttc)],['Nombre de pièces',String(rows.length)]])}
        <h2>Détail</h2><table><thead><tr><th>Date</th><th>N° pièce</th><th>Client / Vente</th><th>HT</th><th>Taux</th><th>TVA</th><th>TTC</th><th>Mode</th><th>Date encaissement</th></tr></thead>
        <tbody>${body||'<tr><td colspan="9">Aucune donnée</td></tr>'}</tbody></table>`);
}


/* =========================================================
   SITUATION TVA — TRIMESTRIELLE
   TVA collectée - TVA déductible - crédit reporté
========================================================= */

function ppQuarterInfo(dateStr){
    const d=new Date(String(dateStr||'').slice(0,10)+'T00:00:00');
    if(isNaN(d)) return null;
    const year=d.getFullYear(), q=Math.floor(d.getMonth()/3)+1;
    return {year,q,key:`${year}-T${q}`,label:`T${q} ${year}`};
}

function getTVAQuarterSituationPP(){
    const purchaseRows=getTVAAchatRowsPP();
    const salesRows=getTVACollecteeRowsPP();
    const keys=new Set();

    purchaseRows.forEach(r=>{const x=ppQuarterInfo(r.deductionDate||r.paymentDate||r.date);if(x)keys.add(x.key);});
    salesRows.forEach(r=>{const x=ppQuarterInfo(r.date);if(x)keys.add(x.key);});

    // Always include current quarter.
    const now=new Date(), cq=Math.floor(now.getMonth()/3)+1;
    keys.add(`${now.getFullYear()}-T${cq}`);

    const sorted=[...keys].sort((a,b)=>{
        const [ya,qa]=a.split('-T').map(Number),[yb,qb]=b.split('-T').map(Number);
        return ya-yb || qa-qb;
    });

    let creditCarry=0;
    return sorted.map(key=>{
        const [year,q]=key.split('-T').map(Number);
        const collected=salesRows.filter(r=>ppQuarterInfo(r.date)?.key===key).reduce((a,r)=>a+Number(r.vat||0),0);
        const deductible=purchaseRows.filter(r=>ppQuarterInfo(r.deductionDate||r.paymentDate||r.date)?.key===key).reduce((a,r)=>a+Number(r.vat||0),0);
        const creditReported=creditCarry;
        const net=collected-deductible-creditReported;
        const payable=Math.max(net,0);
        const credit=Math.max(-net,0);
        creditCarry=credit;
        return {key,year,q,label:`T${q} ${year}`,collected,deductible,creditReported,payable,credit};
    });
}

function ensureTVASituationUIPP(){
    const page=document.getElementById('accountingPage');
    ensureTVASubmenuPP();
    if(!page || document.getElementById('ppTVASituationModule')) return;
    const wrap=document.createElement('div');
    wrap.id='ppTVASituationModule';
    wrap.style.marginTop='28px';
    wrap.innerHTML=`
      <div style="border-top:2px solid #e5e7eb;padding-top:22px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          <div><h2 style="margin:0 0 4px">Situation TVA à payer / Crédit TVA</h2>
          <p style="margin:0;color:#667085">Calcul trimestriel avec report automatique du crédit TVA au trimestre suivant.</p></div>
          <button class="btn print" type="button" onclick="printTVASituationPP()">🖨️ Imprimer situation TVA</button>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
          <table style="width:100%;min-width:1050px">
            <thead><tr><th>Trimestre</th><th>TVA collectée</th><th>TVA déductible</th><th>Crédit reporté</th><th>TVA à payer</th><th>Crédit TVA à reporter</th></tr></thead>
            <tbody id="ppTVASituationTable"></tbody>
          </table>
        </div>
        <div id="ppTVASituationTotals" style="margin-top:14px"></div>
      </div>`;
    page.appendChild(wrap);
    wrap.style.display=ppActiveTVAModule==='situation'?'block':'none';
}

function renderTVASituationPP(){
    ensureTVASituationUIPP();
    const table=document.getElementById('ppTVASituationTable');if(!table)return;
    const rows=getTVAQuarterSituationPP();
    table.innerHTML=rows.map(r=>`<tr>
      <td><strong>${escapeHTML(r.label)}</strong></td>
      <td>${formatMoney(r.collected)}</td>
      <td>${formatMoney(r.deductible)}</td>
      <td>${r.creditReported?formatMoney(r.creditReported):'-'}</td>
      <td>${r.payable?`<strong>${formatMoney(r.payable)}</strong>`:'-'}</td>
      <td>${r.credit?`<strong>${formatMoney(r.credit)}</strong>`:'-'}</td>
    </tr>`).join('');

    const totalCollected=rows.reduce((a,r)=>a+r.collected,0);
    const totalDeductible=rows.reduce((a,r)=>a+r.deductible,0);
    const totalPayable=rows.reduce((a,r)=>a+r.payable,0);
    const currentCredit=rows.length?rows[rows.length-1].credit:0;
    document.getElementById('ppTVASituationTotals').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
        <div class="stat-card" style="padding:16px"><div style="color:#667085">Total TVA collectée</div><strong>${formatMoney(totalCollected)}</strong></div>
        <div class="stat-card" style="padding:16px"><div style="color:#667085">Total TVA déductible</div><strong>${formatMoney(totalDeductible)}</strong></div>
        <div class="stat-card" style="padding:16px"><div style="color:#667085">Total TVA à payer</div><strong>${formatMoney(totalPayable)}</strong></div>
        <div class="stat-card" style="padding:16px"><div style="color:#667085">Crédit TVA à reporter</div><strong>${formatMoney(currentCredit)}</strong></div>
      </div>`;
}

function printTVASituationPP(){
    const rows=getTVAQuarterSituationPP();
    const body=rows.map(r=>`<tr><td>${escapeHTML(r.label)}</td><td>${formatMoney(r.collected)}</td><td>${formatMoney(r.deductible)}</td><td>${formatMoney(r.creditReported)}</td><td>${formatMoney(r.payable)}</td><td>${formatMoney(r.credit)}</td></tr>`).join('');
    const totalCollected=rows.reduce((a,r)=>a+r.collected,0),totalDeductible=rows.reduce((a,r)=>a+r.deductible,0),totalPayable=rows.reduce((a,r)=>a+r.payable,0),credit=rows.length?rows[rows.length-1].credit:0;
    printDocument('Situation TVA trimestrielle',`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation TVA trimestrielle</p></div>
      ${detailRowsHTML([['Total TVA collectée',formatMoney(totalCollected)],['Total TVA déductible',formatMoney(totalDeductible)],['Total TVA à payer',formatMoney(totalPayable)],['Crédit TVA à reporter',formatMoney(credit)]])}
      <table><thead><tr><th>Trimestre</th><th>TVA collectée</th><th>TVA déductible</th><th>Crédit reporté</th><th>TVA à payer</th><th>Crédit à reporter</th></tr></thead><tbody>${body}</tbody></table>`);
}


/* =========================================================
   CENTRE DES RÈGLEMENTS — FOURNISSEURS / CLIENTS
========================================================= */
let ppActivePaymentTab='suppliers';

function ensurePaymentsCenterPP(){ return; }

function showPaymentTabPP(tab){
    ppActivePaymentTab=tab;
    document.getElementById('ppPayTabSuppliers')?.classList.toggle('primary',tab==='suppliers');
    document.getElementById('ppPayTabClients')?.classList.toggle('primary',tab==='clients');
}

function paymentInvoiceLabelsPP(p,isSupplier){
    return (p.allocations||[]).map(a=>{
        const inv=(isSupplier?invoices:clientInvoicesPP).find(i=>Number(i.id)===Number(a.invoiceId));
        return `${inv?.number||'Facture'} (${formatMoney(a.amount||0)})`;
    }).join(' / ')||'-';
}

function filteredPaymentsPP(){
    const from=getValue('ppPayFrom'),to=getValue('ppPayTo'),mode=getValue('ppPayMode'),q=normalizeText(getValue('ppPaySearch'));
    const isSupplier=ppActivePaymentTab==='suppliers';
    const arr=isSupplier?supplierPaymentsPP:clientPaymentsPP;
    return arr.filter(p=>{
        const d=String(p.date||'').slice(0,10);
        if(from&&d<from)return false;if(to&&d>to)return false;if(mode&&String(p.mode)!==mode)return false;
        const party=isSupplier?suppliers.find(s=>Number(s.id)===Number(p.supplierId)):clientsPP.find(c=>Number(c.id)===Number(p.clientId));
        const hay=normalizeText(`${party?.name||''} ${p.reference||''} ${paymentInvoiceLabelsPP(p,isSupplier)}`);
        if(q&&!hay.includes(q))return false;return true;
    });
}

function renderPaymentsCenterPP(){
    ensurePaymentsCenterPP();
    const table=document.getElementById('ppPaymentsTable');if(!table)return;
    const isSupplier=ppActivePaymentTab==='suppliers';
    setText('ppPayPartyHead',isSupplier?'Fournisseur':'Client');
    document.getElementById('ppPayTabSuppliers')?.classList.toggle('primary',isSupplier);
    document.getElementById('ppPayTabClients')?.classList.toggle('primary',!isSupplier);
    const rows=filteredPaymentsPP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    setText('ppPayTotal',formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0)));
    if(!rows.length){table.innerHTML='<tr><td colspan="7" class="empty">Aucun règlement enregistré.</td></tr>';return;}
    table.innerHTML=rows.map(p=>{
        const party=isSupplier?suppliers.find(s=>Number(s.id)===Number(p.supplierId)):clientsPP.find(c=>Number(c.id)===Number(p.clientId));
        return `<tr><td>${formatDate(p.date)}</td><td><strong>${escapeHTML(party?.name||'-')}</strong></td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(paymentInvoiceLabelsPP(p,isSupplier))}</td><td><div class="action-buttons"><button class="btn small edit" onclick="${isSupplier?`openSupplierPaymentPP(${p.supplierId},${p.id})`:`openClientPaymentPP(${p.clientId},${p.id})`}">✏️</button><button class="btn small print" onclick="printSinglePaymentPP(${p.id},${isSupplier})">🖨️</button><button class="btn small danger" onclick="${isSupplier?`deleteSupplierPaymentPP(${p.id})`:`deleteClientPaymentPP(${p.id})`}">🗑️</button></div></td></tr>`;
    }).join('');
}

function resetPaymentFiltersPP(){setValue('ppPayFrom','');setValue('ppPayTo','');setValue('ppPayMode','');setValue('ppPaySearch','');renderPaymentsCenterPP();}

function printSinglePaymentPP(id,isSupplier){
    const p=(isSupplier?supplierPaymentsPP:clientPaymentsPP).find(x=>Number(x.id)===Number(id));if(!p)return;
    const party=isSupplier?suppliers.find(s=>Number(s.id)===Number(p.supplierId)):clientsPP.find(c=>Number(c.id)===Number(p.clientId));
    printDocument(isSupplier?'Règlement fournisseur':'Encaissement client',`<div class="doc-head"><h1>Pause & Plate</h1><p>${isSupplier?'Règlement fournisseur':'Encaissement client'}</p></div>${detailRowsHTML([['Date',formatDate(p.date)],['Nom',party?.name||'-'],['Montant',formatMoney(p.amount)],['Mode',p.mode||'-'],['Référence',p.reference||'-'],['Facture(s)',paymentInvoiceLabelsPP(p,isSupplier)],['Observation',p.note||'-']])}`);
}

function printPaymentsCenterPP(){
    const isSupplier=ppActivePaymentTab==='suppliers',rows=filteredPaymentsPP().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const body=rows.map(p=>{const party=isSupplier?suppliers.find(s=>Number(s.id)===Number(p.supplierId)):clientsPP.find(c=>Number(c.id)===Number(p.clientId));return `<tr><td>${formatDate(p.date)}</td><td>${escapeHTML(party?.name||'-')}</td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(paymentInvoiceLabelsPP(p,isSupplier))}</td></tr>`;}).join('');
    printDocument(isSupplier?'Règlements fournisseurs':'Règlements clients',`<div class="doc-head"><h1>Pause & Plate</h1><p>${isSupplier?'Règlements fournisseurs':'Règlements clients'}</p></div><p><strong>Total :</strong> ${formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0))}</p><table><thead><tr><th>Date</th><th>${isSupplier?'Fournisseur':'Client'}</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Facture(s)</th></tr></thead><tbody>${body||'<tr><td colspan="6">Aucune donnée</td></tr>'}</tbody></table>`);
}


/* =========================================================
   FOURNISSEURS — SOUS-MENU LISTE / RÈGLEMENTS
========================================================= */
let ppSupplierSubtab = 'list';

function ensureSupplierSubmenuPP(){
    const page=document.getElementById('suppliersPage');
    if(!page || document.getElementById('ppSupplierSubmenu')) return;

    const nav=document.createElement('div');
    nav.id='ppSupplierSubmenu';
    nav.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px';
    nav.innerHTML=`
      <button id="ppSupplierTabList" type="button" class="btn primary" onclick="showSupplierSubtabPP('list')">Fournisseurs</button>
      <button id="ppSupplierTabPayments" type="button" class="btn" onclick="showSupplierSubtabPP('payments')">Règlements fournisseurs</button>`;
    page.prepend(nav);

    // Wrap existing supplier content except submenu.
    const content=document.createElement('div');
    content.id='ppSupplierListContent';
    const children=[...page.children].filter(el=>el!==nav);
    children.forEach(el=>content.appendChild(el));
    page.appendChild(content);

    const payments=document.createElement('div');
    payments.id='ppSupplierPaymentsContent';
    payments.style.display='none';
    payments.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <div><h2 style="margin:0">Règlements fournisseurs</h2><p style="margin:4px 0 0;color:#667085">Historique des règlements fournisseurs saisis.</p></div>
        <button class="btn print" onclick="printSupplierPaymentsListPP()">🖨️ Imprimer la liste</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:14px">
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppSupplierPayFrom" type="date" onchange="renderSupplierPaymentsPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppSupplierPayTo" type="date" onchange="renderSupplierPaymentsPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode</label><select id="ppSupplierPayMode" onchange="renderSupplierPaymentsPP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Recherche</label><input id="ppSupplierPaySearch" placeholder="Fournisseur, référence, facture..." oninput="renderSupplierPaymentsPP()" style="width:100%;padding:9px"></div>
      </div>
      <div class="stat-card" style="padding:15px;margin-bottom:14px"><div style="color:#667085">Total règlements affichés</div><strong id="ppSupplierPaymentsTotal" style="font-size:22px">0 DH</strong></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:980px"><thead><tr><th>Date</th><th>Fournisseur</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Facture(s) affectée(s)</th><th>Actions</th></tr></thead><tbody id="ppSupplierPaymentsTable"></tbody></table>
      </div>`;
    page.appendChild(payments);
}

function showSupplierSubtabPP(tab){
    ppSupplierSubtab=tab;
    ensureSupplierSubmenuPP();
    const list=document.getElementById('ppSupplierListContent');
    const pay=document.getElementById('ppSupplierPaymentsContent');
    if(list) list.style.display=tab==='list'?'block':'none';
    if(pay) pay.style.display=tab==='payments'?'block':'none';
    document.getElementById('ppSupplierTabList')?.classList.toggle('primary',tab==='list');
    document.getElementById('ppSupplierTabPayments')?.classList.toggle('primary',tab==='payments');
    if(tab==='payments') renderSupplierPaymentsPP();
}

function supplierPaymentInvoiceLabelsPP(p){
    return (p.allocations||[]).map(a=>{
        const inv=invoices.find(i=>Number(i.id)===Number(a.invoiceId));
        return `${inv?.number||'Facture'} (${formatMoney(a.amount||0)})`;
    }).join(' / ')||'-';
}

function filteredSupplierPaymentsPP(){
    const from=getValue('ppSupplierPayFrom'),to=getValue('ppSupplierPayTo'),mode=getValue('ppSupplierPayMode'),q=normalizeText(getValue('ppSupplierPaySearch'));
    return supplierPaymentsPP.filter(p=>{
        const d=String(p.date||'').slice(0,10);
        if(from&&d<from)return false;if(to&&d>to)return false;if(mode&&String(p.mode)!==mode)return false;
        const s=suppliers.find(x=>Number(x.id)===Number(p.supplierId));
        const hay=normalizeText(`${s?.name||''} ${p.reference||''} ${supplierPaymentInvoiceLabelsPP(p)}`);
        return !q||hay.includes(q);
    });
}

function renderSupplierPaymentsPP(){
    ensureSupplierSubmenuPP();
    const table=document.getElementById('ppSupplierPaymentsTable'); if(!table)return;
    const rows=filteredSupplierPaymentsPP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    setText('ppSupplierPaymentsTotal',formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0)));
    if(!rows.length){table.innerHTML='<tr><td colspan="7" class="empty">Aucun règlement fournisseur enregistré.</td></tr>';return;}
    table.innerHTML=rows.map(p=>{
        const s=suppliers.find(x=>Number(x.id)===Number(p.supplierId));
        return `<tr><td>${formatDate(p.date)}</td><td><strong>${escapeHTML(s?.name||'-')}</strong></td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(supplierPaymentInvoiceLabelsPP(p))}</td><td><div class="action-buttons"><button class="btn small edit" onclick="openSupplierPaymentPP(${p.supplierId},${p.id})">✏️</button><button class="btn small print" onclick="printSingleSupplierPaymentPP(${p.id})">🖨️</button><button class="btn small danger" onclick="deleteSupplierPaymentPP(${p.id})">🗑️</button></div></td></tr>`;
    }).join('');
}

function printSingleSupplierPaymentPP(id){
    const p=supplierPaymentsPP.find(x=>Number(x.id)===Number(id)); if(!p)return;
    const s=suppliers.find(x=>Number(x.id)===Number(p.supplierId));
    printDocument('Règlement fournisseur',`<div class="doc-head"><h1>Pause & Plate</h1><p>Règlement fournisseur</p></div>${detailRowsHTML([['Date',formatDate(p.date)],['Fournisseur',s?.name||'-'],['Montant',formatMoney(p.amount)],['Mode',p.mode||'-'],['Référence',p.reference||'-'],['Facture(s)',supplierPaymentInvoiceLabelsPP(p)],['Observation',p.note||'-']])}`);
}
function printSupplierPaymentsListPP(){
    const rows=filteredSupplierPaymentsPP().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const body=rows.map(p=>{const s=suppliers.find(x=>Number(x.id)===Number(p.supplierId));return `<tr><td>${formatDate(p.date)}</td><td>${escapeHTML(s?.name||'-')}</td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(supplierPaymentInvoiceLabelsPP(p))}</td></tr>`;}).join('');
    printDocument('Règlements fournisseurs',`<div class="doc-head"><h1>Pause & Plate</h1><p>Règlements fournisseurs</p></div><p><strong>Total :</strong> ${formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0))}</p><table><thead><tr><th>Date</th><th>Fournisseur</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Facture(s)</th></tr></thead><tbody>${body||'<tr><td colspan="6">Aucune donnée</td></tr>'}</tbody></table>`);
}



/* =========================================================
   CLIENTS — SOUS-MENU LISTE / RÈGLEMENTS
========================================================= */
let ppClientSubtab='list';

function ensureClientSubmenuPP(){
    const page=document.getElementById('clientsPage');
    if(!page || document.getElementById('ppClientSubmenu')) return;

    const nav=document.createElement('div');
    nav.id='ppClientSubmenu';
    nav.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px';
    nav.innerHTML=`
      <button id="ppClientTabList" type="button" class="btn primary" onclick="showClientSubtabPP('list')">Clients</button>
      <button id="ppClientTabPayments" type="button" class="btn" onclick="showClientSubtabPP('payments')">Règlements clients</button>`;
    page.prepend(nav);

    const content=document.createElement('div');
    content.id='ppClientListContent';
    const children=[...page.children].filter(el=>el!==nav);
    children.forEach(el=>content.appendChild(el));
    page.appendChild(content);

    const payments=document.createElement('div');
    payments.id='ppClientPaymentsContent';
    payments.style.display='none';
    payments.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <div><h2 style="margin:0">Règlements clients</h2><p style="margin:4px 0 0;color:#667085">Historique des encaissements clients saisis.</p></div>
        <button class="btn print" onclick="printClientPaymentsListPP()">🖨️ Imprimer la liste</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:14px">
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppClientPayFrom" type="date" onchange="renderClientPaymentsPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppClientPayTo" type="date" onchange="renderClientPaymentsPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode</label><select id="ppClientPayMode" onchange="renderClientPaymentsPP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Recherche</label><input id="ppClientPaySearch" placeholder="Client, référence, facture..." oninput="renderClientPaymentsPP()" style="width:100%;padding:9px"></div>
      </div>
      <div class="stat-card" style="padding:15px;margin-bottom:14px"><div style="color:#667085">Total encaissements affichés</div><strong id="ppClientPaymentsTotal" style="font-size:22px">0 DH</strong></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:980px"><thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Facture(s) affectée(s)</th><th>Actions</th></tr></thead><tbody id="ppClientPaymentsTable"></tbody></table>
      </div>`;
    page.appendChild(payments);
}

function showClientSubtabPP(tab){
    ppClientSubtab=tab;
    ensureClientSubmenuPP();
    const list=document.getElementById('ppClientListContent');
    const pay=document.getElementById('ppClientPaymentsContent');
    if(list) list.style.display=tab==='list'?'block':'none';
    if(pay) pay.style.display=tab==='payments'?'block':'none';
    document.getElementById('ppClientTabList')?.classList.toggle('primary',tab==='list');
    document.getElementById('ppClientTabPayments')?.classList.toggle('primary',tab==='payments');
    if(tab==='payments')renderClientPaymentsPP();
}

function clientPaymentInvoiceLabelsPP(p){
    return (p.allocations||[]).map(a=>{
        const inv=clientInvoicesPP.find(i=>Number(i.id)===Number(a.invoiceId));
        return `${inv?.number||'Facture'} (${formatMoney(a.amount||0)})`;
    }).join(' / ')||'-';
}

function filteredClientPaymentsPP(){
    const from=getValue('ppClientPayFrom'),to=getValue('ppClientPayTo'),mode=getValue('ppClientPayMode'),q=normalizeText(getValue('ppClientPaySearch'));
    return clientPaymentsPP.filter(p=>{
        const d=String(p.date||'').slice(0,10);
        if(from&&d<from)return false;if(to&&d>to)return false;if(mode&&String(p.mode)!==mode)return false;
        const c=clientsPP.find(x=>Number(x.id)===Number(p.clientId));
        const hay=normalizeText(`${c?.name||''} ${p.reference||''} ${clientPaymentInvoiceLabelsPP(p)}`);
        return !q||hay.includes(q);
    });
}

function renderClientPaymentsPP(){
    ensureClientSubmenuPP();
    const table=document.getElementById('ppClientPaymentsTable');if(!table)return;
    const rows=filteredClientPaymentsPP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    setText('ppClientPaymentsTotal',formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0)));
    if(!rows.length){table.innerHTML='<tr><td colspan="7" class="empty">Aucun règlement client enregistré.</td></tr>';return;}
    table.innerHTML=rows.map(p=>{
        const c=clientsPP.find(x=>Number(x.id)===Number(p.clientId));
        return `<tr><td>${formatDate(p.date)}</td><td><strong>${escapeHTML(c?.name||'-')}</strong></td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(clientPaymentInvoiceLabelsPP(p))}</td><td><div class="action-buttons"><button class="btn small edit" onclick="openClientPaymentPP(${p.clientId},${p.id})">✏️</button><button class="btn small print" onclick="printSingleClientPaymentPP(${p.id})">🖨️</button><button class="btn small danger" onclick="deleteClientPaymentPP(${p.id})">🗑️</button></div></td></tr>`;
    }).join('');
}

function printSingleClientPaymentPP(id){
    const p=clientPaymentsPP.find(x=>Number(x.id)===Number(id));if(!p)return;
    const c=clientsPP.find(x=>Number(x.id)===Number(p.clientId));
    printDocument('Règlement client',`<div class="doc-head"><h1>Pause & Plate</h1><p>Règlement client</p></div>${detailRowsHTML([['Date',formatDate(p.date)],['Client',c?.name||'-'],['Montant',formatMoney(p.amount)],['Mode',p.mode||'-'],['Référence',p.reference||'-'],['Facture(s)',clientPaymentInvoiceLabelsPP(p)]])}`);
}
function printClientPaymentsListPP(){
    const rows=filteredClientPaymentsPP().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const body=rows.map(p=>{const c=clientsPP.find(x=>Number(x.id)===Number(p.clientId));return `<tr><td>${formatDate(p.date)}</td><td>${escapeHTML(c?.name||'-')}</td><td>${formatMoney(p.amount)}</td><td>${escapeHTML(p.mode||'-')}</td><td>${escapeHTML(p.reference||'-')}</td><td>${escapeHTML(clientPaymentInvoiceLabelsPP(p))}</td></tr>`;}).join('');
    printDocument('Règlements clients',`<div class="doc-head"><h1>Pause & Plate</h1><p>Règlements clients</p></div><p><strong>Total :</strong> ${formatMoney(rows.reduce((a,p)=>a+Number(p.amount||0),0))}</p><table><thead><tr><th>Date</th><th>Client</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Facture(s)</th></tr></thead><tbody>${body||'<tr><td colspan="6">Aucune donnée</td></tr>'}</tbody></table>`);
}




function hideLegacyModuleContentPP(page,moduleId){
    if(!page)return;
    [...page.children].forEach(el=>{
        if(el.id!==moduleId) el.style.display='none';
    });
}

/* =========================================================
   MODULE VENTES
   Toutes les ventes = TVA 10% et alimentent TVA Collectée
========================================================= */
function ensureSalesModulePP(){
    const page=document.getElementById('salesPage');if(!page)return;
    hideLegacyModuleContentPP(page,'ppSalesModule');
    let wrap=document.getElementById('ppSalesModule');
    if(wrap){wrap.style.display='block';return;}
    wrap=document.createElement('div');wrap.id='ppSalesModule';
    wrap.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><h2 style="margin:0 0 4px">Gestion des ventes</h2><p style="margin:0;color:#667085">Les montants HT et TVA 10% sont calculés automatiquement à partir du TTC.</p></div>
        <div style="display:flex;gap:8px"><button class="btn primary" onclick="openSalePP()">➕ Nouvelle vente</button><button class="btn print" onclick="printSalesPP()">🖨️ Imprimer</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:15px">
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppSalesFrom" type="date" onchange="renderSalesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppSalesTo" type="date" onchange="renderSalesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode</label><select id="ppSalesMode" onchange="renderSalesPP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Recherche</label><input id="ppSalesSearch" placeholder="N° pièce / client..." oninput="renderSalesPP()" style="width:100%;padding:9px"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px">
        <div class="stat-card" style="padding:15px"><div style="color:#667085">CA HT</div><strong id="ppSalesHT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">TVA collectée 10%</div><strong id="ppSalesVAT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">CA TTC</div><strong id="ppSalesTTC" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Nombre de ventes</div><strong id="ppSalesCount" style="font-size:22px">0</strong></div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:1050px"><thead><tr><th>Date</th><th>N° pièce</th><th>Client / Vente</th><th>HT</th><th>TVA 10%</th><th>TTC</th><th>Mode</th><th>Date encaissement</th><th>Actions</th></tr></thead><tbody id="ppSalesTable"></tbody></table>
      </div>`;
    page.appendChild(wrap);
}

function filteredSalesModulePP(){
    const from=getValue('ppSalesFrom'),to=getValue('ppSalesTo'),mode=getValue('ppSalesMode'),q=normalizeText(getValue('ppSalesSearch'));
    return salesPP.filter(s=>{const d=String(s.date||'').slice(0,10);if(from&&d<from)return false;if(to&&d>to)return false;if(mode&&String(s.mode)!==mode)return false;if(q&&!normalizeText(`${s.number||''} ${s.client||''}`).includes(q))return false;return true;});
}
function renderSalesPP(){
    ensureSalesModulePP();const table=document.getElementById('ppSalesTable');if(!table)return;
    const rows=filteredSalesModulePP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const ttc=rows.reduce((a,s)=>a+Number(s.totalTTC||0),0),ht=ttc/1.10,vat=ttc-ht;
    setText('ppSalesHT',formatMoney(ht));setText('ppSalesVAT',formatMoney(vat));setText('ppSalesTTC',formatMoney(ttc));setText('ppSalesCount',String(rows.length));
    if(!rows.length){table.innerHTML='<tr><td colspan="9" class="empty">Aucune vente enregistrée.</td></tr>';return;}
    table.innerHTML=rows.map(s=>{const sttc=Number(s.totalTTC||0),sht=sttc/1.10,svat=sttc-sht;return `<tr><td>${formatDate(s.date)}</td><td>${escapeHTML(s.number||'-')}</td><td>${escapeHTML(s.client||'Ventes comptoir')}</td><td>${formatMoney(sht)}</td><td>${formatMoney(svat)}</td><td><strong>${formatMoney(sttc)}</strong></td><td>${escapeHTML(s.mode||'-')}</td><td>${s.paymentDate?formatDate(s.paymentDate):'-'}</td><td><div class="action-buttons"><button class="btn small edit" onclick="openSalePP(${s.id})">✏️</button><button class="btn small print" onclick="printSingleSalePP(${s.id})">🖨️</button><button class="btn small danger" onclick="deleteSalePP(${s.id})">🗑️</button></div></td></tr>`;}).join('');
}
function printSingleSalePP(id){const s=salesPP.find(x=>Number(x.id)===Number(id));if(!s)return;const ttc=Number(s.totalTTC||0),ht=ttc/1.10,vat=ttc-ht;printDocument('Vente '+(s.number||''),`<div class="doc-head"><h1>Pause & Plate</h1><p>Pièce de vente</p></div>${detailRowsHTML([['Date',formatDate(s.date)],['N° pièce',s.number||'-'],['Client / Vente',s.client||'Ventes comptoir'],['Montant HT',formatMoney(ht)],['TVA 10%',formatMoney(vat)],['Montant TTC',formatMoney(ttc)],['Mode',s.mode||'-'],['Date encaissement',s.paymentDate?formatDate(s.paymentDate):'-']])}`);}
function printSalesPP(){const rows=filteredSalesModulePP().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));const ttc=rows.reduce((a,s)=>a+Number(s.totalTTC||0),0),ht=ttc/1.10,vat=ttc-ht;const body=rows.map(s=>{const sttc=Number(s.totalTTC||0),sht=sttc/1.10,svat=sttc-sht;return `<tr><td>${formatDate(s.date)}</td><td>${escapeHTML(s.number||'-')}</td><td>${escapeHTML(s.client||'Ventes comptoir')}</td><td>${formatMoney(sht)}</td><td>${formatMoney(svat)}</td><td>${formatMoney(sttc)}</td><td>${escapeHTML(s.mode||'-')}</td></tr>`;}).join('');printDocument('Ventes',`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation des ventes</p></div>${detailRowsHTML([['CA HT',formatMoney(ht)],['TVA collectée 10%',formatMoney(vat)],['CA TTC',formatMoney(ttc)]])}<table><thead><tr><th>Date</th><th>N° pièce</th><th>Client / Vente</th><th>HT</th><th>TVA</th><th>TTC</th><th>Mode</th></tr></thead><tbody>${body||'<tr><td colspan="7">Aucune vente</td></tr>'}</tbody></table>`);}

/* =========================================================
   MODULE DÉPENSES
   Hors achats de stock/factures fournisseurs
========================================================= */
const PP_EXPENSE_CATEGORIES=['Loyer','Salaires','CNSS','Eau & Électricité','Internet','Entretien & Réparation','Transport','Fournitures','Marketing & Publicité','Honoraires','Frais bancaires','Taxes & Impôts','Autre'];

function ensureExpensesModulePP(){
    const page=document.getElementById('expensesPage');if(!page)return;
    hideLegacyModuleContentPP(page,'ppExpensesModule');
    const existing=document.getElementById('ppExpensesModule');
    if(existing){existing.style.display='block';return;}
    const wrap=document.createElement('div');wrap.id='ppExpensesModule';
    wrap.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><h2 style="margin:0 0 4px">Gestion des dépenses</h2><p style="margin:0;color:#667085">Charges et dépenses hors achats de stock déjà enregistrés dans Achats & Factures.</p></div>
        <div style="display:flex;gap:8px"><button class="btn primary" onclick="openExpensePP()">➕ Nouvelle dépense</button><button class="btn print" onclick="printExpensesPP()">🖨️ Imprimer</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:15px">
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppExpFrom" type="date" onchange="renderExpensesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppExpTo" type="date" onchange="renderExpensesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Catégorie</label><select id="ppExpCategoryFilter" onchange="renderExpensesPP()" style="width:100%;padding:9px"><option value="">Toutes</option>${PP_EXPENSE_CATEGORIES.map(x=>`<option>${x}</option>`).join('')}</select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode</label><select id="ppExpModeFilter" onchange="renderExpensesPP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Prélèvement</option><option>Autre</option></select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Recherche</label><input id="ppExpSearch" placeholder="Bénéficiaire, référence..." oninput="renderExpensesPP()" style="width:100%;padding:9px"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px">
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Total HT</div><strong id="ppExpHT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">TVA déductible</div><strong id="ppExpVAT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Total TTC</div><strong id="ppExpTotal" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Nombre d'opérations</div><strong id="ppExpCount" style="font-size:22px">0</strong></div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:15px;overflow:auto"><h3 style="margin-top:0">Récapitulatif par catégorie</h3><table style="width:100%;min-width:520px"><thead><tr><th>Catégorie</th><th>Nombre</th><th>Montant</th></tr></thead><tbody id="ppExpSummary"></tbody></table></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto"><table style="width:100%;min-width:1450px"><thead><tr><th>Date</th><th>Catégorie</th><th>Bénéficiaire</th><th>ICE</th><th>Libellé</th><th>HT</th><th>Taux TVA</th><th>TVA</th><th>TTC</th><th>Mode</th><th>Date règlement</th><th>Référence</th><th>Actions</th></tr></thead><tbody id="ppExpensesTable"></tbody></table></div>`;
    page.appendChild(wrap);ensureExpenseModalPP();
}
function ensureExpenseModalPP(){
    if(document.getElementById('ppExpenseModal'))return;
    const m=document.createElement('div');m.id='ppExpenseModal';m.className='modal-overlay';
    m.innerHTML=`<div class="modal"><div class="modal-header"><h2 id="ppExpenseTitle">Nouvelle dépense</h2><button onclick="closeModal('ppExpenseModal')">×</button></div>
    <form id="ppExpenseForm"><input type="hidden" id="ppExpenseId">
      <div class="form-grid">
        <div><label>Date dépense</label><input id="ppExpenseDate" type="date" required></div>
        <div><label>Catégorie</label><select id="ppExpenseCategory" required>${PP_EXPENSE_CATEGORIES.map(x=>`<option>${x}</option>`).join('')}</select></div>
        <div><label>Bénéficiaire / Fournisseur</label><input id="ppExpenseBeneficiary" placeholder="Ex: ONEE, Maroc Telecom, Banque..."></div>
        <div><label>ICE (optionnel)</label><input id="ppExpenseIce"></div>
        <div><label>N° pièce / Référence</label><input id="ppExpenseReference"></div>
        <div><label>Taux TVA</label><select id="ppExpenseVatRate" onchange="recalcExpenseFromTTC_PP()"><option value="0">0%</option><option value="7">7%</option><option value="10">10%</option><option value="14">14%</option><option value="20">20%</option></select></div>
        <div><label>Montant HT</label><input id="ppExpenseHT" type="number" min="0" step="0.01" oninput="recalcExpenseFromHT_PP()"></div>
        <div><label>Montant TVA</label><input id="ppExpenseVAT" type="number" step="0.01" readonly></div>
        <div><label>Montant TTC</label><input id="ppExpenseTTC" type="number" min="0.01" step="0.01" required oninput="recalcExpenseFromTTC_PP()"></div>
        <div><label>Mode de paiement</label><select id="ppExpenseMode"><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Prélèvement</option><option>Autre</option></select></div>
        <div><label>Date règlement</label><input id="ppExpensePaymentDate" type="date" required></div>
      </div>
      <div><label>Libellé / Observation</label><textarea id="ppExpenseLabel"></textarea></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppExpenseModal')">Annuler</button><button class="btn primary">Enregistrer</button></div>
    </form></div>`;
    document.body.appendChild(m);document.getElementById('ppExpenseForm').addEventListener('submit',e=>{e.preventDefault();saveExpensePP();});
}

function recalcExpenseFromTTC_PP(){
    const ttc=Number(getValue('ppExpenseTTC')||0),rate=Number(getValue('ppExpenseVatRate')||0);
    const ht=rate>0?ttc/(1+rate/100):ttc;
    const vat=ttc-ht;
    setValue('ppExpenseHT',ht?ht.toFixed(2):'0.00');
    setValue('ppExpenseVAT',vat?vat.toFixed(2):'0.00');
}
function recalcExpenseFromHT_PP(){
    const ht=Number(getValue('ppExpenseHT')||0),rate=Number(getValue('ppExpenseVatRate')||0);
    const vat=ht*rate/100,ttc=ht+vat;
    setValue('ppExpenseVAT',vat.toFixed(2));
    setValue('ppExpenseTTC',ttc.toFixed(2));
}

function openExpensePP(id=null){
    ensureExpenseModalPP();
    const e=id?expensesPP.find(x=>Number(x.id)===Number(id)):null;
    const today=new Date().toISOString().slice(0,10);
    const ttc=Number(e?.totalTTC ?? e?.amount ?? 0),rate=Number(e?.vatRate??0);
    const ht=Number(e?.totalHT ?? (rate>0?ttc/(1+rate/100):ttc)),vat=Number(e?.vatAmount ?? (ttc-ht));
    setValue('ppExpenseId',e?.id||'');setValue('ppExpenseDate',e?.date||today);setValue('ppExpenseCategory',e?.category||'Loyer');
    setValue('ppExpenseBeneficiary',e?.beneficiary||'');setValue('ppExpenseIce',e?.ice||'');setValue('ppExpenseReference',e?.reference||'');
    setValue('ppExpenseVatRate',rate);setValue('ppExpenseHT',ht?ht.toFixed(2):'');setValue('ppExpenseVAT',vat?vat.toFixed(2):'0.00');setValue('ppExpenseTTC',ttc?ttc.toFixed(2):'');
    setValue('ppExpenseMode',e?.mode||'Espèces');setValue('ppExpensePaymentDate',e?.paymentDate||e?.date||today);setValue('ppExpenseLabel',e?.label||'');
    setText('ppExpenseTitle',e?'Modifier la dépense':'Nouvelle dépense');openModal('ppExpenseModal');
}

function saveExpensePP(){
    const id=Number(getValue('ppExpenseId'))||null;
    const totalTTC=Number(getValue('ppExpenseTTC')||0),vatRate=Number(getValue('ppExpenseVatRate')||0);
    if(!(totalTTC>0))return;
    const totalHT=vatRate>0?totalTTC/(1+vatRate/100):totalTTC,vatAmount=totalTTC-totalHT;
    const old=id?expensesPP.find(x=>Number(x.id)===id):null;
    const obj={id:id||createId(),date:getValue('ppExpenseDate'),category:getValue('ppExpenseCategory'),beneficiary:getValue('ppExpenseBeneficiary').trim(),ice:getValue('ppExpenseIce').trim(),reference:getValue('ppExpenseReference').trim(),totalHT,vatRate,vatAmount,totalTTC,amount:totalTTC,mode:getValue('ppExpenseMode'),paymentDate:getValue('ppExpensePaymentDate'),label:getValue('ppExpenseLabel').trim(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(id){const n=expensesPP.findIndex(x=>Number(x.id)===id);if(n>=0)expensesPP[n]=obj;}else expensesPP.unshift(obj);
    saveData();closeModal('ppExpenseModal');renderExpensesPP();renderTVAAchatsPP();renderTVASituationPP();
}
function deleteExpensePP(id){
    if(!confirm('Supprimer cette dépense ?'))return;
    expensesPP=expensesPP.filter(x=>Number(x.id)!==Number(id));saveData();renderExpensesPP();renderTVAAchatsPP();renderTVASituationPP();
}
function filteredExpensesPP(){
    const from=getValue('ppExpFrom'),to=getValue('ppExpTo'),cat=getValue('ppExpCategoryFilter'),mode=getValue('ppExpModeFilter'),q=normalizeText(getValue('ppExpSearch'));
    return expensesPP.filter(e=>{const d=String(e.date||'').slice(0,10);if(from&&d<from)return false;if(to&&d>to)return false;if(cat&&e.category!==cat)return false;if(mode&&e.mode!==mode)return false;if(q&&!normalizeText(`${e.beneficiary||''} ${e.reference||''} ${e.label||''} ${e.ice||''}`).includes(q))return false;return true;});
}
function renderExpensesPP(){
    ensureExpensesModulePP();const table=document.getElementById('ppExpensesTable');if(!table)return;
    const rows=filteredExpensesPP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const ht=rows.reduce((a,e)=>a+Number(e.totalHT||0),0),vat=rows.reduce((a,e)=>a+Number(e.vatAmount||0),0),ttc=rows.reduce((a,e)=>a+Number(e.totalTTC??e.amount??0),0);
    setText('ppExpHT',formatMoney(ht));setText('ppExpVAT',formatMoney(vat));setText('ppExpTotal',formatMoney(ttc));setText('ppExpCount',String(rows.length));
    const summary=document.getElementById('ppExpSummary');
    summary.innerHTML=PP_EXPENSE_CATEGORIES.map(cat=>{const rr=rows.filter(e=>e.category===cat);if(!rr.length)return '';return `<tr><td>${escapeHTML(cat)}</td><td>${rr.length}</td><td><strong>${formatMoney(rr.reduce((a,e)=>a+Number(e.totalTTC??e.amount??0),0))}</strong></td></tr>`;}).join('')||'<tr><td colspan="3">Aucune donnée</td></tr>';
    if(!rows.length){table.innerHTML='<tr><td colspan="13" class="empty">Aucune dépense enregistrée.</td></tr>';return;}
    table.innerHTML=rows.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${escapeHTML(e.category)}</td><td>${escapeHTML(e.beneficiary||'-')}</td><td>${escapeHTML(e.ice||'-')}</td><td>${escapeHTML(e.label||'-')}</td><td>${formatMoney(e.totalHT||0)}</td><td><strong>${formatNumber(e.vatRate||0)}%</strong></td><td>${formatMoney(e.vatAmount||0)}</td><td><strong>${formatMoney(e.totalTTC??e.amount??0)}</strong></td><td>${escapeHTML(e.mode||'-')}</td><td>${e.paymentDate?formatDate(e.paymentDate):'-'}</td><td>${escapeHTML(e.reference||'-')}</td><td><div class="action-buttons"><button class="btn small edit" onclick="openExpensePP(${e.id})">✏️</button><button class="btn small print" onclick="printSingleExpensePP(${e.id})">🖨️</button><button class="btn small danger" onclick="deleteExpensePP(${e.id})">🗑️</button></div></td></tr>`).join('');
}
function printSingleExpensePP(id){
    const e=expensesPP.find(x=>Number(x.id)===Number(id));if(!e)return;
    printDocument('Dépense',`<div class="doc-head"><h1>Pause & Plate</h1><p>Pièce de dépense</p></div>${detailRowsHTML([['Date',formatDate(e.date)],['Catégorie',e.category],['Bénéficiaire',e.beneficiary||'-'],['ICE',e.ice||'-'],['Libellé',e.label||'-'],['Montant HT',formatMoney(e.totalHT||0)],['Taux TVA',formatNumber(e.vatRate||0)+'%'],['Montant TVA',formatMoney(e.vatAmount||0)],['Montant TTC',formatMoney(e.totalTTC??e.amount??0)],['Mode',e.mode||'-'],['Date règlement',e.paymentDate?formatDate(e.paymentDate):'-'],['Référence',e.reference||'-']])}`);
}
function printExpensesPP(){
    const rows=filteredExpensesPP().slice().sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    const ht=rows.reduce((a,e)=>a+Number(e.totalHT||0),0),vat=rows.reduce((a,e)=>a+Number(e.vatAmount||0),0),ttc=rows.reduce((a,e)=>a+Number(e.totalTTC??e.amount??0),0);
    const body=rows.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${escapeHTML(e.category)}</td><td>${escapeHTML(e.beneficiary||'-')}</td><td>${formatMoney(e.totalHT||0)}</td><td>${formatNumber(e.vatRate||0)}%</td><td>${formatMoney(e.vatAmount||0)}</td><td>${formatMoney(e.totalTTC??e.amount??0)}</td><td>${escapeHTML(e.mode||'-')}</td></tr>`).join('');
    printDocument('Dépenses',`<div class="doc-head"><h1>Pause & Plate</h1><p>Situation des dépenses</p></div>${detailRowsHTML([['Total HT',formatMoney(ht)],['TVA',formatMoney(vat)],['Total TTC',formatMoney(ttc)]])}<table><thead><tr><th>Date</th><th>Catégorie</th><th>Bénéficiaire</th><th>HT</th><th>Taux</th><th>TVA</th><th>TTC</th><th>Mode</th></tr></thead><tbody>${body||'<tr><td colspan="8">Aucune dépense</td></tr>'}</tbody></table>`);
}


/* =========================================================
   FICHES TECHNIQUES — RECETTES & COÛT MATIÈRE
========================================================= */
const PP_RECIPE_CATEGORIES=['Entrée','Plat','Pizza','Sushi','Tacos','Burger','Sandwich','Salade','Dessert','Boisson','Petit-déjeuner','Autre'];

function ensureRecipesModulePP(){
    const page=document.getElementById('recipesPage');if(!page)return;
    hideLegacyModuleContentPP(page,'ppRecipesModule');
    let wrap=document.getElementById('ppRecipesModule');
    if(wrap){wrap.style.display='block';return;}
    wrap=document.createElement('div');wrap.id='ppRecipesModule';
    wrap.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><h2 style="margin:0 0 4px">🍽️ Fiches Techniques</h2><p style="margin:0;color:#667085">Recettes, grammages, coût matière et marge.</p></div>
        <button class="btn primary" onclick="openRecipePP()">➕ Nouvelle fiche technique</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,280px);gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:15px">
        <input id="ppRecipeSearch" placeholder="🔎 Rechercher une fiche..." oninput="renderRecipesPP()" style="padding:10px">
        <select id="ppRecipeCategoryFilter" onchange="renderRecipesPP()" style="padding:10px"><option value="">Toutes les catégories</option>${PP_RECIPE_CATEGORIES.map(x=>`<option>${x}</option>`).join('')}</select>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px">
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Fiches techniques</div><strong id="ppRecipeCount" style="font-size:22px">0</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Coût matière moyen</div><strong id="ppRecipeAvgCost" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Food cost moyen</div><strong id="ppRecipeAvgPct" style="font-size:22px">0%</strong></div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:1150px"><thead><tr><th>Plat / Produit fini</th><th>Catégorie</th><th>Prix vente</th><th>Coût matière</th><th>Food cost</th><th>Marge brute</th><th>Prix conseillé</th><th>Ingrédients</th><th>Actions</th></tr></thead><tbody id="ppRecipesTable"></tbody></table>
      </div>`;
    page.appendChild(wrap);ensureRecipeModalPP();
}
function recipeIngredientCostPP(i){const p=products.find(x=>Number(x.id)===Number(i.productId));return Number(i.quantity||0)*Number(p?.price||i.unitPrice||0);}
function recipeTotalsPP(r){const cost=(r.ingredients||[]).reduce((a,i)=>a+recipeIngredientCostPP(i),0),sale=Number(r.salePrice||0),pct=sale>0?cost/sale*100:0,margin=sale-cost;return {cost,sale,pct,margin,recommended:cost>0?cost/0.30:0};}
function renderRecipesPP(){
    ensureRecipesModulePP();const tb=document.getElementById('ppRecipesTable');if(!tb)return;
    const q=normalizeText(getValue('ppRecipeSearch')),cat=getValue('ppRecipeCategoryFilter');
    const rows=recipesPP.filter(r=>(!q||normalizeText(r.name).includes(q))&&(!cat||r.category===cat));
    setText('ppRecipeCount',String(rows.length));
    const totals=rows.map(recipeTotalsPP);setText('ppRecipeAvgCost',formatMoney(totals.length?totals.reduce((a,t)=>a+t.cost,0)/totals.length:0));setText('ppRecipeAvgPct',formatNumber(totals.length?totals.reduce((a,t)=>a+t.pct,0)/totals.length:0)+'%');
    if(!rows.length){tb.innerHTML='<tr><td colspan="9" class="empty">Aucune fiche technique enregistrée.</td></tr>';return;}
    tb.innerHTML=rows.map(r=>{const t=recipeTotalsPP(r);return `<tr><td><strong>${escapeHTML(r.name)}</strong></td><td>${escapeHTML(r.category||'-')}</td><td>${formatMoney(t.sale)}</td><td><strong>${formatMoney(t.cost)}</strong></td><td><span class="status ${t.pct<=30?'success':t.pct<=35?'warning':'danger'}">${formatNumber(t.pct)}%</span></td><td>${formatMoney(t.margin)}</td><td>${formatMoney(t.recommended)}</td><td>${(r.ingredients||[]).length}</td><td><div class="action-buttons"><button class="btn small view" onclick="viewRecipePP(${r.id})">👁️</button><button class="btn small edit" onclick="openRecipePP(${r.id})">✏️</button><button class="btn small" onclick="duplicateRecipePP(${r.id})">📄</button><button class="btn small print" onclick="printRecipePP(${r.id})">🖨️</button><button class="btn small danger" onclick="deleteRecipePP(${r.id})">🗑️</button></div></td></tr>`;}).join('');
}
function ensureRecipeModalPP(){
    if(document.getElementById('ppRecipeModal'))return;
    const m=document.createElement('div');m.id='ppRecipeModal';m.className='modal-overlay';
    m.innerHTML=`<div class="modal" style="max-width:1050px"><div class="modal-header"><h2 id="ppRecipeModalTitle">Nouvelle fiche technique</h2><button onclick="closeModal('ppRecipeModal')">×</button></div>
      <form id="ppRecipeForm"><input id="ppRecipeId" type="hidden">
        <div class="form-grid"><div><label>Nom du plat / produit fini</label><input id="ppRecipeName" required></div><div><label>Catégorie</label><select id="ppRecipeCategory">${PP_RECIPE_CATEGORIES.map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Prix de vente TTC</label><input id="ppRecipeSalePrice" type="number" min="0" step="0.01" required oninput="updateRecipeTotalsPP()"></div><div><label>Nombre de portions</label><input id="ppRecipePortions" type="number" min="1" step="1" value="1"></div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px"><h3 style="margin:0">📦 Ingrédients</h3><button type="button" class="btn primary" onclick="addRecipeIngredientPP()">+ Ajouter ingrédient</button></div>
        <div id="ppRecipeIngredients"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;background:#eef6f1;padding:14px;border-radius:12px;margin-top:14px">
          <div><small>Coût matière</small><strong id="ppRecipeCost" style="display:block;font-size:20px">0 DH</strong></div>
          <div><small>Food cost</small><strong id="ppRecipePct" style="display:block;font-size:20px">0%</strong></div>
          <div><small>Marge brute</small><strong id="ppRecipeMargin" style="display:block;font-size:20px">0 DH</strong></div>
          <div><small>Prix conseillé (30%)</small><strong id="ppRecipeRecommended" style="display:block;font-size:20px">0 DH</strong></div>
        </div>
        <div><label>Préparation / Notes</label><textarea id="ppRecipeNotes" rows="4"></textarea></div>
        <div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppRecipeModal')">Annuler</button><button class="btn primary">💾 Enregistrer la fiche</button></div>
      </form></div>`;
    document.body.appendChild(m);document.getElementById('ppRecipeForm').addEventListener('submit',e=>{e.preventDefault();saveRecipePP();});
}
function recipeProductOptionsPP(selected=''){return `<option value="">Sélectionner un article du stock</option>`+products.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(p=>`<option value="${p.id}" ${Number(selected)===Number(p.id)?'selected':''}>${escapeHTML(p.name)} — ${formatMoney(p.price)}/${escapeHTML(p.unit)}</option>`).join('');}
function addRecipeIngredientPP(data={}){
    const box=document.getElementById('ppRecipeIngredients');if(!box)return;
    const row=document.createElement('div');row.className='pp-recipe-line';row.style.cssText='display:grid;grid-template-columns:minmax(240px,2fr) minmax(110px,.7fr) minmax(90px,.6fr) minmax(120px,.8fr) minmax(120px,.8fr) 55px;gap:8px;align-items:end;border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-bottom:8px';
    row.innerHTML=`<div><label>Article stock</label><select class="pp-ri-product" onchange="updateRecipeLinePP(this)">${recipeProductOptionsPP(data.productId)}</select></div><div><label>Quantité</label><input class="pp-ri-qty" type="number" min="0" step="0.000001" value="${Number(data.quantity||0)}" oninput="updateRecipeLinePP(this)"></div><div><label>Unité</label><input class="pp-ri-unit" readonly></div><div><label>Prix moyen</label><input class="pp-ri-price" readonly></div><div><label>Coût</label><input class="pp-ri-cost" readonly></div><button type="button" class="btn danger" onclick="this.closest('.pp-recipe-line').remove();updateRecipeTotalsPP()">🗑️</button>`;
    box.appendChild(row);updateRecipeLinePP(row.querySelector('.pp-ri-product'));
}
function updateRecipeLinePP(el){const row=el.closest('.pp-recipe-line'),p=products.find(x=>Number(x.id)===Number(row.querySelector('.pp-ri-product').value)),q=Number(row.querySelector('.pp-ri-qty').value||0);row.querySelector('.pp-ri-unit').value=p?.unit||'';row.querySelector('.pp-ri-price').value=p?Number(p.price||0).toFixed(4):'';row.querySelector('.pp-ri-cost').value=p?(q*Number(p.price||0)).toFixed(4):'';updateRecipeTotalsPP();}
function currentRecipeIngredientsPP(){return [...document.querySelectorAll('#ppRecipeIngredients .pp-recipe-line')].map(row=>{const productId=Number(row.querySelector('.pp-ri-product').value),quantity=Number(row.querySelector('.pp-ri-qty').value||0),p=products.find(x=>Number(x.id)===productId);return {productId,quantity,unit:p?.unit||'',unitPrice:Number(p?.price||0)};}).filter(i=>i.productId&&i.quantity>0);}
function updateRecipeTotalsPP(){const ingredients=currentRecipeIngredientsPP(),r={ingredients,salePrice:Number(getValue('ppRecipeSalePrice')||0)},t=recipeTotalsPP(r);setText('ppRecipeCost',formatMoney(t.cost));setText('ppRecipePct',formatNumber(t.pct)+'%');setText('ppRecipeMargin',formatMoney(t.margin));setText('ppRecipeRecommended',formatMoney(t.recommended));}
function openRecipePP(id=null){ensureRecipeModalPP();const r=id?recipesPP.find(x=>Number(x.id)===Number(id)):null;setValue('ppRecipeId',r?.id||'');setValue('ppRecipeName',r?.name||'');setValue('ppRecipeCategory',r?.category||'Plat');setValue('ppRecipeSalePrice',r?.salePrice||'');setValue('ppRecipePortions',r?.portions||1);setValue('ppRecipeNotes',r?.notes||'');setText('ppRecipeModalTitle',r?'Modifier la fiche technique':'Nouvelle fiche technique');document.getElementById('ppRecipeIngredients').innerHTML='';(r?.ingredients?.length?r.ingredients:[{}]).forEach(addRecipeIngredientPP);updateRecipeTotalsPP();openModal('ppRecipeModal');}
function saveRecipePP(){const id=Number(getValue('ppRecipeId'))||null,name=getValue('ppRecipeName').trim(),ingredients=currentRecipeIngredientsPP();if(!name){alert('Saisissez le nom du plat.');return;}if(!ingredients.length){alert('Ajoutez au moins un ingrédient.');return;}const old=id?recipesPP.find(x=>Number(x.id)===id):null,obj={id:id||createId(),name,category:getValue('ppRecipeCategory'),salePrice:Number(getValue('ppRecipeSalePrice')||0),portions:Number(getValue('ppRecipePortions')||1),notes:getValue('ppRecipeNotes').trim(),ingredients,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(id){const n=recipesPP.findIndex(x=>Number(x.id)===id);if(n>=0)recipesPP[n]=obj;}else recipesPP.unshift(obj);saveData();closeModal('ppRecipeModal');renderRecipesPP();}
function deleteRecipePP(id){if(!confirm('Supprimer cette fiche technique ?'))return;recipesPP=recipesPP.filter(r=>Number(r.id)!==Number(id));saveData();renderRecipesPP();}
function duplicateRecipePP(id){const r=recipesPP.find(x=>Number(x.id)===Number(id));if(!r)return;recipesPP.unshift({...JSON.parse(JSON.stringify(r)),id:createId(),name:r.name+' - Copie',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});saveData();renderRecipesPP();}
function recipeDetailsHTMLPP(r){const t=recipeTotalsPP(r),body=(r.ingredients||[]).map(i=>{const p=products.find(x=>Number(x.id)===Number(i.productId)),price=Number(p?.price||i.unitPrice||0);return `<tr><td>${escapeHTML(p?.name||'Article supprimé')}</td><td>${formatNumber(i.quantity)} ${escapeHTML(p?.unit||i.unit||'')}</td><td>${formatMoney(price)}</td><td>${formatMoney(Number(i.quantity||0)*price)}</td></tr>`;}).join('');return `${detailRowsHTML([['Plat',r.name],['Catégorie',r.category||'-'],['Portions',r.portions||1],['Prix de vente',formatMoney(t.sale)],['Coût matière',formatMoney(t.cost)],['Food cost',formatNumber(t.pct)+'%'],['Marge brute',formatMoney(t.margin)],['Prix conseillé (30%)',formatMoney(t.recommended)]])}<h3>Ingrédients</h3><table><thead><tr><th>Article</th><th>Quantité</th><th>Prix moyen</th><th>Coût</th></tr></thead><tbody>${body}</tbody></table>${r.notes?`<h3>Préparation / Notes</h3><p>${escapeHTML(r.notes).replace(/\n/g,'<br>')}</p>`:''}`;}
function viewRecipePP(id){const r=recipesPP.find(x=>Number(x.id)===Number(id));if(!r)return;showDetailsModal('Fiche technique - '+r.name,[['Nom',r.name],['Catégorie',r.category],['Prix de vente',formatMoney(r.salePrice)],['Coût matière',formatMoney(recipeTotalsPP(r).cost)],['Food cost',formatNumber(recipeTotalsPP(r).pct)+'%'],['Marge brute',formatMoney(recipeTotalsPP(r).margin)],['Ingrédients',(r.ingredients||[]).length]],()=>printRecipePP(id));}
function printRecipePP(id){const r=recipesPP.find(x=>Number(x.id)===Number(id));if(!r)return;printDocument('Fiche technique - '+r.name,`<div class="doc-head"><h1>Pause & Plate</h1><p>Fiche technique</p></div>${recipeDetailsHTMLPP(r)}`);}


/* =========================================================
   VENTES ↔ FICHES TECHNIQUES ↔ STOCK
   Sortie automatique des ingrédients selon les quantités vendues
========================================================= */

function ensureSaleModalPP(){
    if(document.getElementById('ppSaleModal')) return;
    const m=document.createElement('div');
    m.id='ppSaleModal';
    m.className='modal-overlay';
    m.innerHTML=`<div class="modal" style="max-width:1050px">
        <div class="modal-header"><h2 id="ppSaleModalTitle">Nouvelle vente</h2><button onclick="closeModal('ppSaleModal')">×</button></div>
        <form id="ppSaleForm">
            <input type="hidden" id="ppSaleId">
            <div class="form-grid">
                <div><label>Date vente</label><input id="ppSaleDate" type="date" required></div>
                <div><label>N° pièce</label><input id="ppSaleNumber" required></div>
                <div><label>Client / Vente</label><input id="ppSaleClient" placeholder="Ventes comptoir"></div>
                <div><label>Montant TTC</label><input id="ppSaleTTC" type="number" min="0.01" step="0.01" required></div>
                <div><label>Mode encaissement</label><select id="ppSaleMode"><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
                <div><label>Date encaissement</label><input id="ppSalePaymentDate" type="date" required></div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:16px 0 8px;flex-wrap:wrap">
                <div>
                    <h3 style="margin:0">🍽️ Détail des plats vendus</h3>
                    <small style="color:#667085">Les quantités saisies ici déclenchent automatiquement la sortie des ingrédients du stock.</small>
                </div>
                <button type="button" class="btn primary" onclick="addSaleRecipeLinePP()">+ Ajouter un plat</button>
            </div>
            <div id="ppSaleRecipeLines"></div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;background:#f8fafc;border-radius:12px;padding:12px;margin-top:10px">
                <div><small>TTC calculé d'après les fiches</small><strong id="ppSaleRecipesTTC" style="display:block;font-size:18px">0 DH</strong></div>
                <div><small>Coût matière théorique</small><strong id="ppSaleRecipesCost" style="display:block;font-size:18px">0 DH</strong></div>
            </div>

            <div style="margin-top:12px;padding:12px;border-radius:10px;background:#f8fafc">
                <strong>TVA fixe : 10%</strong> — HT et TVA sont calculés automatiquement à partir du TTC.
            </div>
            <div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppSaleModal')">Annuler</button><button class="btn primary" type="submit">Enregistrer</button></div>
        </form>
    </div>`;
    document.body.appendChild(m);
    document.getElementById('ppSaleForm').addEventListener('submit',e=>{e.preventDefault();saveSalePP();});
}

function saleRecipeOptionsPP(selected=''){
    return '<option value="">Sélectionner une fiche technique</option>'+
        recipesPP.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'))
        .map(r=>`<option value="${r.id}" ${Number(selected)===Number(r.id)?'selected':''}>${escapeHTML(r.name)} — ${formatMoney(r.salePrice||0)}</option>`).join('');
}

function addSaleRecipeLinePP(data={}){
    const box=document.getElementById('ppSaleRecipeLines');if(!box)return;
    const row=document.createElement('div');row.className='pp-sale-recipe-line';
    row.style.cssText='display:grid;grid-template-columns:minmax(260px,2fr) minmax(110px,.7fr) minmax(130px,.8fr) minmax(130px,.8fr) 55px;gap:8px;align-items:end;border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-bottom:8px';
    row.innerHTML=`
      <div><label>Plat / fiche technique</label><select class="pp-sale-recipe" onchange="updateSaleRecipeLinePP(this)">${saleRecipeOptionsPP(data.recipeId)}</select></div>
      <div><label>Quantité vendue</label><input class="pp-sale-recipe-qty" type="number" min="0.000001" step="0.000001" value="${Number(data.quantity||1)}" oninput="updateSaleRecipeLinePP(this)"></div>
      <div><label>Prix vente</label><input class="pp-sale-recipe-price" readonly></div>
      <div><label>Coût matière</label><input class="pp-sale-recipe-cost" readonly></div>
      <button type="button" class="btn danger" onclick="this.closest('.pp-sale-recipe-line').remove();updateSaleRecipesTotalsPP()">🗑️</button>`;
    box.appendChild(row);updateSaleRecipeLinePP(row.querySelector('.pp-sale-recipe'));
}

function updateSaleRecipeLinePP(el){
    const row=el.closest('.pp-sale-recipe-line');
    const r=recipesPP.find(x=>Number(x.id)===Number(row.querySelector('.pp-sale-recipe').value));
    const q=Number(row.querySelector('.pp-sale-recipe-qty').value||0);
    const cost=r?recipeTotalsPP(r).cost:0;
    row.querySelector('.pp-sale-recipe-price').value=r?Number(r.salePrice||0).toFixed(2):'';
    row.querySelector('.pp-sale-recipe-cost').value=r?(cost*q).toFixed(2):'';
    updateSaleRecipesTotalsPP();
}

function currentSaleRecipeItemsPP(){
    return [...document.querySelectorAll('#ppSaleRecipeLines .pp-sale-recipe-line')].map(row=>({
        recipeId:Number(row.querySelector('.pp-sale-recipe').value),
        quantity:Number(row.querySelector('.pp-sale-recipe-qty').value||0)
    })).filter(x=>x.recipeId&&x.quantity>0);
}

function updateSaleRecipesTotalsPP(){
    const items=currentSaleRecipeItemsPP();
    let ttc=0,cost=0;
    items.forEach(item=>{
        const r=recipesPP.find(x=>Number(x.id)===Number(item.recipeId));if(!r)return;
        ttc+=Number(r.salePrice||0)*Number(item.quantity||0);
        cost+=recipeTotalsPP(r).cost*Number(item.quantity||0);
    });
    setText('ppSaleRecipesTTC',formatMoney(ttc));
    setText('ppSaleRecipesCost',formatMoney(cost));
    if(items.length) setValue('ppSaleTTC',ttc.toFixed(2));
}

function saleIngredientRequirementsPP(items){
    const map=new Map();
    items.forEach(item=>{
        const r=recipesPP.find(x=>Number(x.id)===Number(item.recipeId));if(!r)return;
        const portions=Math.max(Number(r.portions||1),1);
        (r.ingredients||[]).forEach(ing=>{
            const productId=Number(ing.productId),p=products.find(x=>Number(x.id)===productId);
            if(!p)return;
            const qty=(Number(ing.quantity||0)/portions)*Number(item.quantity||0);
            if(!(qty>0))return;
            if(!map.has(productId))map.set(productId,{productId,productName:p.name,unit:p.unit,quantity:0});
            map.get(productId).quantity+=qty;
        });
    });
    return [...map.values()];
}

function rollbackSaleConsumptionPP(sale){
    if(!sale)return;
    const related=movements.filter(m=>Number(m.saleId)===Number(sale.id)&&m.source==='recipe-sale');
    related.forEach(m=>{
        const p=products.find(x=>Number(x.id)===Number(m.productId));
        if(p)p.stock=Number(p.stock||0)+Number(m.quantity||0);
    });
    movements=movements.filter(m=>!(Number(m.saleId)===Number(sale.id)&&m.source==='recipe-sale'));
}

function applySaleConsumptionPP(sale){
    const reqs=saleIngredientRequirementsPP(sale.items||[]);
    reqs.forEach(req=>{
        const p=products.find(x=>Number(x.id)===Number(req.productId));if(!p)return;
        p.stock=Number(p.stock||0)-Number(req.quantity||0);
        movements.unshift({
            id:createId(),
            date:sale.date||new Date().toISOString(),
            productId:p.id,
            productName:p.name,
            type:'exit',
            quantity:Number(req.quantity||0),
            unit:p.unit,
            reason:'Vente - Fiches techniques '+(sale.number||''),
            note:'Consommation automatique calculée depuis les fiches techniques',
            saleId:sale.id,
            source:'recipe-sale',
            theoretical:true
        });
    });
}

function openSalePP(id=null){
    ensureSaleModalPP();
    const s=id?salesPP.find(x=>Number(x.id)===Number(id)):null;
    const today=new Date().toISOString().slice(0,10);
    setValue('ppSaleId',s?.id||'');setValue('ppSaleDate',s?.date||today);setValue('ppSaleNumber',s?.number||'');
    setValue('ppSaleClient',s?.client||'Ventes comptoir');setValue('ppSaleTTC',s?.totalTTC||'');setValue('ppSaleMode',s?.mode||'Espèces');
    setValue('ppSalePaymentDate',s?.paymentDate||s?.date||today);setText('ppSaleModalTitle',s?'Modifier la vente':'Nouvelle vente');
    const box=document.getElementById('ppSaleRecipeLines');if(box)box.innerHTML='';
    (s?.items?.length?s.items:[{}]).forEach(addSaleRecipeLinePP);
    updateSaleRecipesTotalsPP();
    // Keep the original TTC for legacy/manual sales with no recipe detail.
    if(s && !(s.items||[]).length)setValue('ppSaleTTC',s.totalTTC||'');
    openModal('ppSaleModal');
}

function saveSalePP(){
    const id=Number(getValue('ppSaleId'))||null,totalTTC=Number(getValue('ppSaleTTC')||0);
    if(!(totalTTC>0))return;
    const old=id?salesPP.find(x=>Number(x.id)===id):null;
    if(old)rollbackSaleConsumptionPP(old);

    const obj={
        id:id||createId(),date:getValue('ppSaleDate'),number:getValue('ppSaleNumber').trim(),
        client:getValue('ppSaleClient').trim()||'Ventes comptoir',totalTTC,
        mode:getValue('ppSaleMode'),paymentDate:getValue('ppSalePaymentDate'),
        items:currentSaleRecipeItemsPP(),
        createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    if(id){const i=salesPP.findIndex(x=>Number(x.id)===id);if(i>=0)salesPP[i]=obj;}else salesPP.unshift(obj);
    applySaleConsumptionPP(obj);
    saveData();closeModal('ppSaleModal');renderAll();
}

function deleteSalePP(id){
    const s=salesPP.find(x=>Number(x.id)===Number(id));if(!s)return;
    if(!confirm('Supprimer cette vente ? Les sorties de stock liées seront annulées.'))return;
    rollbackSaleConsumptionPP(s);
    salesPP=salesPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();
}


/* =========================================================
   VENTES — SOUS-MENU + VENTES JOURNALIÈRES EN DÉTAIL
   Scan ticket/rapport -> matching fiches techniques -> stock
========================================================= */

let ppSalesSubtab = 'sales';
let ppDailyScanText = '';
let ppDailyScanMatches = [];

function ensureSalesModulePP(){
    const page=document.getElementById('salesPage');if(!page)return;
    hideLegacyModuleContentPP(page,'ppSalesShell');
    let shell=document.getElementById('ppSalesShell');
    if(shell){shell.style.display='block';return;}

    shell=document.createElement('div');shell.id='ppSalesShell';
    shell.innerHTML=`
      <div id="ppSalesSubmenu" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px">
        <button id="ppSalesTabMain" class="btn primary" type="button" onclick="showSalesSubtabPP('sales')">Ventes</button>
        <button id="ppSalesTabDaily" class="btn" type="button" onclick="showSalesSubtabPP('daily')">Ventes journalières en détail</button>
      </div>
      <div id="ppSalesMainContent"></div>
      <div id="ppSalesDailyContent" style="display:none"></div>`;
    page.appendChild(shell);

    document.getElementById('ppSalesMainContent').innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><h2 style="margin:0 0 4px">Gestion des ventes</h2><p style="margin:0;color:#667085">Les montants HT et TVA 10% sont calculés automatiquement à partir du TTC.</p></div>
        <div style="display:flex;gap:8px"><button class="btn primary" onclick="openSalePP()">➕ Nouvelle vente</button><button class="btn print" onclick="printSalesPP()">🖨️ Imprimer</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-bottom:15px">
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Du</label><input id="ppSalesFrom" type="date" onchange="renderSalesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Au</label><input id="ppSalesTo" type="date" onchange="renderSalesPP()" style="width:100%;padding:9px"></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Mode</label><select id="ppSalesMode" onchange="renderSalesPP()" style="width:100%;padding:9px"><option value="">Tous</option><option>Espèces</option><option>Carte</option><option>Virement</option><option>Chèque</option><option>Autre</option></select></div>
        <div><label style="display:block;font-weight:700;margin-bottom:5px">Recherche</label><input id="ppSalesSearch" placeholder="N° pièce / client..." oninput="renderSalesPP()" style="width:100%;padding:9px"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px">
        <div class="stat-card" style="padding:15px"><div style="color:#667085">CA HT</div><strong id="ppSalesHT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">TVA collectée 10%</div><strong id="ppSalesVAT" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">CA TTC</div><strong id="ppSalesTTC" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Nombre de ventes</div><strong id="ppSalesCount" style="font-size:22px">0</strong></div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:1050px"><thead><tr><th>Date</th><th>N° pièce</th><th>Client / Vente</th><th>HT</th><th>TVA 10%</th><th>TTC</th><th>Mode</th><th>Date encaissement</th><th>Actions</th></tr></thead><tbody id="ppSalesTable"></tbody></table>
      </div>`;

    document.getElementById('ppSalesDailyContent').innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><h2 style="margin:0 0 4px">Ventes journalières en détail</h2><p style="margin:0;color:#667085">Scannez le ticket ou rapport de caisse. Les plats sont rapprochés automatiquement avec les fiches techniques.</p></div>
        <button class="btn primary" onclick="openDailySalesScanPP()">📷 Scanner les ventes</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px">
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Scans enregistrés</div><strong id="ppDailyScanCount" style="font-size:22px">0</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Plats vendus</div><strong id="ppDailyDishCount" style="font-size:22px">0</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">CA TTC scanné</div><strong id="ppDailyScanTTC" style="font-size:22px">0 DH</strong></div>
        <div class="stat-card" style="padding:15px"><div style="color:#667085">Coût matière théorique</div><strong id="ppDailyScanCost" style="font-size:22px">0 DH</strong></div>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
        <table style="width:100%;min-width:1050px"><thead><tr><th>Date</th><th>N° scan</th><th>Plats détectés</th><th>Quantité totale</th><th>TTC</th><th>Coût matière</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="ppDailySalesTable"></tbody></table>
      </div>`;

    ensureDailySalesScanModalPP();
}

function showSalesSubtabPP(tab){
    ppSalesSubtab=tab;
    ensureSalesModulePP();
    const main=document.getElementById('ppSalesMainContent'),daily=document.getElementById('ppSalesDailyContent');
    if(main)main.style.display=tab==='sales'?'block':'none';
    if(daily)daily.style.display=tab==='daily'?'block':'none';
    document.getElementById('ppSalesTabMain')?.classList.toggle('primary',tab==='sales');
    document.getElementById('ppSalesTabDaily')?.classList.toggle('primary',tab==='daily');
    if(tab==='sales')renderSalesPP();else renderDailySalesPP();
}

function ensureDailySalesScanModalPP(){
    if(document.getElementById('ppDailyScanModal'))return;
    const m=document.createElement('div');m.id='ppDailyScanModal';m.className='modal-overlay';
    m.innerHTML=`<div class="modal" style="max-width:1100px">
      <div class="modal-header"><h2>📷 Scan ventes journalières</h2><button onclick="closeModal('ppDailyScanModal')">×</button></div>
      <div class="form-grid">
        <div><label>Date des ventes</label><input id="ppDailyScanDate" type="date"></div>
        <div><label>Mode d'encaissement</label><select id="ppDailyScanMode"><option>Espèces</option><option>Carte</option><option>Virement</option><option>Autre</option></select></div>
        <div><label>Fichier PDF / image</label><input id="ppDailyScanFile" type="file" accept="application/pdf,image/*" onchange="handleDailySalesFilePP(event)"></div>
      </div>
      <div id="ppDailyScanStatus" style="margin:12px 0;padding:12px;border-radius:10px;background:#f8fafc">Sélectionnez un fichier.</div>
      <div id="ppDailyScanReview"></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal('ppDailyScanModal')">Annuler</button><button id="ppDailyScanSaveBtn" type="button" class="btn primary" onclick="saveDailySalesScanPP()" disabled>Enregistrer les ventes détectées</button></div>
    </div>`;
    document.body.appendChild(m);
}

function openDailySalesScanPP(){
    ensureDailySalesScanModalPP();
    ppDailyScanText='';ppDailyScanMatches=[];
    setValue('ppDailyScanDate',new Date().toISOString().slice(0,10));
    setValue('ppDailyScanMode','Espèces');
    const f=document.getElementById('ppDailyScanFile');if(f)f.value='';
    document.getElementById('ppDailyScanStatus').textContent='Sélectionnez un fichier.';
    document.getElementById('ppDailyScanReview').innerHTML='';
    document.getElementById('ppDailyScanSaveBtn').disabled=true;
    openModal('ppDailyScanModal');
}

async function extractDailySalesTextPP(file){
    if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
        if(typeof pdfjsLib==='undefined')throw new Error("PDF.js n'est pas chargé.");
        const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        let text='';
        for(let n=1;n<=pdf.numPages;n++){
            const page=await pdf.getPage(n);
            const tc=await page.getTextContent();
            const direct=(tc.items||[]).map(x=>x.str||'').join(' ');
            if(direct.trim().length>25){text+='\n'+direct+'\n';continue;}
            if(typeof Tesseract==='undefined')continue;
            const viewport=page.getViewport({scale:3});
            const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
            await page.render({canvasContext:ctx,viewport}).promise;
            text+='\n'+await runDualOCR(canvas,preprocessCanvas(canvas),'Ventes')+'\n';
        }
        return text;
    }
    if(file.type.startsWith('image/')){
        if(typeof Tesseract==='undefined')throw new Error("Tesseract OCR n'est pas chargé.");
        const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
        canvas.width=Math.round(bitmap.width*2.5);canvas.height=Math.round(bitmap.height*2.5);
        canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
        return await runDualOCR(canvas,preprocessCanvas(canvas),'Ventes journalières');
    }
    throw new Error('Format non supporté.');
}

function ppRecipeMatchScore(line,recipeName){
    const a=normalizeText(line),b=normalizeText(recipeName);
    if(!a||!b)return 0;
    if(a.includes(b))return 100;
    const bt=b.split(/\s+/).filter(x=>x.length>1);
    const hits=bt.filter(t=>a.includes(t)).length;
    return bt.length?hits/bt.length*90:0;
}

function ppQuantityFromSalesLine(line,recipeName){
    const clean=String(line||'').replace(/,/g,'.');
    const normRecipe=normalizeText(recipeName);
    const normLine=normalizeText(clean);
    const xmatch=clean.match(/\b[xX×]\s*(\d+(?:\.\d+)?)\b/);
    if(xmatch)return Number(xmatch[1])||1;
    const qmatch=clean.match(/\b(?:qte|qté|qty|quantite|quantité)\s*[:=]?\s*(\d+(?:\.\d+)?)\b/i);
    if(qmatch)return Number(qmatch[1])||1;
    const start=clean.match(/^\s*(\d+(?:\.\d+)?)\s*[xX×-]?\s*[A-Za-zÀ-ÿ]/);
    if(start){const q=Number(start[1]);if(q>0&&q<=500)return q;}
    // integer immediately after the matched recipe name
    const idx=normLine.indexOf(normRecipe);
    if(idx>=0){
        const nums=(clean.match(/\b\d+(?:\.\d+)?\b/g)||[]).map(Number).filter(n=>n>0&&n<=500&&Number.isInteger(n));
        if(nums.length===1)return nums[0];
    }
    return 1;
}

function parseDailySalesTextPP(text){
    const rawLines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    // PDF direct extraction can collapse rows; split additionally on common separators.
    const lines=rawLines.flatMap(x=>x.split(/\s{3,}|\s+\|\s+/)).map(x=>x.trim()).filter(Boolean);
    const map=new Map();
    lines.forEach(line=>{
        let best=null,bestScore=0;
        recipesPP.forEach(r=>{const s=ppRecipeMatchScore(line,r.name);if(s>bestScore){best=r;bestScore=s;}});
        if(!best||bestScore<55)return;
        const q=ppQuantityFromSalesLine(line,best.name);
        const key=Number(best.id);
        if(!map.has(key))map.set(key,{recipeId:key,recipeName:best.name,quantity:0,score:bestScore,sourceLine:line});
        const x=map.get(key);x.quantity+=q;x.score=Math.max(x.score,bestScore);
    });
    return [...map.values()];
}

async function handleDailySalesFilePP(event){
    const file=event.target.files?.[0];if(!file)return;
    const status=document.getElementById('ppDailyScanStatus');
    status.textContent='Analyse en cours...';
    document.getElementById('ppDailyScanSaveBtn').disabled=true;
    try{
        ppDailyScanText=await extractDailySalesTextPP(file);
        ppDailyScanMatches=parseDailySalesTextPP(ppDailyScanText);
        renderDailyScanReviewPP();
        status.innerHTML=`✅ Analyse terminée — <strong>${ppDailyScanMatches.length}</strong> fiche(s) technique(s) rapprochée(s).`;
    }catch(e){
        console.error(e);status.textContent='❌ '+e.message;ppDailyScanMatches=[];renderDailyScanReviewPP();
    }
}

function renderDailyScanReviewPP(){
    const box=document.getElementById('ppDailyScanReview');if(!box)return;
    if(!ppDailyScanMatches.length){
        box.innerHTML='<div class="scan-note">Aucun plat reconnu automatiquement. Vérifiez que les noms des fiches techniques correspondent aux désignations du ticket.</div>';
        document.getElementById('ppDailyScanSaveBtn').disabled=true;return;
    }
    box.innerHTML=`<h3>Vérification avant enregistrement</h3>
      <div style="overflow:auto"><table style="width:100%;min-width:760px"><thead><tr><th>Désignation détectée</th><th>Fiche technique affectée</th><th>Quantité</th><th>Confiance</th></tr></thead><tbody>
      ${ppDailyScanMatches.map((m,i)=>`<tr><td>${escapeHTML(m.sourceLine||m.recipeName)}</td><td><select onchange="ppDailyScanMatches[${i}].recipeId=Number(this.value);ppDailyScanMatches[${i}].recipeName=this.options[this.selectedIndex].text">${recipesPP.map(r=>`<option value="${r.id}" ${Number(r.id)===Number(m.recipeId)?'selected':''}>${escapeHTML(r.name)}</option>`).join('')}</select></td><td><input type="number" min="0.000001" step="0.000001" value="${m.quantity}" onchange="ppDailyScanMatches[${i}].quantity=Number(this.value)"></td><td>${Math.round(m.score)}%</td></tr>`).join('')}
      </tbody></table></div>`;
    document.getElementById('ppDailyScanSaveBtn').disabled=false;
}

function saveDailySalesScanPP(){
    const items=ppDailyScanMatches.map(m=>({recipeId:Number(m.recipeId),quantity:Number(m.quantity||0)})).filter(x=>x.recipeId&&x.quantity>0);
    if(!items.length){alert('Aucune vente à enregistrer.');return;}
    const date=getValue('ppDailyScanDate')||new Date().toISOString().slice(0,10);
    const id=createId(),number='SCAN-'+date.replace(/-/g,'')+'-'+String(id).slice(-5);
    let totalTTC=0;
    items.forEach(i=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));if(r)totalTTC+=Number(r.salePrice||0)*i.quantity;});
    const sale={id,date,number,client:'Ventes journalières',totalTTC,mode:getValue('ppDailyScanMode')||'Espèces',paymentDate:date,items,source:'daily-scan',createdAt:new Date().toISOString()};
    salesPP.unshift(sale);
    applySaleConsumptionPP(sale);
    dailySalesScansPP.unshift({id:createId(),saleId:sale.id,date,number,items:JSON.parse(JSON.stringify(items)),rawText:ppDailyScanText,totalTTC,createdAt:new Date().toISOString()});
    saveData();closeModal('ppDailyScanModal');showSalesSubtabPP('daily');renderAll();
}

function renderDailySalesPP(){
    ensureSalesModulePP();const t=document.getElementById('ppDailySalesTable');if(!t)return;
    const rows=dailySalesScansPP.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    let qty=0,ttc=0,cost=0;
    rows.forEach(s=>{ttc+=Number(s.totalTTC||0);(s.items||[]).forEach(i=>{qty+=Number(i.quantity||0);const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));if(r)cost+=recipeTotalsPP(r).cost*Number(i.quantity||0);});});
    setText('ppDailyScanCount',String(rows.length));setText('ppDailyDishCount',formatNumber(qty));setText('ppDailyScanTTC',formatMoney(ttc));setText('ppDailyScanCost',formatMoney(cost));
    if(!rows.length){t.innerHTML='<tr><td colspan="8" class="empty">Aucun scan de ventes enregistré.</td></tr>';return;}
    t.innerHTML=rows.map(s=>{
        const dishNames=(s.items||[]).map(i=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));return `${r?.name||'Fiche supprimée'} × ${formatNumber(i.quantity)}`;}).join(' / ');
        const q=(s.items||[]).reduce((a,i)=>a+Number(i.quantity||0),0);
        const c=(s.items||[]).reduce((a,i)=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));return a+(r?recipeTotalsPP(r).cost*Number(i.quantity||0):0);},0);
        return `<tr><td>${formatDate(s.date)}</td><td>${escapeHTML(s.number||'-')}</td><td>${escapeHTML(dishNames||'-')}</td><td>${formatNumber(q)}</td><td>${formatMoney(s.totalTTC||0)}</td><td>${formatMoney(c)}</td><td><span class="status success">Affecté au stock</span></td><td><div class="action-buttons"><button class="btn small view" onclick="viewDailySalesScanPP(${s.id})">👁️</button><button class="btn small print" onclick="printDailySalesScanPP(${s.id})">🖨️</button><button class="btn small danger" onclick="deleteDailySalesScanPP(${s.id})">🗑️</button></div></td></tr>`;
    }).join('');
}

function viewDailySalesScanPP(id){
    const s=dailySalesScansPP.find(x=>Number(x.id)===Number(id));if(!s)return;
    const lines=(s.items||[]).map(i=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));return `${r?.name||'Fiche supprimée'} × ${formatNumber(i.quantity)}`;}).join('<br>');
    showDetailsModal('Ventes journalières - '+s.number,[['Date',formatDate(s.date)],['Plats',lines],['TTC',formatMoney(s.totalTTC||0)],['Stock','Sorties automatiques appliquées']],()=>printDailySalesScanPP(id),true);
}

function printDailySalesScanPP(id){
    const s=dailySalesScansPP.find(x=>Number(x.id)===Number(id));if(!s)return;
    const body=(s.items||[]).map(i=>{const r=recipesPP.find(x=>Number(x.id)===Number(i.recipeId));return `<tr><td>${escapeHTML(r?.name||'Fiche supprimée')}</td><td>${formatNumber(i.quantity)}</td><td>${formatMoney(r?.salePrice||0)}</td><td>${formatMoney(Number(r?.salePrice||0)*Number(i.quantity||0))}</td></tr>`;}).join('');
    printDocument('Ventes journalières - '+s.number,`<div class="doc-head"><h1>Pause & Plate</h1><p>Ventes journalières en détail</p></div><p><strong>Date:</strong> ${formatDate(s.date)}</p><table><thead><tr><th>Plat</th><th>Quantité</th><th>Prix</th><th>Total</th></tr></thead><tbody>${body}</tbody></table><p><strong>Total TTC: ${formatMoney(s.totalTTC||0)}</strong></p>`);
}

function deleteDailySalesScanPP(id){
    const scan=dailySalesScansPP.find(x=>Number(x.id)===Number(id));if(!scan||!confirm('Supprimer ce scan ? Les sorties de stock liées seront annulées.'))return;
    const sale=salesPP.find(x=>Number(x.id)===Number(scan.saleId));
    if(sale)rollbackSaleConsumptionPP(sale);
    salesPP=salesPP.filter(x=>Number(x.id)!==Number(scan.saleId));
    dailySalesScansPP=dailySalesScansPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();showSalesSubtabPP('daily');
}

// Keep the selected Ventes sub-menu after global renders.
const ppOriginalRenderSalesPP = renderSalesPP;
renderSalesPP = function(){
    ensureSalesModulePP();
    const table=document.getElementById('ppSalesTable');if(!table)return;
    const rows=filteredSalesModulePP().slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const ttc=rows.reduce((a,s)=>a+Number(s.totalTTC||0),0),ht=ttc/1.10,vat=ttc-ht;
    setText('ppSalesHT',formatMoney(ht));setText('ppSalesVAT',formatMoney(vat));setText('ppSalesTTC',formatMoney(ttc));setText('ppSalesCount',String(rows.length));
    if(!rows.length)table.innerHTML='<tr><td colspan="9" class="empty">Aucune vente enregistrée.</td></tr>';
    else table.innerHTML=rows.map(s=>{const sttc=Number(s.totalTTC||0),sht=sttc/1.10,svat=sttc-sht;return `<tr><td>${formatDate(s.date)}</td><td>${escapeHTML(s.number||'-')}</td><td>${escapeHTML(s.client||'Ventes comptoir')}</td><td>${formatMoney(sht)}</td><td>${formatMoney(svat)}</td><td><strong>${formatMoney(sttc)}</strong></td><td>${escapeHTML(s.mode||'-')}</td><td>${s.paymentDate?formatDate(s.paymentDate):'-'}</td><td><div class="action-buttons"><button class="btn small edit" onclick="openSalePP(${s.id})">✏️</button><button class="btn small print" onclick="printSingleSalePP(${s.id})">🖨️</button><button class="btn small danger" onclick="deleteSalePP(${s.id})">🗑️</button></div></td></tr>`;}).join('');
    renderDailySalesPP();
    const main=document.getElementById('ppSalesMainContent'),daily=document.getElementById('ppSalesDailyContent');
    if(main)main.style.display=ppSalesSubtab==='sales'?'block':'none';
    if(daily)daily.style.display=ppSalesSubtab==='daily'?'block':'none';
};


/* =========================================================
   ARTICLES REPORT — PARSER SPÉCIFIQUE PAUSE & PLATE
   Format: Variant | Qty | Total (MAD)
========================================================= */

function ppNormalizeDishNameForMatch(value){
    return normalizeText(String(value||''))
        .replace(/\b(pizzas?|desserts?|gratins?|jus|sushi|tacos|sandwichs?|pasticcio|pates?|pâtes|boissons?|crepes?|crêpes?)\b/g,' ')
        .replace(/\b(6pcs|8pcs|24 pieces|24 pièces|33cl|50cl|1 5l|1,5l)\b/g,' ')
        .replace(/[^a-z0-9]+/g,' ')
        .replace(/\s+/g,' ')
        .trim();
}

function ppRecipeMatchScore(line,recipeName){
    const a=ppNormalizeDishNameForMatch(line);
    const b=ppNormalizeDishNameForMatch(recipeName);
    if(!a||!b)return 0;
    if(a===b)return 100;
    if(a.includes(b)||b.includes(a))return 96;
    const at=new Set(a.split(/\s+/).filter(x=>x.length>1));
    const bt=b.split(/\s+/).filter(x=>x.length>1);
    const hits=bt.filter(t=>at.has(t)).length;
    return bt.length ? (hits/bt.length)*92 : 0;
}

function ppFindBestRecipeForDailyItemPP(name){
    let best=null,bestScore=0;
    recipesPP.forEach(r=>{
        const score=ppRecipeMatchScore(name,r.name);
        if(score>bestScore){best=r;bestScore=score;}
    });
    return bestScore>=58 ? {recipe:best,score:bestScore} : {recipe:null,score:bestScore};
}

function ppFindStockArticleForDailyItemPP(name){
    const target=ppNormalizeDishNameForMatch(name);
    let best=null,bestScore=0;
    products.forEach(p=>{
        const pn=ppNormalizeDishNameForMatch(p.name);
        if(!pn)return;
        let score=0;
        if(pn===target)score=100;
        else if(pn.includes(target)||target.includes(pn))score=94;
        else{
            const tt=target.split(/\s+/).filter(x=>x.length>1);
            const ps=new Set(pn.split(/\s+/).filter(x=>x.length>1));
            const hits=tt.filter(t=>ps.has(t)).length;
            score=tt.length?(hits/tt.length)*88:0;
        }
        if(score>bestScore){best=p;bestScore=score;}
    });
    return bestScore>=65 ? {product:best,score:bestScore} : {product:null,score:bestScore};
}

function parseArticlesReportDailySalesPP(text){
    const raw=String(text||'')
        .replace(/\r/g,'')
        .split('\n')
        .map(x=>x.trim())
        .filter(Boolean);

    const items=[];
    let currentCategory='';
    let grandQty=0, grandTTC=0, subtotalHT=0, vat=0, netTTC=0;
    const paymentMethods=[];

    const ignored=/^(articles report|date\b|generated on|by:|variant\s+qty\s+total|category total:|payment methods|summary|brute|gross|total fees|discounted lines|discounted amount|offered lines|offered amount|cancelled lines|cancelled amount|subtotal \(ht\)|vat \(tva\)|net \(ttc\)|page \d+|generated by)/i;

    for(let i=0;i<raw.length;i++){
        const line=raw[i];

        let m=line.match(/^GRAND TOTAL\s+([\d.,]+)\s+([\d\s.,]+)\s*MAD$/i);
        if(m){
            grandQty=parseNumber(m[1]);
            grandTTC=parseNumber(m[2]);
            continue;
        }

        if(/^CASH$/i.test(line) || /^TPE$/i.test(line)){
            const mode=line.toUpperCase();
            const next=raw[i+1]||'';
            const amountMatch=next.match(/^([\d\s.,]+)\s*MAD$/i);
            if(amountMatch){
                paymentMethods.push({mode,amount:parseNumber(amountMatch[1])});
                i++;
            }
            continue;
        }

        if(/^Subtotal \(HT\)$/i.test(line)){
            const n=raw[i+1]||'';
            const mm=n.match(/^([\d\s.,]+)\s*MAD$/i);
            if(mm){subtotalHT=parseNumber(mm[1]);i++;}
            continue;
        }
        if(/^VAT \(TVA\)$/i.test(line)){
            const n=raw[i+1]||'';
            const mm=n.match(/^([\d\s.,]+)\s*MAD$/i);
            if(mm){vat=parseNumber(mm[1]);i++;}
            continue;
        }
        if(/^Net \(TTC\)$/i.test(line)){
            const n=raw[i+1]||'';
            const mm=n.match(/^([\d\s.,]+)\s*MAD$/i);
            if(mm){netTTC=parseNumber(mm[1]);i++;}
            continue;
        }

        if(ignored.test(line) || /^\d{2}\/\d{2}\/\d{4}.*Generated by Page/i.test(line)) continue;

        // Detect category title: next meaningful line is "Variant Qty Total (MAD)".
        if(raw[i+1] && /^Variant\s+Qty\s+Total\s+\(MAD\)$/i.test(raw[i+1])){
            currentCategory=line;
            continue;
        }

        // Product row: designation + integer/decimal qty + total MAD.
        m=line.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s+([\d\s]+(?:[.,]\d{1,2})?)\s*MAD$/i);
        if(!m)continue;

        const name=String(m[1]||'').trim();
        if(!name || /^category total/i.test(name))continue;
        const quantity=parseNumber(m[2]);
        const total=parseNumber(m[3]);
        if(!(quantity>0) || total<0)continue;

        const recipeMatch=ppFindBestRecipeForDailyItemPP(name);
        const stockMatch=recipeMatch.recipe ? {product:null,score:0} : ppFindStockArticleForDailyItemPP(name);

        items.push({
            rawName:name,
            category:currentCategory,
            quantity,
            totalTTC:total,
            recipeId:recipeMatch.recipe?.id||null,
            recipeName:recipeMatch.recipe?.name||'',
            stockProductId:stockMatch.product?.id||null,
            stockProductName:stockMatch.product?.name||'',
            matchType:recipeMatch.recipe?'recipe':(stockMatch.product?'stock':'unmatched'),
            score:recipeMatch.recipe?recipeMatch.score:stockMatch.score
        });
    }

    return {
        items,
        grandQty,
        grandTTC:netTTC||grandTTC||items.reduce((a,x)=>a+Number(x.totalTTC||0),0),
        subtotalHT,
        vat,
        netTTC,
        paymentMethods
    };
}

function parseDailySalesTextPP(text){
    const report=parseArticlesReportDailySalesPP(text);
    if(report.items.length){
        ppDailyScanReportSummary=report;
        return report.items.map(x=>({
            recipeId:Number(x.recipeId)||0,
            recipeName:x.recipeName||x.stockProductName||x.rawName,
            stockProductId:Number(x.stockProductId)||0,
            stockProductName:x.stockProductName||'',
            matchType:x.matchType,
            rawName:x.rawName,
            category:x.category,
            quantity:Number(x.quantity||0),
            totalTTC:Number(x.totalTTC||0),
            score:Number(x.score||0),
            sourceLine:x.rawName
        }));
    }
    ppDailyScanReportSummary=null;
    return [];
}

let ppDailyScanReportSummary=null;

function renderDailyScanReviewPP(){
    const box=document.getElementById('ppDailyScanReview');if(!box)return;
    if(!ppDailyScanMatches.length){
        box.innerHTML='<div class="scan-note">Aucune ligne de vente reconnue.</div>';
        document.getElementById('ppDailyScanSaveBtn').disabled=true;return;
    }

    const matched=ppDailyScanMatches.filter(x=>x.matchType!=='unmatched').length;
    const unmatched=ppDailyScanMatches.length-matched;
    const sumTTC=ppDailyScanReportSummary?.grandTTC||ppDailyScanMatches.reduce((a,x)=>a+Number(x.totalTTC||0),0);

    box.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0">
        <div class="stat-card" style="padding:12px"><small>Lignes détectées</small><strong style="display:block">${ppDailyScanMatches.length}</strong></div>
        <div class="stat-card" style="padding:12px"><small>Affectées</small><strong style="display:block">${matched}</strong></div>
        <div class="stat-card" style="padding:12px"><small>À vérifier</small><strong style="display:block">${unmatched}</strong></div>
        <div class="stat-card" style="padding:12px"><small>Net TTC rapport</small><strong style="display:block">${formatMoney(sumTTC)}</strong></div>
      </div>
      <h3>Vérification avant enregistrement</h3>
      <div style="overflow:auto"><table style="width:100%;min-width:1050px">
      <thead><tr><th>Catégorie</th><th>Désignation rapport</th><th>Qté</th><th>Total TTC</th><th>Affectation</th><th>Confiance</th></tr></thead><tbody>
      ${ppDailyScanMatches.map((m,i)=>{
        const recipeOpts='<option value="">-- Aucune fiche --</option>'+recipesPP.map(r=>`<option value="r:${r.id}" ${Number(r.id)===Number(m.recipeId)?'selected':''}>FT: ${escapeHTML(r.name)}</option>`).join('');
        const stockOpts=products.map(p=>`<option value="p:${p.id}" ${Number(p.id)===Number(m.stockProductId)?'selected':''}>Stock: ${escapeHTML(p.name)}</option>`).join('');
        const selectedValue=m.recipeId?`r:${m.recipeId}`:(m.stockProductId?`p:${m.stockProductId}`:'');
        return `<tr>
          <td>${escapeHTML(m.category||'-')}</td>
          <td>${escapeHTML(m.rawName||m.sourceLine||'-')}</td>
          <td><input type="number" min="0.000001" step="0.000001" value="${m.quantity}" onchange="ppDailyScanMatches[${i}].quantity=Number(this.value)"></td>
          <td>${formatMoney(m.totalTTC||0)}</td>
          <td><select onchange="updateDailySalesAssignmentPP(${i},this.value)">${recipeOpts}${stockOpts}</select></td>
          <td>${m.matchType==='unmatched'?'<span class="status danger">À vérifier</span>':`<span class="status success">${Math.round(m.score)}%</span>`}</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>
      ${ppDailyScanReportSummary?.paymentMethods?.length?`<div style="margin-top:12px"><strong>Paiements :</strong> ${ppDailyScanReportSummary.paymentMethods.map(p=>`${p.mode}: ${formatMoney(p.amount)}`).join(' / ')}</div>`:''}
      ${ppDailyScanReportSummary?.subtotalHT?`<div style="margin-top:6px"><strong>HT:</strong> ${formatMoney(ppDailyScanReportSummary.subtotalHT)} — <strong>TVA:</strong> ${formatMoney(ppDailyScanReportSummary.vat)} — <strong>TTC:</strong> ${formatMoney(ppDailyScanReportSummary.grandTTC)}</div>`:''}
    `;

    // restore select values, since mixed recipe/stock option values are prefixed
    [...box.querySelectorAll('tbody select')].forEach((sel,idx)=>{
        const m=ppDailyScanMatches[idx];
        sel.value=m.recipeId?`r:${m.recipeId}`:(m.stockProductId?`p:${m.stockProductId}`:'');
    });
    document.getElementById('ppDailyScanSaveBtn').disabled=false;
}

function updateDailySalesAssignmentPP(index,value){
    const m=ppDailyScanMatches[index];if(!m)return;
    m.recipeId=0;m.recipeName='';m.stockProductId=0;m.stockProductName='';m.matchType='unmatched';m.score=100;
    if(String(value).startsWith('r:')){
        const id=Number(String(value).slice(2)),r=recipesPP.find(x=>Number(x.id)===id);
        if(r){m.recipeId=id;m.recipeName=r.name;m.matchType='recipe';}
    }else if(String(value).startsWith('p:')){
        const id=Number(String(value).slice(2)),p=products.find(x=>Number(x.id)===id);
        if(p){m.stockProductId=id;m.stockProductName=p.name;m.matchType='stock';}
    }
}

function applyDirectStockItemsFromDailyScanPP(sale,scanItems){
    (scanItems||[]).filter(x=>x.matchType==='stock'&&x.stockProductId).forEach(x=>{
        const p=products.find(z=>Number(z.id)===Number(x.stockProductId));if(!p)return;
        p.stock=Number(p.stock||0)-Number(x.quantity||0);
        movements.unshift({
            id:createId(),date:sale.date,productId:p.id,productName:p.name,type:'exit',
            quantity:Number(x.quantity||0),unit:p.unit,
            reason:'Vente journalière - '+(sale.number||''),
            note:'Sortie automatique directe depuis le rapport de ventes',
            saleId:sale.id,source:'daily-scan-direct',theoretical:true
        });
    });
}

function rollbackDailyDirectStockPP(saleId){
    const rel=movements.filter(m=>Number(m.saleId)===Number(saleId)&&m.source==='daily-scan-direct');
    rel.forEach(m=>{const p=products.find(x=>Number(x.id)===Number(m.productId));if(p)p.stock=Number(p.stock||0)+Number(m.quantity||0);});
    movements=movements.filter(m=>!(Number(m.saleId)===Number(saleId)&&m.source==='daily-scan-direct'));
}

function saveDailySalesScanPP(){
    const recipeItems=ppDailyScanMatches
        .filter(m=>m.matchType==='recipe'&&m.recipeId&&Number(m.quantity)>0)
        .map(m=>({recipeId:Number(m.recipeId),quantity:Number(m.quantity)}));

    const unmatched=ppDailyScanMatches.filter(m=>m.matchType==='unmatched');
    if(unmatched.length && !confirm(`${unmatched.length} ligne(s) ne sont pas affectées à une fiche technique ou au stock. Continuer quand même ?`))return;

    const date=getValue('ppDailyScanDate')||new Date().toISOString().slice(0,10);
    const id=createId(),number='SCAN-'+date.replace(/-/g,'')+'-'+String(id).slice(-5);
    const totalTTC=Number(ppDailyScanReportSummary?.grandTTC||ppDailyScanMatches.reduce((a,m)=>a+Number(m.totalTTC||0),0));

    const paymentMethods=ppDailyScanReportSummary?.paymentMethods||[];
    const mode=paymentMethods.length>1?'Mixte '+paymentMethods.map(p=>p.mode).join('/'):(paymentMethods[0]?.mode||getValue('ppDailyScanMode')||'Espèces');

    const sale={
        id,date,number,client:'Ventes journalières',totalTTC,mode,paymentDate:date,
        items:recipeItems,source:'daily-scan',
        reportHT:Number(ppDailyScanReportSummary?.subtotalHT||0),
        reportVAT:Number(ppDailyScanReportSummary?.vat||0),
        reportPayments:paymentMethods,
        createdAt:new Date().toISOString()
    };

    salesPP.unshift(sale);
    applySaleConsumptionPP(sale);
    applyDirectStockItemsFromDailyScanPP(sale,ppDailyScanMatches);

    dailySalesScansPP.unshift({
        id:createId(),saleId:sale.id,date,number,
        items:JSON.parse(JSON.stringify(ppDailyScanMatches)),
        rawText:ppDailyScanText,totalTTC,
        reportHT:sale.reportHT,reportVAT:sale.reportVAT,reportPayments:paymentMethods,
        createdAt:new Date().toISOString()
    });

    saveData();closeModal('ppDailyScanModal');renderAll();showSalesSubtabPP('daily');
}

function deleteDailySalesScanPP(id){
    const scan=dailySalesScansPP.find(x=>Number(x.id)===Number(id));if(!scan||!confirm('Supprimer ce scan ? Les sorties de stock liées seront annulées.'))return;
    const sale=salesPP.find(x=>Number(x.id)===Number(scan.saleId));
    if(sale)rollbackSaleConsumptionPP(sale);
    rollbackDailyDirectStockPP(scan.saleId);
    salesPP=salesPP.filter(x=>Number(x.id)!==Number(scan.saleId));
    dailySalesScansPP=dailySalesScansPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();showSalesSubtabPP('daily');
}


/* FIX PDF VENTES: conserver les lignes/colonnes du rapport Articles Report */
function ppPdfTextContentToRowsPP(tc){
    const items=(tc?.items||[])
        .filter(x=>String(x.str||'').trim())
        .map(x=>({
            str:String(x.str||'').trim(),
            x:Number(x.transform?.[4]||0),
            y:Number(x.transform?.[5]||0)
        }))
        .sort((a,b)=>Math.abs(b.y-a.y)>2 ? b.y-a.y : a.x-b.x);

    const rows=[];
    items.forEach(it=>{
        let row=rows.find(r=>Math.abs(r.y-it.y)<=2.5);
        if(!row){row={y:it.y,items:[]};rows.push(row);}
        row.items.push(it);
    });
    return rows
        .sort((a,b)=>b.y-a.y)
        .map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' ').replace(/\s+/g,' ').trim())
        .filter(Boolean)
        .join('\n');
}

async function extractDailySalesTextPP(file){
    if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
        if(typeof pdfjsLib==='undefined')throw new Error("PDF.js n'est pas chargé.");
        const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        let text='';
        for(let n=1;n<=pdf.numPages;n++){
            const page=await pdf.getPage(n);
            const tc=await page.getTextContent();
            const direct=ppPdfTextContentToRowsPP(tc);
            if(direct.trim().length>25){
                text+='\n'+direct+'\n';
                continue;
            }
            if(typeof Tesseract==='undefined')continue;
            const viewport=page.getViewport({scale:3});
            const canvas=document.createElement('canvas');
            canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
            const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
            await page.render({canvasContext:ctx,viewport}).promise;
            text+='\n'+await runDualOCR(canvas,preprocessCanvas(canvas),'Ventes')+'\n';
        }
        return text;
    }
    if(file.type.startsWith('image/')){
        if(typeof Tesseract==='undefined')throw new Error("Tesseract OCR n'est pas chargé.");
        const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
        canvas.width=Math.round(bitmap.width*2.5);canvas.height=Math.round(bitmap.height*2.5);
        canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
        return await runDualOCR(canvas,preprocessCanvas(canvas),'Ventes journalières');
    }
    throw new Error('Format non supporté.');
}


/* =========================================================
   AFFICHAGE VENTES JOURNALIÈRES — UNE LIGNE PAR ARTICLE
========================================================= */

function ppDailyItemDisplayPP(item){
    const recipe = item.recipeId ? recipesPP.find(r=>Number(r.id)===Number(item.recipeId)) : null;
    const product = item.stockProductId ? products.find(p=>Number(p.id)===Number(item.stockProductId)) : null;

    let designation = item.rawName || item.sourceLine || item.recipeName || item.stockProductName || '-';
    let affectation = 'Non affecté';
    let cls = 'danger';
    let unitCost = 0;

    if(recipe){
        affectation = 'FT: ' + recipe.name;
        cls = 'success';
        unitCost = recipeTotalsPP(recipe).cost;
    }else if(product){
        affectation = 'Stock: ' + product.name;
        cls = 'success';
        unitCost = Number(product.price || 0);
    }else if(item.matchType === 'recipe' && item.recipeName){
        affectation = 'FT: ' + item.recipeName;
        cls = 'warning';
    }else if(item.matchType === 'stock' && item.stockProductName){
        affectation = 'Stock: ' + item.stockProductName;
        cls = 'warning';
    }

    return {
        designation,
        affectation,
        cls,
        cost: unitCost * Number(item.quantity || 0)
    };
}

function renderDailySalesPP(){
    ensureSalesModulePP();
    const t = document.getElementById('ppDailySalesTable');
    if(!t) return;

    // Upgrade table headers for line-by-line detail.
    const table = t.closest('table');
    if(table){
        const head = table.querySelector('thead');
        if(head){
            head.innerHTML = `<tr>
                <th>Date</th>
                <th>N° Scan</th>
                <th>Catégorie</th>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Total TTC</th>
                <th>Affectation</th>
                <th>Coût matière</th>
                <th>Actions</th>
            </tr>`;
        }
        table.style.minWidth = '1250px';
    }

    const scans = dailySalesScansPP.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));

    let qty = 0, ttc = 0, cost = 0;
    scans.forEach(s=>{
        ttc += Number(s.totalTTC || 0);
        (s.items || []).forEach(item=>{
            qty += Number(item.quantity || 0);
            cost += ppDailyItemDisplayPP(item).cost;
        });
    });

    setText('ppDailyScanCount', String(scans.length));
    setText('ppDailyDishCount', formatNumber(qty));
    setText('ppDailyScanTTC', formatMoney(ttc));
    setText('ppDailyScanCost', formatMoney(cost));

    if(!scans.length){
        t.innerHTML = '<tr><td colspan="9" class="empty">Aucun scan de ventes enregistré.</td></tr>';
        return;
    }

    const rows = [];
    scans.forEach(scan=>{
        const items = Array.isArray(scan.items) ? scan.items : [];

        if(!items.length){
            rows.push(`<tr>
                <td>${formatDate(scan.date)}</td>
                <td>${escapeHTML(scan.number || '-')}</td>
                <td>-</td><td>Aucun article</td><td>-</td>
                <td>${formatMoney(scan.totalTTC || 0)}</td>
                <td><span class="status danger">À vérifier</span></td>
                <td>-</td>
                <td><div class="action-buttons">
                    <button class="btn small view" onclick="viewDailySalesScanPP(${scan.id})">👁️</button>
                    <button class="btn small print" onclick="printDailySalesScanPP(${scan.id})">🖨️</button>
                    <button class="btn small danger" onclick="deleteDailySalesScanPP(${scan.id})">🗑️</button>
                </div></td>
            </tr>`);
            return;
        }

        items.forEach((item,index)=>{
            const d = ppDailyItemDisplayPP(item);
            rows.push(`<tr>
                <td>${index===0 ? formatDate(scan.date) : ''}</td>
                <td>${index===0 ? escapeHTML(scan.number || '-') : ''}</td>
                <td>${escapeHTML(item.category || '-')}</td>
                <td><strong>${escapeHTML(d.designation)}</strong></td>
                <td>${formatNumber(item.quantity || 0)}</td>
                <td>${formatMoney(item.totalTTC || 0)}</td>
                <td><span class="status ${d.cls}">${escapeHTML(d.affectation)}</span></td>
                <td>${formatMoney(d.cost)}</td>
                <td>${index===0 ? `<div class="action-buttons">
                    <button class="btn small view" onclick="viewDailySalesScanPP(${scan.id})">👁️</button>
                    <button class="btn small print" onclick="printDailySalesScanPP(${scan.id})">🖨️</button>
                    <button class="btn small danger" onclick="deleteDailySalesScanPP(${scan.id})">🗑️</button>
                </div>` : ''}</td>
            </tr>`);
        });

        // Add a clear total row per scan.
        const scanCost = items.reduce((sum,item)=>sum+ppDailyItemDisplayPP(item).cost,0);
        rows.push(`<tr style="font-weight:800;background:#f8fafc">
            <td></td>
            <td colspan="3">TOTAL ${escapeHTML(scan.number || '')}</td>
            <td>${formatNumber(items.reduce((a,i)=>a+Number(i.quantity||0),0))}</td>
            <td>${formatMoney(scan.totalTTC || 0)}</td>
            <td></td>
            <td>${formatMoney(scanCost)}</td>
            <td></td>
        </tr>`);
    });

    t.innerHTML = rows.join('');
}

function viewDailySalesScanPP(id){
    const s = dailySalesScansPP.find(x=>Number(x.id)===Number(id));
    if(!s) return;

    const body = (s.items||[]).map(item=>{
        const d = ppDailyItemDisplayPP(item);
        return `<tr>
            <td>${escapeHTML(item.category||'-')}</td>
            <td>${escapeHTML(d.designation)}</td>
            <td>${formatNumber(item.quantity||0)}</td>
            <td>${formatMoney(item.totalTTC||0)}</td>
            <td>${escapeHTML(d.affectation)}</td>
            <td>${formatMoney(d.cost)}</td>
        </tr>`;
    }).join('');

    const html = `<div style="overflow:auto;max-height:420px">
        <table style="width:100%;min-width:850px">
            <thead><tr><th>Catégorie</th><th>Désignation</th><th>Qté</th><th>TTC</th><th>Affectation</th><th>Coût matière</th></tr></thead>
            <tbody>${body || '<tr><td colspan="6">Aucun article</td></tr>'}</tbody>
        </table>
    </div>`;

    showDetailsModal(
        'Ventes journalières - ' + s.number,
        [
            ['Date', formatDate(s.date)],
            ['Total TTC', formatMoney(s.totalTTC||0)],
            ['Nombre de lignes', String((s.items||[]).length)],
            ['Détail', html]
        ],
        ()=>printDailySalesScanPP(id),
        true
    );
}

function printDailySalesScanPP(id){
    const s = dailySalesScansPP.find(x=>Number(x.id)===Number(id));
    if(!s) return;

    let totalQty = 0, totalCost = 0;
    const body = (s.items||[]).map(item=>{
        const d = ppDailyItemDisplayPP(item);
        totalQty += Number(item.quantity||0);
        totalCost += d.cost;
        return `<tr>
            <td>${escapeHTML(item.category||'-')}</td>
            <td>${escapeHTML(d.designation)}</td>
            <td>${formatNumber(item.quantity||0)}</td>
            <td>${formatMoney(item.totalTTC||0)}</td>
            <td>${escapeHTML(d.affectation)}</td>
            <td>${formatMoney(d.cost)}</td>
        </tr>`;
    }).join('');

    printDocument(
        'Ventes journalières - ' + s.number,
        `<div class="doc-head"><h1>Pause & Plate</h1><p>Ventes journalières en détail</p></div>
         <p><strong>Date :</strong> ${formatDate(s.date)}<br>
         <strong>N° Scan :</strong> ${escapeHTML(s.number||'-')}</p>
         <table>
            <thead><tr><th>Catégorie</th><th>Désignation</th><th>Quantité</th><th>TTC</th><th>Affectation</th><th>Coût matière</th></tr></thead>
            <tbody>${body}</tbody>
         </table>
         <div class="totals">
            <p>Quantité totale : <strong>${formatNumber(totalQty)}</strong></p>
            <p>Total TTC : <strong>${formatMoney(s.totalTTC||0)}</strong></p>
            <p>Coût matière théorique : <strong>${formatMoney(totalCost)}</strong></p>
         </div>`
    );
}


/* =========================================================
   CONTRÔLE JOURNALIER STOCK
   Sortie manuelle du matin vs consommation théorique des ventes
   IMPORTANT: le scan journalier NE diminue plus le stock réel.
========================================================= */

function ppDateOnlyPP(value){
    const s=String(value||'');
    if(!s)return '';
    if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
    const d=new Date(s);
    if(isNaN(d))return '';
    return d.toISOString().slice(0,10);
}

function ppIsManualDailyExitPP(m){
    if(String(m.type||'').toLowerCase()!=='exit')return false;
    // Exclude all automatic/theoretical sales movements.
    if(['recipe-sale','daily-scan-direct','daily-theoretical'].includes(String(m.source||'')))return false;
    if(m.theoretical===true)return false;
    return true;
}

function ppManualExitQtyForDayPP(productId,date){
    const day=ppDateOnlyPP(date);
    return movements
        .filter(m=>Number(m.productId)===Number(productId) && ppDateOnlyPP(m.date)===day && ppIsManualDailyExitPP(m))
        .reduce((a,m)=>a+Number(m.quantity||0),0);
}

function ppDailyTheoreticalByProductPP(date){
    const day=ppDateOnlyPP(date);
    const map=new Map();

    dailySalesScansPP
        .filter(scan=>ppDateOnlyPP(scan.date)===day)
        .forEach(scan=>{
            (scan.items||[]).forEach(item=>{
                // Fiche technique: explode ingredients.
                if(item.recipeId){
                    const r=recipesPP.find(x=>Number(x.id)===Number(item.recipeId));
                    if(r){
                        const portions=Math.max(Number(r.portions||1),1);
                        (r.ingredients||[]).forEach(ing=>{
                            const productId=Number(ing.productId);
                            if(!productId)return;
                            const qty=(Number(ing.quantity||0)/portions)*Number(item.quantity||0);
                            if(!(qty>0))return;
                            if(!map.has(productId))map.set(productId,0);
                            map.set(productId,map.get(productId)+qty);
                        });
                    }
                }
                // Direct stock article (water, soft drink, extras, etc.)
                else if(item.stockProductId){
                    const productId=Number(item.stockProductId);
                    const qty=Number(item.quantity||0);
                    if(productId && qty>0){
                        if(!map.has(productId))map.set(productId,0);
                        map.set(productId,map.get(productId)+qty);
                    }
                }
            });
        });

    return map;
}

function getDailyStockVarianceRowsPP(date){
    const theoretical=ppDailyTheoreticalByProductPP(date);
    const ids=new Set([...theoretical.keys()]);

    movements
        .filter(m=>ppDateOnlyPP(m.date)===ppDateOnlyPP(date) && ppIsManualDailyExitPP(m))
        .forEach(m=>ids.add(Number(m.productId)));

    return [...ids].map(productId=>{
        const p=products.find(x=>Number(x.id)===Number(productId));
        const manual=ppManualExitQtyForDayPP(productId,date);
        const theo=Number(theoretical.get(productId)||0);
        // Positive = quantity sortie le matin mais non consommée théoriquement.
        // Negative = consommation théorique supérieure à la sortie manuelle.
        const variance=manual-theo;
        return {
            productId,
            productName:p?.name||'Article supprimé',
            unit:p?.unit||'',
            manual,
            theoretical:theo,
            variance
        };
    }).sort((a,b)=>String(a.productName).localeCompare(String(b.productName),'fr'));
}

function ppEnsureDailyVarianceUI_PP(){
    const content=document.getElementById('ppSalesDailyContent');
    if(!content || document.getElementById('ppDailyVarianceBlock'))return;

    const block=document.createElement('div');
    block.id='ppDailyVarianceBlock';
    block.style.cssText='background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin-top:16px;overflow:auto';
    block.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 style="margin:0">📊 Contrôle consommation du jour</h3>
          <p style="margin:4px 0 0;color:#667085">Sortie stock manuelle du matin comparée à la consommation théorique calculée depuis les fiches techniques.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:end">
          <div><label style="display:block;font-weight:700;margin-bottom:4px">Date</label><input id="ppDailyVarianceDate" type="date" onchange="renderDailyStockVariancePP()" style="padding:8px"></div>
          <button class="btn print" onclick="printDailyStockVariancePP()">🖨️ Imprimer</button>
        </div>
      </div>
      <table style="width:100%;min-width:900px">
        <thead><tr><th>Article</th><th>Unité</th><th>Sortie manuelle</th><th>Consommation théorique</th><th>Écart</th><th>Statut</th></tr></thead>
        <tbody id="ppDailyVarianceTable"></tbody>
      </table>`;
    content.appendChild(block);
    setValue('ppDailyVarianceDate',new Date().toISOString().slice(0,10));
}

function renderDailyStockVariancePP(){
    ppEnsureDailyVarianceUI_PP();
    const table=document.getElementById('ppDailyVarianceTable');if(!table)return;
    const date=getValue('ppDailyVarianceDate')||new Date().toISOString().slice(0,10);
    const rows=getDailyStockVarianceRowsPP(date);

    if(!rows.length){
        table.innerHTML='<tr><td colspan="6" class="empty">Aucune sortie manuelle ni consommation théorique pour cette date.</td></tr>';
        return;
    }

    table.innerHTML=rows.map(r=>{
        const eps=0.000001;
        let status='Équilibré',cls='success';
        if(r.variance>eps){status='Reste / Écart positif';cls='warning';}
        if(r.variance<-eps){status='Dépassement';cls='danger';}
        return `<tr>
          <td><strong>${escapeHTML(r.productName)}</strong></td>
          <td>${escapeHTML(r.unit||'-')}</td>
          <td>${formatNumber(r.manual)} ${escapeHTML(r.unit)}</td>
          <td>${formatNumber(r.theoretical)} ${escapeHTML(r.unit)}</td>
          <td><strong>${formatNumber(r.variance)} ${escapeHTML(r.unit)}</strong></td>
          <td><span class="status ${cls}">${status}</span></td>
        </tr>`;
    }).join('');
}

function printDailyStockVariancePP(){
    const date=getValue('ppDailyVarianceDate')||new Date().toISOString().slice(0,10);
    const rows=getDailyStockVarianceRowsPP(date);
    const body=rows.map(r=>`<tr><td>${escapeHTML(r.productName)}</td><td>${escapeHTML(r.unit)}</td><td>${formatNumber(r.manual)}</td><td>${formatNumber(r.theoretical)}</td><td>${formatNumber(r.variance)}</td></tr>`).join('');
    printDocument('Contrôle consommation - '+date,`<div class="doc-head"><h1>Pause & Plate</h1><p>Contrôle consommation journalière</p></div><p><strong>Date :</strong> ${formatDate(date)}</p><table><thead><tr><th>Article</th><th>Unité</th><th>Sortie manuelle</th><th>Consommation théorique</th><th>Écart</th></tr></thead><tbody>${body||'<tr><td colspan="5">Aucune donnée</td></tr>'}</tbody></table>`);
}

/*
  Repair scans already saved by older versions:
  the old version deducted stock again from daily scans.
  We restore those quantities once and remove only automatic daily-scan movements.
*/
function repairLegacyDailyScanStockPP(){
    const affectedSaleIds=new Set(
        salesPP.filter(s=>s.source==='daily-scan').map(s=>Number(s.id))
    );
    if(!affectedSaleIds.size)return;

    const legacy=movements.filter(m=>
        affectedSaleIds.has(Number(m.saleId)) &&
        (m.source==='recipe-sale' || m.source==='daily-scan-direct')
    );
    if(!legacy.length)return;

    legacy.forEach(m=>{
        const p=products.find(x=>Number(x.id)===Number(m.productId));
        if(p)p.stock=Number(p.stock||0)+Number(m.quantity||0);
    });
    movements=movements.filter(m=>!(
        affectedSaleIds.has(Number(m.saleId)) &&
        (m.source==='recipe-sale' || m.source==='daily-scan-direct')
    ));
    saveData();
}

/* Override daily scan save: record theoretical consumption ONLY, do not touch physical stock. */
function saveDailySalesScanPP(){
    const recipeItems=ppDailyScanMatches
        .filter(m=>m.matchType==='recipe'&&m.recipeId&&Number(m.quantity)>0)
        .map(m=>({recipeId:Number(m.recipeId),quantity:Number(m.quantity)}));

    const unmatched=ppDailyScanMatches.filter(m=>m.matchType==='unmatched');
    if(unmatched.length && !confirm(`${unmatched.length} ligne(s) ne sont pas affectées à une fiche technique ou au stock. Continuer quand même ?`))return;

    const date=getValue('ppDailyScanDate')||new Date().toISOString().slice(0,10);
    const id=createId(),number='SCAN-'+date.replace(/-/g,'')+'-'+String(id).slice(-5);
    const totalTTC=Number(ppDailyScanReportSummary?.grandTTC||ppDailyScanMatches.reduce((a,m)=>a+Number(m.totalTTC||0),0));

    const paymentMethods=ppDailyScanReportSummary?.paymentMethods||[];
    const mode=paymentMethods.length>1?'Mixte '+paymentMethods.map(p=>p.mode).join('/'):(paymentMethods[0]?.mode||getValue('ppDailyScanMode')||'Espèces');

    const sale={
        id,date,number,client:'Ventes journalières',totalTTC,mode,paymentDate:date,
        items:recipeItems,source:'daily-scan',
        reportHT:Number(ppDailyScanReportSummary?.subtotalHT||0),
        reportVAT:Number(ppDailyScanReportSummary?.vat||0),
        reportPayments:paymentMethods,
        createdAt:new Date().toISOString()
    };

    // IMPORTANT: no applySaleConsumptionPP() here.
    // The morning manual stock exit has already reduced physical stock.
    salesPP.unshift(sale);

    dailySalesScansPP.unshift({
        id:createId(),saleId:sale.id,date,number,
        items:JSON.parse(JSON.stringify(ppDailyScanMatches)),
        rawText:ppDailyScanText,totalTTC,
        reportHT:sale.reportHT,reportVAT:sale.reportVAT,reportPayments:paymentMethods,
        createdAt:new Date().toISOString()
    });

    saveData();closeModal('ppDailyScanModal');renderAll();showSalesSubtabPP('daily');
    setValue('ppDailyVarianceDate',date);renderDailyStockVariancePP();
}

/* Deleting a daily scan no longer restores stock because the scan never deducted it. */
function deleteDailySalesScanPP(id){
    const scan=dailySalesScansPP.find(x=>Number(x.id)===Number(id));if(!scan||!confirm('Supprimer ce scan de ventes ?'))return;
    salesPP=salesPP.filter(x=>Number(x.id)!==Number(scan.saleId));
    dailySalesScansPP=dailySalesScansPP.filter(x=>Number(x.id)!==Number(id));
    saveData();renderAll();showSalesSubtabPP('daily');renderDailyStockVariancePP();
}

/* Extend daily screen render with the variance table. */
const ppRenderDailySalesRowsBasePP = renderDailySalesPP;
renderDailySalesPP = function(){
    ppRenderDailySalesRowsBasePP();
    ppEnsureDailyVarianceUI_PP();
    renderDailyStockVariancePP();
};

// Run once on this loaded dataset; harmless afterwards because movements are removed.
repairLegacyDailyScanStockPP();


/* =========================================================
   AFFECTATIONS MÉMORISÉES DU SCAN
   Vente scannée -> Fiche technique OU Produit fini stock
========================================================= */
const PP_DAILY_MAPPING_KEY='pause_plate_daily_sales_mappings';
let dailySalesMappingsPP=loadStorage(PP_DAILY_MAPPING_KEY,{});
if(!dailySalesMappingsPP || typeof dailySalesMappingsPP!=='object' || Array.isArray(dailySalesMappingsPP)) dailySalesMappingsPP={};

function ppDailyMappingKeyPP(name){
    return ppNormalizeDishNameForMatch(name||'');
}
function saveDailySalesMappingsPP(){
    localStorage.setItem(PP_DAILY_MAPPING_KEY,JSON.stringify(dailySalesMappingsPP));
}
function ppApplySavedDailyMappingPP(item){
    const key=ppDailyMappingKeyPP(item.rawName||item.sourceLine);
    const m=dailySalesMappingsPP[key];
    if(!m)return item;
    if(m.type==='recipe'){
        const r=recipesPP.find(x=>Number(x.id)===Number(m.id));
        if(r){
            item.recipeId=r.id;item.recipeName=r.name;
            item.stockProductId=0;item.stockProductName='';
            item.matchType='recipe';item.score=100;
        }
    }else if(m.type==='stock'){
        const p=products.find(x=>Number(x.id)===Number(m.id));
        if(p){
            item.stockProductId=p.id;item.stockProductName=p.name;
            item.recipeId=0;item.recipeName='';
            item.matchType='stock';item.score=100;
        }
    }
    return item;
}

/* Re-override parser: saved mappings have priority over fuzzy matching. */
function parseDailySalesTextPP(text){
    const report=parseArticlesReportDailySalesPP(text);
    if(!report.items.length){ppDailyScanReportSummary=null;return [];}
    ppDailyScanReportSummary=report;
    return report.items.map(x=>ppApplySavedDailyMappingPP({
        recipeId:Number(x.recipeId)||0,
        recipeName:x.recipeName||'',
        stockProductId:Number(x.stockProductId)||0,
        stockProductName:x.stockProductName||'',
        matchType:x.matchType,
        rawName:x.rawName,
        category:x.category,
        quantity:Number(x.quantity||0),
        totalTTC:Number(x.totalTTC||0),
        score:Number(x.score||0),
        sourceLine:x.rawName
    }));
}

function updateDailySalesAssignmentPP(index,value){
    const m=ppDailyScanMatches[index];if(!m)return;
    m.recipeId=0;m.recipeName='';m.stockProductId=0;m.stockProductName='';
    m.matchType='unmatched';m.score=0;

    const key=ppDailyMappingKeyPP(m.rawName||m.sourceLine);

    if(String(value).startsWith('r:')){
        const id=Number(String(value).slice(2));
        const r=recipesPP.find(x=>Number(x.id)===id);
        if(r){
            m.recipeId=id;m.recipeName=r.name;m.matchType='recipe';m.score=100;
            dailySalesMappingsPP[key]={type:'recipe',id};
        }
    }else if(String(value).startsWith('p:')){
        const id=Number(String(value).slice(2));
        const p=products.find(x=>Number(x.id)===id);
        if(p){
            m.stockProductId=id;m.stockProductName=p.name;m.matchType='stock';m.score=100;
            dailySalesMappingsPP[key]={type:'stock',id};
        }
    }else{
        delete dailySalesMappingsPP[key];
    }
    saveDailySalesMappingsPP();
    renderDailyScanReviewPP();
}

/* Clearer selector: two explicit groups, FT first, then finished/direct-stock products. */
function renderDailyScanReviewPP(){
    const box=document.getElementById('ppDailyScanReview');if(!box)return;
    if(!ppDailyScanMatches.length){
        box.innerHTML='<div class="scan-note">Aucune ligne de vente reconnue.</div>';
        document.getElementById('ppDailyScanSaveBtn').disabled=true;return;
    }

    const matched=ppDailyScanMatches.filter(x=>x.matchType!=='unmatched').length;
    const unmatched=ppDailyScanMatches.length-matched;
    const sumTTC=ppDailyScanReportSummary?.grandTTC||ppDailyScanMatches.reduce((a,x)=>a+Number(x.totalTTC||0),0);

    box.innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0">
        <div class="stat-card" style="padding:12px"><small>Lignes détectées</small><strong style="display:block">${ppDailyScanMatches.length}</strong></div>
        <div class="stat-card" style="padding:12px"><small>Affectées</small><strong style="display:block">${matched}</strong></div>
        <div class="stat-card" style="padding:12px"><small>À vérifier</small><strong style="display:block">${unmatched}</strong></div>
        <div class="stat-card" style="padding:12px"><small>Net TTC rapport</small><strong style="display:block">${formatMoney(sumTTC)}</strong></div>
      </div>
      <div style="padding:10px 12px;background:#f8fafc;border-radius:10px;margin-bottom:12px">
        <strong>Principe :</strong> plats préparés → Fiche Technique ; boissons/produits finis → Produit fini / Stock direct.
        Le choix manuel est mémorisé pour les prochains scans.
      </div>
      <h3>Vérification avant enregistrement</h3>
      <div style="overflow:auto"><table style="width:100%;min-width:1100px">
      <thead><tr><th>Catégorie</th><th>Désignation rapport</th><th>Qté</th><th>Total TTC</th><th>Affectation</th><th>Confiance</th></tr></thead><tbody>
      ${ppDailyScanMatches.map((m,i)=>{
        const recipeOpts=recipesPP.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'))
            .map(r=>`<option value="r:${r.id}" ${Number(r.id)===Number(m.recipeId)?'selected':''}>${escapeHTML(r.name)}</option>`).join('');
        const stockOpts=products.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'fr'))
            .map(p=>`<option value="p:${p.id}" ${Number(p.id)===Number(m.stockProductId)?'selected':''}>${escapeHTML(p.name)}</option>`).join('');
        const selected=m.recipeId?`r:${m.recipeId}`:(m.stockProductId?`p:${m.stockProductId}`:'');
        return `<tr>
          <td>${escapeHTML(m.category||'-')}</td>
          <td><strong>${escapeHTML(m.rawName||m.sourceLine||'-')}</strong></td>
          <td><input type="number" min="0.000001" step="0.000001" value="${m.quantity}" onchange="ppDailyScanMatches[${i}].quantity=Number(this.value)"></td>
          <td>${formatMoney(m.totalTTC||0)}</td>
          <td>
            <select onchange="updateDailySalesAssignmentPP(${i},this.value)" style="min-width:300px">
              <option value="">-- Non affecté --</option>
              <optgroup label="🍽️ FICHES TECHNIQUES">${recipeOpts}</optgroup>
              <optgroup label="📦 PRODUITS FINIS / STOCK DIRECT">${stockOpts}</optgroup>
            </select>
          </td>
          <td>${m.matchType==='unmatched'?'<span class="status danger">À vérifier</span>':`<span class="status success">${m.score>=100?'Mémorisé / validé':Math.round(m.score)+'%'}</span>`}</td>
        </tr>`;
      }).join('')}
      </tbody></table></div>
      ${ppDailyScanReportSummary?.paymentMethods?.length?`<div style="margin-top:12px"><strong>Paiements :</strong> ${ppDailyScanReportSummary.paymentMethods.map(p=>`${p.mode}: ${formatMoney(p.amount)}`).join(' / ')}</div>`:''}
      ${ppDailyScanReportSummary?.subtotalHT?`<div style="margin-top:6px"><strong>HT:</strong> ${formatMoney(ppDailyScanReportSummary.subtotalHT)} — <strong>TVA:</strong> ${formatMoney(ppDailyScanReportSummary.vat)} — <strong>TTC:</strong> ${formatMoney(ppDailyScanReportSummary.grandTTC)}</div>`:''}
    `;

    [...box.querySelectorAll('tbody select')].forEach((sel,idx)=>{
        const m=ppDailyScanMatches[idx];
        sel.value=m.recipeId?`r:${m.recipeId}`:(m.stockProductId?`p:${m.stockProductId}`:'');
    });
    document.getElementById('ppDailyScanSaveBtn').disabled=false;
}


/* =========================================================
   VENTES — SOUS-MENU SÉPARÉ "CONTRÔLE CONSOMMATION DU JOUR"
========================================================= */

function ppEnsureSalesControlSubmenuPP(){
    ensureSalesModulePP();
    const nav=document.getElementById('ppSalesSubmenu');
    if(nav && !document.getElementById('ppSalesTabControl')){
        const b=document.createElement('button');
        b.id='ppSalesTabControl';b.className='btn';b.type='button';
        b.textContent='Contrôle consommation du jour';
        b.onclick=()=>showSalesSubtabPP('control');
        nav.appendChild(b);
    }

    const shell=document.getElementById('ppSalesShell');
    if(shell && !document.getElementById('ppSalesControlContent')){
        const div=document.createElement('div');
        div.id='ppSalesControlContent';
        div.style.display='none';
        div.innerHTML=`
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">
            <div>
              <h2 style="margin:0 0 4px">📊 Contrôle consommation du jour</h2>
              <p style="margin:0;color:#667085">Comparaison entre les sorties manuelles du matin et la consommation théorique calculée depuis les ventes et fiches techniques.</p>
            </div>
            <div style="display:flex;gap:8px;align-items:end">
              <div><label style="display:block;font-weight:700;margin-bottom:4px">Date</label><input id="ppDailyVarianceDateControl" type="date" onchange="renderDailyStockVarianceControlPP()" style="padding:8px"></div>
              <button class="btn print" onclick="printDailyStockVarianceControlPP()">🖨️ Imprimer</button>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;overflow:auto">
            <table style="width:100%;min-width:950px">
              <thead><tr><th>Article</th><th>Unité</th><th>Sortie manuelle</th><th>Consommation théorique</th><th>Écart</th><th>Statut</th></tr></thead>
              <tbody id="ppDailyVarianceControlTable"></tbody>
            </table>
          </div>`;
        shell.appendChild(div);
        setValue('ppDailyVarianceDateControl',new Date().toISOString().slice(0,10));
    }

    // Remove/hide old variance block from daily sales page.
    const old=document.getElementById('ppDailyVarianceBlock');
    if(old)old.style.display='none';
}

function renderDailyStockVarianceControlPP(){
    ppEnsureSalesControlSubmenuPP();
    const table=document.getElementById('ppDailyVarianceControlTable');if(!table)return;
    const date=getValue('ppDailyVarianceDateControl')||new Date().toISOString().slice(0,10);
    const rows=getDailyStockVarianceRowsPP(date);
    if(!rows.length){
        table.innerHTML='<tr><td colspan="6" class="empty">Aucune sortie manuelle ni consommation théorique pour cette date.</td></tr>';
        return;
    }
    table.innerHTML=rows.map(r=>{
        const eps=.000001;
        let status='Équilibré',cls='success';
        if(r.variance>eps){status='Reste / Écart positif';cls='warning';}
        if(r.variance<-eps){status='Dépassement';cls='danger';}
        return `<tr>
          <td><strong>${escapeHTML(r.productName)}</strong></td>
          <td>${escapeHTML(r.unit||'-')}</td>
          <td>${formatNumber(r.manual)} ${escapeHTML(r.unit)}</td>
          <td>${formatNumber(r.theoretical)} ${escapeHTML(r.unit)}</td>
          <td><strong>${formatNumber(r.variance)} ${escapeHTML(r.unit)}</strong></td>
          <td><span class="status ${cls}">${status}</span></td>
        </tr>`;
    }).join('');
}

function printDailyStockVarianceControlPP(){
    const date=getValue('ppDailyVarianceDateControl')||new Date().toISOString().slice(0,10);
    const rows=getDailyStockVarianceRowsPP(date);
    const body=rows.map(r=>`<tr><td>${escapeHTML(r.productName)}</td><td>${escapeHTML(r.unit)}</td><td>${formatNumber(r.manual)}</td><td>${formatNumber(r.theoretical)}</td><td>${formatNumber(r.variance)}</td></tr>`).join('');
    printDocument('Contrôle consommation - '+date,`<div class="doc-head"><h1>Pause & Plate</h1><p>Contrôle consommation du jour</p></div><p><strong>Date :</strong> ${formatDate(date)}</p><table><thead><tr><th>Article</th><th>Unité</th><th>Sortie manuelle</th><th>Consommation théorique</th><th>Écart</th></tr></thead><tbody>${body||'<tr><td colspan="5">Aucune donnée</td></tr>'}</tbody></table>`);
}

/* Final subtab controller: 3 separate pages. */
function showSalesSubtabPP(tab){
    ppSalesSubtab=tab;
    ppEnsureSalesControlSubmenuPP();

    const main=document.getElementById('ppSalesMainContent');
    const daily=document.getElementById('ppSalesDailyContent');
    const control=document.getElementById('ppSalesControlContent');
    if(main)main.style.display=tab==='sales'?'block':'none';
    if(daily)daily.style.display=tab==='daily'?'block':'none';
    if(control)control.style.display=tab==='control'?'block':'none';

    document.getElementById('ppSalesTabMain')?.classList.toggle('primary',tab==='sales');
    document.getElementById('ppSalesTabDaily')?.classList.toggle('primary',tab==='daily');
    document.getElementById('ppSalesTabControl')?.classList.toggle('primary',tab==='control');

    const old=document.getElementById('ppDailyVarianceBlock');
    if(old)old.style.display='none';

    if(tab==='sales')renderSalesPP();
    else if(tab==='daily'){
        // Call the row renderer; old variance block remains hidden.
        ppRenderDailySalesRowsBasePP();
        if(old)old.style.display='none';
    }else if(tab==='control'){
        renderDailyStockVarianceControlPP();
    }
}

/* Make sure the third submenu exists whenever sales module is rendered. */
const ppRenderSalesWithControlBasePP=renderSalesPP;
renderSalesPP=function(){
    ppRenderSalesWithControlBasePP();
    ppEnsureSalesControlSubmenuPP();
    const old=document.getElementById('ppDailyVarianceBlock');
    if(old)old.style.display='none';
    const main=document.getElementById('ppSalesMainContent');
    const daily=document.getElementById('ppSalesDailyContent');
    const control=document.getElementById('ppSalesControlContent');
    if(main)main.style.display=ppSalesSubtab==='sales'?'block':'none';
    if(daily)daily.style.display=ppSalesSubtab==='daily'?'block':'none';
    if(control)control.style.display=ppSalesSubtab==='control'?'block':'none';
};


/* =========================================================
   FIREBASE CLOUD SYNC — PAUSE & PLATE
   Authentication + Firestore + LocalStorage migration
========================================================= */

const PP_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCFmkzzPddjyfVxseHR2OyeI-Vv9E36ZG0",
    authDomain: "pause-plate-manager.firebaseapp.com",
    projectId: "pause-plate-manager",
    storageBucket: "pause-plate-manager.firebasestorage.app",
    messagingSenderId: "99579367646",
    appId: "1:99579367646:web:c755e97bdcfee14a87724f",
    measurementId: "G-JB3R86P8E0"
};

const PP_COMPANY_ID = "pause-plate-manager";
const PP_ADMIN_EMAIL = "asmaabd1987@gmail.com";
let ppFirebaseApp = null;
let ppAuth = null;
let ppDb = null;
let ppCurrentUser = null;
let ppCurrentRole = "admin";
let ppCloudReady = false;
let ppCloudSaveTimer = null;
let ppCloudSaving = false;
let ppCloudListeners = [];
let ppApplyingCloudState = false;

const PP_CLOUD_DATASETS = {
    products: () => products,
    movements: () => movements,
    suppliers: () => suppliers,
    invoices: () => invoices,
    supplierPayments: () => supplierPaymentsPP,
    clients: () => clientsPP,
    clientInvoices: () => clientInvoicesPP,
    clientPayments: () => clientPaymentsPP,
    sales: () => salesPP,
    expenses: () => expensesPP,
    recipes: () => recipesPP,
    dailySalesScans: () => dailySalesScansPP
};

function ppFirebaseAvailable(){
    return typeof firebase !== "undefined" && firebase.apps !== undefined;
}

function ppDataDoc(key){
    return ppDb.collection("companies").doc(PP_COMPANY_ID).collection("data").doc(key);
}

function ppMetaDoc(){
    return ppDb.collection("companies").doc(PP_COMPANY_ID).collection("meta").doc("app");
}

function ppUserDoc(uid){
    return ppDb.collection("users").doc(uid);
}

function ppUsernameToAuthEmail(username){
    const u=String(username||"").trim().toLowerCase();
    if(!u)return "";
    // Keep admin simple: username "admin" uses the existing real Firebase admin account.
    if(u==="admin" || u==="asma" || u==="asmaabd1987-ui")return PP_ADMIN_EMAIL;
    // Backward-compatible: an email can still be used by the administrator if needed.
    if(u.includes("@"))return u;
    // Employees never see this internal technical email.
    const safe=u.replace(/[^a-z0-9._-]/g,"").replace(/^[._-]+|[._-]+$/g,"");
    return safe ? `${safe}@pauseplate-employee.com` : "";
}

function ppShowLogin(message=""){
    let overlay=document.getElementById("ppFirebaseLogin");
    if(!overlay){
        overlay=document.createElement("div");
        overlay.id="ppFirebaseLogin";
        overlay.innerHTML=`
          <div class="pp-cloud-login-card">
            <div class="pp-cloud-logo">Pause & Plate</div>
            <div class="pp-cloud-subtitle">MANAGER — Connexion</div>
            <form id="ppCloudLoginForm">
              <label>Utilisateur</label>
              <input id="ppCloudUsername" type="text" autocomplete="username" placeholder="Ex: admin, ahmed, stock1" required>
              <label>Mot de passe</label>
              <input id="ppCloudPassword" type="password" autocomplete="current-password" required>
              <div id="ppCloudLoginMessage" class="pp-cloud-message"></div>
              <button class="btn primary" type="submit">Se connecter</button>
            </form>
          </div>`;
        document.body.appendChild(overlay);
        document.getElementById("ppCloudUsername").value=localStorage.getItem("pause_plate_last_username")||"admin";
        document.getElementById("ppCloudLoginForm").addEventListener("submit",async e=>{
            e.preventDefault();
            const username=getValue("ppCloudUsername").trim();
            const email=ppUsernameToAuthEmail(username);
            const password=getValue("ppCloudPassword");
            const msg=document.getElementById("ppCloudLoginMessage");
            if(!email){msg.textContent="Nom d'utilisateur invalide.";return;}
            msg.textContent="Connexion...";
            try{
                localStorage.setItem("pause_plate_last_username",username);
                await ppAuth.signInWithEmailAndPassword(email,password);
            }catch(err){
                console.error(err);
                msg.textContent=ppFriendlyAuthError(err);
            }
        });
    }
    const msg=document.getElementById("ppCloudLoginMessage");
    if(msg)msg.textContent=message;
    overlay.style.display="flex";
    document.querySelector(".app")?.classList.add("pp-cloud-locked");
}

function ppHideLogin(){
    const overlay=document.getElementById("ppFirebaseLogin");
    if(overlay)overlay.style.display="none";
    document.querySelector(".app")?.classList.remove("pp-cloud-locked");
}

function ppFriendlyAuthError(err){
    const code=String(err?.code||"");
    if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found")) return "Utilisateur ou mot de passe incorrect.";
    if(code.includes("too-many-requests")) return "Trop de tentatives. Réessayez plus tard.";
    if(code.includes("network")) return "Connexion internet indisponible.";
    return "Connexion impossible: "+(err?.message||"Erreur inconnue");
}

function ppAddCloudHeader(){
    const profile=document.querySelector(".profile");
    if(!profile||document.getElementById("ppCloudUserBox"))return;
    const box=document.createElement("div");
    box.id="ppCloudUserBox";
    box.className="pp-cloud-user-box";
    box.innerHTML=`<span id="ppCloudStatus">☁️ Cloud</span><small id="ppCloudUser"></small><button type="button" onclick="ppLogout()">Déconnexion</button>`;
    profile.parentNode?.insertBefore(box,profile);
}

async function ppLogout(){
    if(ppAuth)await ppAuth.signOut();
}

async function ppEnsureUserProfile(user){
    const profileRef=ppDb.collection("userProfiles").doc(user.uid);
    const legacyRef=ppUserDoc(user.uid);
    let profile=null;

    try{
        const snap=await profileRef.get();
        if(snap.exists)profile=snap.data()||{};
    }catch(_){}

    if(!profile){
        const legacySnap=await legacyRef.get();
        if(legacySnap.exists)profile=legacySnap.data()||{};
    }

    if(!profile){
        const isAdmin=String(user.email||"").toLowerCase()===PP_ADMIN_EMAIL.toLowerCase();
        profile={
            name:isAdmin?"Admin":"Utilisateur",
            username:isAdmin?"admin":"",
            email:user.email||"",
            role:isAdmin?"admin":"employee",
            active:true,
            permissions:{stock:true,expenses:true}
        };
        await profileRef.set({
            ...profile,
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
        await legacyRef.set({
            email:user.email||"",
            role:profile.role,
            active:true,
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
    }

    if(profile.active===false){
        await ppAuth.signOut();
        throw new Error("Ce compte est désactivé. Contactez l’administrateur.");
    }

    ppCurrentRole=String(profile.role||"employee");
    ppCurrentUserProfile={
        ...profile,
        role:ppCurrentRole,
        permissions:profile.permissions||{stock:true,expenses:true}
    };

    // Keep last login trace.
    try{
        await profileRef.set({
            lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
    }catch(_){}
}

function ppStateSnapshot(){
    const out={};
    Object.entries(PP_CLOUD_DATASETS).forEach(([key,getter])=>out[key]=getter());
    return out;
}

function ppSetDataset(key,items){
    const safe=Array.isArray(items)?items:[];
    switch(key){
        case "products": products=safe; break;
        case "movements": movements=safe; break;
        case "suppliers": suppliers=safe; break;
        case "invoices": invoices=safe; break;
        case "supplierPayments": supplierPaymentsPP=safe; break;
        case "clients": clientsPP=safe; break;
        case "clientInvoices": clientInvoicesPP=safe; break;
        case "clientPayments": clientPaymentsPP=safe; break;
        case "sales": salesPP=safe; break;
        case "expenses": expensesPP=safe; break;
        case "recipes": recipesPP=safe; break;
        case "dailySalesScans": dailySalesScansPP=safe; break;
    }
}

function ppSaveLocalOnly(){
    localStorage.setItem(STORAGE_KEYS.products,JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.movements,JSON.stringify(movements));
    localStorage.setItem(STORAGE_KEYS.suppliers,JSON.stringify(suppliers));
    localStorage.setItem(STORAGE_KEYS.invoices,JSON.stringify(invoices));
    localStorage.setItem(PP_EXTRA_KEYS.supplierPayments,JSON.stringify(supplierPaymentsPP));
    localStorage.setItem(PP_EXTRA_KEYS.clients,JSON.stringify(clientsPP));
    localStorage.setItem(PP_EXTRA_KEYS.clientInvoices,JSON.stringify(clientInvoicesPP));
    localStorage.setItem(PP_EXTRA_KEYS.clientPayments,JSON.stringify(clientPaymentsPP));
    localStorage.setItem(PP_EXTRA_KEYS.sales,JSON.stringify(salesPP));
    localStorage.setItem(PP_EXTRA_KEYS.expenses,JSON.stringify(expensesPP));
    localStorage.setItem(PP_EXTRA_KEYS.recipes,JSON.stringify(recipesPP));
    localStorage.setItem(PP_EXTRA_KEYS.dailySalesScans,JSON.stringify(dailySalesScansPP));
}

function ppLocalHasData(){
    return products.length||movements.length||suppliers.length||invoices.length||supplierPaymentsPP.length||clientsPP.length||clientInvoicesPP.length||clientPaymentsPP.length||salesPP.length||expensesPP.length||recipesPP.length||dailySalesScansPP.length;
}

async function ppCloudHasData(){
    const meta=await ppMetaDoc().get();
    if(meta.exists&&meta.data()?.initialized)return true;
    const productDoc=await ppDataDoc("products").get();
    return productDoc.exists;
}

async function ppUploadAllLocalToCloud(){
    const state=ppStateSnapshot();
    const batch=ppDb.batch();
    Object.entries(state).forEach(([key,items])=>{
        batch.set(ppDataDoc(key),{items,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ppCurrentUser?.uid||null});
    });
    batch.set(ppMetaDoc(),{
        initialized:true,
        migratedAt:firebase.firestore.FieldValue.serverTimestamp(),
        migratedBy:ppCurrentUser?.uid||null,
        schemaVersion:1
    },{merge:true});
    await batch.commit();
}

async function ppLoadAllCloud(){
    ppApplyingCloudState=true;
    try{
        for(const key of Object.keys(PP_CLOUD_DATASETS)){
            const snap=await ppDataDoc(key).get();
            if(snap.exists)ppSetDataset(key,snap.data()?.items||[]);
        }
        ppSaveLocalOnly();
    }finally{ppApplyingCloudState=false;}
}

function ppStopCloudListeners(){
    ppCloudListeners.forEach(fn=>{try{fn();}catch(_){}});
    ppCloudListeners=[];
}

function ppStartCloudListeners(){
    ppStopCloudListeners();
    Object.keys(PP_CLOUD_DATASETS).forEach(key=>{
        const unsub=ppDataDoc(key).onSnapshot(snap=>{
            if(!ppCloudReady||ppCloudSaving||!snap.exists)return;
            const remote=snap.data()?.items;
            if(!Array.isArray(remote))return;
            ppApplyingCloudState=true;
            try{
                ppSetDataset(key,remote);
                ppSaveLocalOnly();
                renderAll();
            }finally{ppApplyingCloudState=false;}
        },err=>console.error("Firestore listener",key,err));
        ppCloudListeners.push(unsub);
    });
}

async function ppSaveCloudNow(){
    if(!ppCloudReady||!ppCurrentUser||ppApplyingCloudState||ppCloudSaving)return;
    ppCloudSaving=true;
    const status=document.getElementById("ppCloudStatus");
    if(status)status.textContent="☁️ Synchronisation...";
    try{
        const state=ppStateSnapshot();
        const batch=ppDb.batch();
        Object.entries(state).forEach(([key,items])=>batch.set(ppDataDoc(key),{
            items,
            updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy:ppCurrentUser.uid
        }));
        await batch.commit();
        if(status)status.textContent="✅ Synchronisé";
    }catch(err){
        console.error("Cloud save failed",err);
        if(status)status.textContent="⚠️ Hors ligne — sauvegarde locale";
    }finally{ppCloudSaving=false;}
}

function ppScheduleCloudSave(){
    if(!ppCloudReady||ppApplyingCloudState)return;
    clearTimeout(ppCloudSaveTimer);
    ppCloudSaveTimer=setTimeout(ppSaveCloudNow,500);
}

// Upgrade the existing saveData: local immediately, cloud in background.
const ppLegacySaveData = saveData;
saveData = function(){
    ppLegacySaveData();
    ppScheduleCloudSave();
};

async function ppBootstrapCloud(user){
    ppCurrentUser=user;
    await ppEnsureUserProfile(user);
    const cloudHas=await ppCloudHasData();
    if(!cloudHas){
        if(ppLocalHasData()){
            const ok=confirm("Première connexion Cloud. Copier les données de cet ordinateur vers Firebase ?\n\nChoisissez OK sur l’ordinateur qui contient la version la plus complète des données.");
            if(ok)await ppUploadAllLocalToCloud();
            else await ppMetaDoc().set({initialized:true,schemaVersion:1,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        }else{
            await ppUploadAllLocalToCloud();
        }
    }else{
        await ppLoadAllCloud();
    }
    ppCloudReady=true;
    ppAddCloudHeader();
    const userText=document.getElementById("ppCloudUser");
    if(userText)userText.textContent=(ppCurrentUserProfile?.name||ppCurrentUserProfile?.username||"Utilisateur")+" — "+ppCurrentRole;
    ppHideLogin();
    setTimeout(ppEnsureUserManagerButton,100);
    ensurePPExtraUI();
    renderAll();
    ppStartCloudListeners();
}

function ppInitFirebase(){
    if(!ppFirebaseAvailable()){
        alert("Firebase n'a pas pu être chargé. Vérifiez la connexion Internet.");
        ensurePPExtraUI();renderAll();return;
    }
    ppFirebaseApp=firebase.apps.length?firebase.app():firebase.initializeApp(PP_FIREBASE_CONFIG);
    ppAuth=firebase.auth();
    ppDb=firebase.firestore();
    try{ppDb.enablePersistence({synchronizeTabs:true}).catch(()=>{});}catch(_){ }

    ppShowLogin();
    ppAuth.onAuthStateChanged(async user=>{
        if(!user){
            ppCloudReady=false;ppCurrentUser=null;ppStopCloudListeners();ppShowLogin();return;
        }
        const msg=document.getElementById("ppCloudLoginMessage");if(msg)msg.textContent="Chargement des données Cloud...";
        try{await ppBootstrapCloud(user);}catch(err){
            console.error(err);
            ppShowLogin("Erreur Firebase: "+(err?.message||err));
        }
    });
}

document.addEventListener("DOMContentLoaded",ppInitFirebase);


/* =========================================================
   USERS / PERMISSIONS / AUDIT TRAIL — PAUSE & PLATE
   Phase 1: Admin + Employé Stock & Dépenses
========================================================= */

const PP_ACCESS = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee'
};

let ppCurrentUserProfile = null;
let ppAuditTrail = JSON.parse(localStorage.getItem('pause_plate_audit_trail') || '[]');

function ppCurrentFirebaseUser(){
    try{
        return (typeof ppAuth!=='undefined' && ppAuth && ppAuth.currentUser) ? ppAuth.currentUser : null;
    }catch(e){ return null; }
}

function ppUserIdentity(){
    const u=ppCurrentFirebaseUser();
    return {
        uid: u?.uid || 'local',
        email: u?.email || 'Utilisateur local',
        name: ppCurrentUserProfile?.name || u?.displayName || u?.email || 'Utilisateur',
        role: ppCurrentUserProfile?.role || PP_ACCESS.ADMIN
    };
}

function ppIsAdmin(){
    return (ppCurrentUserProfile?.role || PP_ACCESS.ADMIN) === PP_ACCESS.ADMIN;
}

function ppCan(module,action='view'){
    if(ppIsAdmin()) return true;
    const perms=ppCurrentUserProfile?.permissions || {};
    if(module==='stock') return perms.stock !== false;
    if(module==='expenses') return perms.expenses !== false;
    return false;
}

function ppAuditSnapshot(value){
    if(value===undefined) return null;
    try{return JSON.parse(JSON.stringify(value));}catch(e){return String(value);}
}

function ppAuditDiff(before,after){
    const b=before||{},a=after||{},changes=[];
    const keys=new Set([...Object.keys(b),...Object.keys(a)]);
    keys.forEach(k=>{
        if(['updatedAt','createdAt','auditCount'].includes(k))return;
        const bv=JSON.stringify(b[k]??null), av=JSON.stringify(a[k]??null);
        if(bv!==av) changes.push({field:k,before:b[k]??null,after:a[k]??null});
    });
    return changes;
}

async function ppWriteAudit(module,entityId,action,before,after,label=''){
    const who=ppUserIdentity();
    const previous=ppAuditTrail.filter(x=>x.module===module && String(x.entityId)===String(entityId));
    const entry={
        id:Date.now()+Math.floor(Math.random()*100000),
        module,
        entityId:String(entityId),
        label:String(label||''),
        action,
        version:previous.length+1,
        user:who,
        at:new Date().toISOString(),
        before:ppAuditSnapshot(before),
        after:ppAuditSnapshot(after),
        changes:ppAuditDiff(before,after)
    };
    ppAuditTrail.push(entry);
    localStorage.setItem('pause_plate_audit_trail',JSON.stringify(ppAuditTrail));

    // Firestore: separate immutable-ish audit documents; main app sync remains untouched.
    try{
        if(typeof ppDb!=='undefined' && ppDb && who.uid!=='local' && typeof firebase!=='undefined' && firebase.firestore){
            await ppDb.collection('auditLogs').add(entry);
        }
    }catch(e){
        console.warn('Audit cloud différé:',e);
    }
    return entry;
}

function ppAuditCount(module,id){
    return ppAuditTrail.filter(x=>x.module===module && String(x.entityId)===String(id)).length;
}

function ppFormatAuditValue(v){
    if(v===null||v===undefined||v==='')return '—';
    if(typeof v==='object')return escapeHTML(JSON.stringify(v));
    return escapeHTML(String(v));
}

function ppShowAudit(module,id,title='Historique'){
    const rows=ppAuditTrail
      .filter(x=>x.module===module && String(x.entityId)===String(id))
      .sort((a,b)=>new Date(b.at)-new Date(a.at));

    let body='';
    if(!rows.length){
        body='<div class="empty">Aucun historique enregistré pour cette opération.</div>';
    }else{
        body=rows.map(x=>{
            const changes=(x.changes||[]).length
              ? `<table style="width:100%;margin-top:8px"><thead><tr><th>Champ</th><th>Avant</th><th>Après</th></tr></thead><tbody>${x.changes.map(c=>`<tr><td>${escapeHTML(c.field)}</td><td>${ppFormatAuditValue(c.before)}</td><td>${ppFormatAuditValue(c.after)}</td></tr>`).join('')}</tbody></table>`
              : '<div style="color:#667085;margin-top:6px">Création de l’opération.</div>';
            const act=x.action==='create'?'Création':x.action==='update'?'Modification':x.action==='delete'?'Suppression':x.action;
            return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
                  <strong>Version ${x.version} — ${act}</strong>
                  <span>${new Date(x.at).toLocaleString('fr-FR')}</span>
                </div>
                <div style="margin-top:5px">👤 ${escapeHTML(x.user?.name||x.user?.email||'Utilisateur')} ${x.user?.email && x.user?.email!==x.user?.name?`(${escapeHTML(x.user.email)})`:''}</div>
                ${changes}
              </div>`;
        }).join('');
    }

    const modalId='ppAuditModal';
    let m=document.getElementById(modalId);
    if(!m){
        m=document.createElement('div');m.id=modalId;m.className='modal-overlay';
        m.innerHTML=`<div class="modal" style="max-width:1000px"><div class="modal-header"><h2 id="ppAuditTitle">Historique</h2><button onclick="closeModal('${modalId}')">×</button></div><div id="ppAuditBody"></div><div class="modal-actions"><button class="btn" onclick="closeModal('${modalId}')">Fermer</button></div></div>`;
        document.body.appendChild(m);
    }
    document.getElementById('ppAuditTitle').textContent=title;
    document.getElementById('ppAuditBody').innerHTML=body;
    openModal(modalId);
}

function ppAuditMovement(id){ ppShowAudit('stock',id,'Historique de l’opération stock'); }
function ppAuditExpense(id){ ppShowAudit('expenses',id,'Historique de la dépense'); }

/* ---------- STOCK: audit create/update/delete ---------- */
const ppBaseOpenMovementModal = openMovementModal;
openMovementModal = function(type,id=null){
    if(!ppCan('stock','edit')){alert('Accès non autorisé.');return;}
    return ppBaseOpenMovementModal(type,id);
};

const ppBaseSaveMovement = saveMovement;
saveMovement = function(){
    if(!ppCan('stock','edit')){alert('Accès non autorisé.');return;}
    const id=Number(document.getElementById('movementId')?.value||0);
    const before=id?ppAuditSnapshot(movements.find(x=>Number(x.id)===id)):null;
    const beforeIds=new Set(movements.map(x=>String(x.id)));
    const result=ppBaseSaveMovement();
    setTimeout(()=>{
        let after=null, entityId=id;
        if(id) after=movements.find(x=>Number(x.id)===id);
        else{
            after=movements.find(x=>!beforeIds.has(String(x.id))) || movements[movements.length-1];
            entityId=after?.id;
        }
        if(after && entityId!=null){
            after.auditCount=ppAuditCount('stock',entityId)+1;
            ppWriteAudit('stock',entityId,before?'update':'create',before,after,`${after.type||''} ${after.productName||''}`);
            try{saveData();}catch(e){}
        }
    },0);
    return result;
};

const ppBaseDeleteMovement = deleteMovement;
deleteMovement = function(id){
    if(!ppCan('stock','delete')){alert('Accès non autorisé.');return;}
    const before=ppAuditSnapshot(movements.find(x=>Number(x.id)===Number(id)));
    const countBefore=movements.length;
    const result=ppBaseDeleteMovement(id);
    setTimeout(()=>{
        if(before && movements.length<countBefore && !movements.some(x=>Number(x.id)===Number(id))){
            ppWriteAudit('stock',id,'delete',before,null,`${before.type||''} ${before.productName||''}`);
        }
    },0);
    return result;
};

/* ---------- DEPENSES: audit create/update/delete ---------- */
const ppBaseOpenExpensePP = openExpensePP;
openExpensePP = function(id=null){
    if(!ppCan('expenses','edit')){alert('Accès non autorisé.');return;}
    return ppBaseOpenExpensePP(id);
};

const ppBaseSaveExpensePP = saveExpensePP;
saveExpensePP = function(){
    if(!ppCan('expenses','edit')){alert('Accès non autorisé.');return;}
    const id=Number(document.getElementById('ppExpenseId')?.value||0);
    const before=id?ppAuditSnapshot(expensesPP.find(x=>Number(x.id)===id)):null;
    const beforeIds=new Set(expensesPP.map(x=>String(x.id)));
    const result=ppBaseSaveExpensePP();
    setTimeout(()=>{
        let after=null, entityId=id;
        if(id) after=expensesPP.find(x=>Number(x.id)===id);
        else{
            after=expensesPP.find(x=>!beforeIds.has(String(x.id))) || expensesPP[0] || expensesPP[expensesPP.length-1];
            entityId=after?.id;
        }
        if(after && entityId!=null){
            after.auditCount=ppAuditCount('expenses',entityId)+1;
            ppWriteAudit('expenses',entityId,before?'update':'create',before,after,after.description||after.category||'Dépense');
            try{saveData();}catch(e){}
        }
    },0);
    return result;
};

const ppBaseDeleteExpensePP = deleteExpensePP;
deleteExpensePP = function(id){
    if(!ppCan('expenses','delete')){alert('Accès non autorisé.');return;}
    const before=ppAuditSnapshot(expensesPP.find(x=>Number(x.id)===Number(id)));
    const countBefore=expensesPP.length;
    const result=ppBaseDeleteExpensePP(id);
    setTimeout(()=>{
        if(before && expensesPP.length<countBefore && !expensesPP.some(x=>Number(x.id)===Number(id))){
            ppWriteAudit('expenses',id,'delete',before,null,before.description||before.category||'Dépense');
        }
    },0);
    return result;
};

/* ---------- Add Historique buttons after each render ---------- */
function ppInjectAuditButtons(){
    // Stock movement table: identify edit/delete buttons that carry movement IDs.
    document.querySelectorAll('button[onclick*="openMovementModal("]').forEach(btn=>{
        const oc=btn.getAttribute('onclick')||'';
        const m=oc.match(/openMovementModal\([^,]+,\s*(\d+)\)/);
        if(!m)return;
        const id=m[1],group=btn.closest('.action-buttons')||btn.parentElement;
        if(!group || group.querySelector(`[data-audit-stock="${id}"]`))return;
        const b=document.createElement('button');
        b.type='button';b.className='btn small view';b.dataset.auditStock=id;
        b.innerHTML=`🕘 ${ppAuditCount('stock',id)}`;
        b.title='Historique complet';
        b.onclick=()=>ppAuditMovement(id);
        group.appendChild(b);
    });

    // Expense table.
    document.querySelectorAll('button[onclick^="openExpensePP("]').forEach(btn=>{
        const oc=btn.getAttribute('onclick')||'';
        const m=oc.match(/openExpensePP\((\d+)\)/);
        if(!m)return;
        const id=m[1],group=btn.closest('.action-buttons')||btn.parentElement;
        if(!group || group.querySelector(`[data-audit-expense="${id}"]`))return;
        const b=document.createElement('button');
        b.type='button';b.className='btn small view';b.dataset.auditExpense=id;
        b.innerHTML=`🕘 ${ppAuditCount('expenses',id)}`;
        b.title='Historique complet';
        b.onclick=()=>ppAuditExpense(id);
        group.appendChild(b);
    });
}

const ppAuditObserver=new MutationObserver(()=>ppInjectAuditButtons());
if(document.body) ppAuditObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(ppInjectAuditButtons,500);

/* ---------- Role-aware navigation ---------- */
function ppApplyPermissionsUI(){
    if(ppIsAdmin())return;
    const allowed=['stock','expenses'];
    document.querySelectorAll('[data-page]').forEach(el=>{
        const page=String(el.dataset.page||'').toLowerCase();
        if(page && !allowed.some(x=>page.includes(x))) el.style.display='none';
    });
    // Fallback for sidebar links/buttons without data-page.
    document.querySelectorAll('.sidebar button,.sidebar a,.nav-item').forEach(el=>{
        const t=(el.textContent||'').toLowerCase();
        if(!t)return;
        if(!(t.includes('stock')||t.includes('dépense')||t.includes('depense')||t.includes('déconnexion')||t.includes('logout'))){
            el.style.display='none';
        }
    });
}

/*
  Profiles:
  Admin remains the default for the account that already existed before roles.
  Employee profiles can later be stored as:
  userProfiles/{uid} = {
    role:"employee",
    name:"...",
    permissions:{stock:true,expenses:true}
  }
*/
async function ppLoadUserProfile(){
    const u=ppCurrentFirebaseUser();
    if(!u){ppCurrentUserProfile=null;return;}
    try{
        const snap=await ppDb.collection('userProfiles').doc(u.uid).get();
        if(snap.exists)ppCurrentUserProfile=snap.data();
        else ppCurrentUserProfile={
            role:String(u.email||'').toLowerCase()===PP_ADMIN_EMAIL.toLowerCase()?PP_ACCESS.ADMIN:PP_ACCESS.EMPLOYEE,
            name:u.email,
            active:true,
            permissions:{stock:true,expenses:true}
        };
    }catch(e){
        console.warn('Profil utilisateur:',e);
    }
    ppApplyPermissionsUI();
}
setTimeout(ppLoadUserProfile,700);


/* =========================================================
   GESTION DES UTILISATEURS — ADMIN
   Login visible = username + password; Firebase email is internal.
========================================================= */

function ppEnsureUserManagerButton(){
    if(!ppIsAdmin())return;
    const profile=document.querySelector(".profile");
    if(!profile||document.getElementById("ppManageUsersBtn"))return;
    const btn=document.createElement("button");
    btn.id="ppManageUsersBtn";
    btn.type="button";
    btn.className="btn small";
    btn.textContent="👥 Utilisateurs";
    btn.onclick=ppOpenUsersManager;
    profile.parentNode?.insertBefore(btn,profile);
}

function ppEnsureUsersManagerModal(){
    if(document.getElementById("ppUsersManagerModal"))return;
    const m=document.createElement("div");
    m.id="ppUsersManagerModal";m.className="modal-overlay";
    m.innerHTML=`<div class="modal" style="max-width:1050px">
      <div class="modal-header"><h2>👥 Gestion des utilisateurs</h2><button onclick="closeModal('ppUsersManagerModal')">×</button></div>

      <div style="background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:16px">
        <h3 style="margin:0 0 10px">Créer un employé</h3>
        <div class="form-grid">
          <div><label>Nom affiché</label><input id="ppNewUserName" placeholder="Ex: Ahmed"></div>
          <div><label>Nom d'utilisateur</label><input id="ppNewUsername" placeholder="Ex: ahmed"></div>
          <div><label>Mot de passe initial</label><input id="ppNewUserPassword" type="password" minlength="6" placeholder="Minimum 6 caractères"></div>
          <div><label>Rôle</label><select id="ppNewUserRole"><option value="employee">Employé</option></select></div>
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
          <label><input id="ppPermStock" type="checkbox" checked style="width:auto"> Stock / Entrées / Sorties</label>
          <label><input id="ppPermExpenses" type="checkbox" checked style="width:auto"> Dépenses</label>
        </div>
        <button class="btn primary" type="button" onclick="ppCreateEmployee()" style="margin-top:12px">+ Créer l'utilisateur</button>
        <div id="ppUserManagerMessage" class="pp-cloud-message" style="margin-top:8px"></div>
      </div>

      <h3>Utilisateurs enregistrés</h3>
      <div style="overflow:auto">
        <table style="width:100%;min-width:820px">
          <thead><tr><th>Nom</th><th>Utilisateur</th><th>Rôle</th><th>Stock</th><th>Dépenses</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="ppUsersManagerTable"></tbody>
        </table>
      </div>
      <div class="modal-actions"><button class="btn" onclick="closeModal('ppUsersManagerModal')">Fermer</button></div>
    </div>`;
    document.body.appendChild(m);
}

function ppNormalizeUsername(value){
    return String(value||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"").replace(/^[._-]+|[._-]+$/g,"");
}

async function ppOpenUsersManager(){
    if(!ppIsAdmin()){alert("Réservé à l'administrateur.");return;}
    ppEnsureUsersManagerModal();
    openModal("ppUsersManagerModal");
    await ppRenderUsersManager();
}

async function ppCreateEmployee(){
    if(!ppIsAdmin())return;
    const name=getValue("ppNewUserName").trim();
    const username=ppNormalizeUsername(getValue("ppNewUsername"));
    const password=getValue("ppNewUserPassword");
    const msg=document.getElementById("ppUserManagerMessage");
    if(!name||!username){msg.textContent="Nom et nom d'utilisateur obligatoires.";return;}
    if(username==="admin"||username==="asma"||username==="asmaabd1987-ui"){msg.textContent="Ce nom d'utilisateur est réservé.";return;}
    if(password.length<6){msg.textContent="Le mot de passe doit contenir au moins 6 caractères.";return;}

    const internalEmail=ppUsernameToAuthEmail(username);
    msg.textContent="Création...";
    let secondaryApp=null;
    try{
        // Prevent duplicate usernames at profile level.
        const existing=await ppDb.collection("userProfiles").where("username","==",username).limit(1).get();
        if(!existing.empty){msg.textContent="Ce nom d'utilisateur existe déjà.";return;}

        const appName="ppUserCreator";
        try{secondaryApp=firebase.app(appName);}catch(_){secondaryApp=firebase.initializeApp(PP_FIREBASE_CONFIG,appName);}
        const secondaryAuth=secondaryApp.auth();
        const cred=await secondaryAuth.createUserWithEmailAndPassword(internalEmail,password);
        const uid=cred.user.uid;

        const profile={
            name,
            username,
            email:internalEmail,
            role:"employee",
            active:true,
            permissions:{
                stock:document.getElementById("ppPermStock").checked,
                expenses:document.getElementById("ppPermExpenses").checked
            },
            createdBy:ppCurrentUser?.uid||null,
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
        };
        await ppDb.collection("userProfiles").doc(uid).set(profile);
        await ppDb.collection("users").doc(uid).set({
            email:internalEmail,role:"employee",active:true,username,
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

        await secondaryAuth.signOut();
        setValue("ppNewUserName","");setValue("ppNewUsername","");setValue("ppNewUserPassword","");
        msg.textContent=`✅ Utilisateur "${username}" créé.`;
        await ppRenderUsersManager();
    }catch(err){
        console.error(err);
        if(String(err?.code||"").includes("email-already-in-use"))msg.textContent="Ce nom d'utilisateur existe déjà.";
        else if(String(err?.code||"").includes("weak-password"))msg.textContent="Mot de passe trop faible.";
        else msg.textContent="Erreur: "+(err?.message||err);
    }
}

async function ppRenderUsersManager(){
    const tb=document.getElementById("ppUsersManagerTable");if(!tb||!ppDb)return;
    tb.innerHTML='<tr><td colspan="7">Chargement...</td></tr>';
    try{
        const snap=await ppDb.collection("userProfiles").get();
        const rows=[];
        snap.forEach(d=>rows.push({uid:d.id,...d.data()}));
        rows.sort((a,b)=>String(a.name||a.username||"").localeCompare(String(b.name||b.username||""),"fr"));
        if(!rows.length){tb.innerHTML='<tr><td colspan="7">Aucun utilisateur.</td></tr>';return;}
        tb.innerHTML=rows.map(u=>`
          <tr>
            <td><strong>${escapeHTML(u.name||"-")}</strong></td>
            <td>${escapeHTML(u.username||((u.email||"").toLowerCase()===PP_ADMIN_EMAIL.toLowerCase()?"admin":"-"))}</td>
            <td>${u.role==="admin"?"Admin":"Employé"}</td>
            <td>${u.role==="admin"||u.permissions?.stock!==false?"✅":"—"}</td>
            <td>${u.role==="admin"||u.permissions?.expenses!==false?"✅":"—"}</td>
            <td><span class="status ${u.active===false?"danger":"success"}">${u.active===false?"Désactivé":"Actif"}</span></td>
            <td>${u.role==="admin"?"—":`<button class="btn small ${u.active===false?"primary":"danger"}" onclick="ppToggleEmployee('${u.uid}',${u.active===false})">${u.active===false?"Activer":"Désactiver"}</button>`}</td>
          </tr>`).join("");
    }catch(err){
        console.error(err);tb.innerHTML='<tr><td colspan="7">Erreur de chargement.</td></tr>';
    }
}

async function ppToggleEmployee(uid,activate){
    if(!ppIsAdmin())return;
    await ppDb.collection("userProfiles").doc(uid).set({active:!!activate,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    await ppDb.collection("users").doc(uid).set({active:!!activate},{merge:true});
    await ppWriteAudit("users",uid,activate?"activate":"deactivate",null,{active:!!activate},"Utilisateur");
    await ppRenderUsersManager();
}

setTimeout(ppEnsureUserManagerButton,1200);


/* =========================================================
   ADMINISTRATION SIDEBAR + JOURNAL D'ACTIVITÉ
========================================================= */

function ppRefreshAdminSidebar(){
    const box=document.getElementById("ppAdminSidebar");
    if(!box)return;
    box.style.display=ppIsAdmin() ? "block" : "none";
}

function ppOpenGlobalAudit(){
    if(!ppIsAdmin()){
        alert("Réservé à l'administrateur.");
        return;
    }

    let m=document.getElementById("ppGlobalAuditModal");
    if(!m){
        m=document.createElement("div");
        m.id="ppGlobalAuditModal";
        m.className="modal-overlay";
        m.innerHTML=`
          <div class="modal" style="max-width:1150px">
            <div class="modal-header">
              <h2>🕘 Journal d'activité</h2>
              <button onclick="closeModal('ppGlobalAuditModal')">×</button>
            </div>

            <div class="filters" style="margin-bottom:14px">
              <input id="ppAuditSearch" placeholder="🔍 Utilisateur, opération, produit..." oninput="ppRenderGlobalAudit()">
              <select id="ppAuditModule" onchange="ppRenderGlobalAudit()">
                <option value="">Tous les modules</option>
                <option value="stock">Stock</option>
                <option value="expenses">Dépenses</option>
                <option value="users">Utilisateurs</option>
              </select>
              <select id="ppAuditAction" onchange="ppRenderGlobalAudit()">
                <option value="">Toutes les opérations</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="delete">Suppression</option>
                <option value="activate">Activation</option>
                <option value="deactivate">Désactivation</option>
              </select>
              <input id="ppAuditDate" type="date" onchange="ppRenderGlobalAudit()">
            </div>

            <div id="ppGlobalAuditBody"></div>

            <div class="modal-actions">
              <button class="btn" onclick="closeModal('ppGlobalAuditModal')">Fermer</button>
            </div>
          </div>`;
        document.body.appendChild(m);
    }
    ppRenderGlobalAudit();
    openModal("ppGlobalAuditModal");
}

function ppRenderGlobalAudit(){
    const body=document.getElementById("ppGlobalAuditBody");
    if(!body)return;

    const search=String(document.getElementById("ppAuditSearch")?.value||"").trim().toLowerCase();
    const module=String(document.getElementById("ppAuditModule")?.value||"");
    const action=String(document.getElementById("ppAuditAction")?.value||"");
    const date=String(document.getElementById("ppAuditDate")?.value||"");

    let rows=(Array.isArray(ppAuditTrail)?ppAuditTrail:[]).slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
    rows=rows.filter(x=>{
        if(module && x.module!==module)return false;
        if(action && x.action!==action)return false;
        if(date && String(x.at||"").slice(0,10)!==date)return false;
        if(search){
            const hay=[
                x.label,x.module,x.action,x.entityId,
                x.user?.name,x.user?.email,x.user?.role
            ].join(" ").toLowerCase();
            if(!hay.includes(search))return false;
        }
        return true;
    });

    if(!rows.length){
        body.innerHTML='<div class="empty-state"><div>🕘</div><h3>Aucune opération</h3><p>Aucune activité ne correspond aux filtres.</p></div>';
        return;
    }

    const actionLabel={create:"Création",update:"Modification",delete:"Suppression",activate:"Activation",deactivate:"Désactivation"};
    const moduleLabel={stock:"Stock",expenses:"Dépenses",users:"Utilisateurs"};

    body.innerHTML=`
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date & heure</th>
              <th>Utilisateur</th>
              <th>Module</th>
              <th>Opération</th>
              <th>Élément</th>
              <th>Version</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(x=>`
              <tr>
                <td>${escapeHTML(new Date(x.at).toLocaleString("fr-FR"))}</td>
                <td><strong>${escapeHTML(x.user?.name||x.user?.email||"Utilisateur")}</strong></td>
                <td>${escapeHTML(moduleLabel[x.module]||x.module||"-")}</td>
                <td>${escapeHTML(actionLabel[x.action]||x.action||"-")}</td>
                <td>${escapeHTML(x.label||x.entityId||"-")}</td>
                <td>${Number(x.version||1)}</td>
                <td>
                  ${(x.module==="stock"||x.module==="expenses")
                    ? `<button class="btn small view" type="button" onclick="ppShowAudit('${String(x.module).replace(/'/g,"")}','${String(x.entityId).replace(/'/g,"")}','Historique complet')">👁 Voir</button>`
                    : "—"}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
}

// Refresh after login/profile loading and on startup.
const ppOldApplyPermissionsUI=ppApplyPermissionsUI;
ppApplyPermissionsUI=function(){
    const result=ppOldApplyPermissionsUI.apply(this,arguments);
    ppRefreshAdminSidebar();
    return result;
};

setTimeout(ppRefreshAdminSidebar,1000);


/* =========================================================
   FIX STRICT EMPLOYEE PERMISSIONS
   Employé = Stock + Dépenses uniquement
========================================================= */

// Never assume Admin while the profile is not loaded.
ppIsAdmin = function(){
    if(ppCurrentUserProfile?.role) return ppCurrentUserProfile.role === PP_ACCESS.ADMIN;
    const u=ppCurrentFirebaseUser();
    return !!u && String(u.email||"").toLowerCase() === PP_ADMIN_EMAIL.toLowerCase();
};

function ppPageNameFromElement(el){
    return String(el?.dataset?.page||"").toLowerCase();
}

function ppEmployeeAllowedPages(){
    const perms=ppCurrentUserProfile?.permissions||{};
    const allowed=[];
    if(perms.stock!==false)allowed.push("stock");
    if(perms.expenses!==false)allowed.push("expenses");
    return allowed;
}

ppApplyPermissionsUI = function(){
    const admin=ppIsAdmin();
    const adminBox=document.getElementById("ppAdminSidebar");
    if(adminBox)adminBox.style.display=admin?"block":"none";

    const manageBtn=document.getElementById("ppManageUsersBtn");
    if(manageBtn)manageBtn.style.display=admin?"":"none";

    const allNav=[...document.querySelectorAll(".sidebar [data-page]")];

    if(admin){
        allNav.forEach(el=>el.style.display="");
        document.querySelectorAll(".sidebar .menu-title").forEach(el=>el.style.display="");
        return;
    }

    const allowed=ppEmployeeAllowedPages();

    allNav.forEach(el=>{
        const page=ppPageNameFromElement(el);
        el.style.display=allowed.includes(page)?"":"none";
    });

    // Administration is always hidden for employees.
    if(adminBox)adminBox.style.display="none";

    // Hide section titles that no longer contain a visible menu entry.
    document.querySelectorAll(".sidebar .menu-title").forEach(title=>{
        let next=title.nextElementSibling;
        let hasVisible=false;
        while(next && !next.classList.contains("menu-title")){
            if(next.matches?.("[data-page]") && next.style.display!=="none"){hasVisible=true;break;}
            if(next.id==="ppAdminSidebar" && next.style.display!=="none"){hasVisible=true;break;}
            next=next.nextElementSibling;
        }
        title.style.display=hasVisible?"":"none";
    });

    // Employee must never stay on Dashboard/Purchases/etc after login.
    const active=document.querySelector(".nav-item.active[data-page]");
    const activePage=ppPageNameFromElement(active);
    if(!allowed.includes(activePage)){
        const target=allowed.includes("stock")?"stock":allowed[0];
        if(target){
            const btn=document.querySelector(`.sidebar [data-page="${target}"]`);
            if(btn)btn.click();
        }
    }
};

// Guard sidebar navigation even if a hidden/restricted page is triggered manually.
document.addEventListener("click",function(e){
    const nav=e.target.closest?.("[data-page]");
    if(!nav || ppIsAdmin())return;
    const page=ppPageNameFromElement(nav);
    if(!ppEmployeeAllowedPages().includes(page)){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert("Accès non autorisé.");
    }
},true);

function ppFinalizeRoleUI(){
    ppApplyPermissionsUI();
    if(!ppIsAdmin()){
        const b=document.getElementById("ppManageUsersBtn");
        if(b)b.remove();
    }else{
        try{ppEnsureUserManagerButton();}catch(_){}
    }
}

// Re-run permissions after Firebase actually finishes loading the profile.
const ppOldBootstrapCloudPermissions = ppBootstrapCloud;
ppBootstrapCloud = async function(user){
    await ppOldBootstrapCloudPermissions(user);
    ppFinalizeRoleUI();
};

// Also refresh on delayed UI renders/listeners.
setTimeout(ppFinalizeRoleUI,1500);
setTimeout(ppFinalizeRoleUI,3000);


/* =========================================================
   FIRESTORE STRICT-ROLE SYNC
   Admin: all datasets
   Employee: products + movements + expenses only
========================================================= */

function ppCloudKeysForCurrentUser(){
    if(ppIsAdmin()) return Object.keys(PP_CLOUD_DATASETS);
    const perms=ppCurrentUserProfile?.permissions||{};
    const keys=[];
    if(perms.stock!==false){
        keys.push("products","movements");
    }
    if(perms.expenses!==false){
        keys.push("expenses");
    }
    return [...new Set(keys)];
}

ppLoadAllCloud = async function(){
    ppApplyingCloudState=true;
    try{
        const keys=ppCloudKeysForCurrentUser();
        for(const key of keys){
            const snap=await ppDataDoc(key).get();
            if(snap.exists)ppSetDataset(key,snap.data()?.items||[]);
        }

        // Employees must not retain sensitive cached datasets from a prior Admin session
        // on the same browser/computer.
        if(!ppIsAdmin()){
            const allowed=new Set(keys);
            Object.keys(PP_CLOUD_DATASETS).forEach(key=>{
                if(!allowed.has(key)) ppSetDataset(key,[]);
            });
        }

        ppSaveLocalOnly();
    }finally{
        ppApplyingCloudState=false;
    }
};

ppStartCloudListeners = function(){
    ppStopCloudListeners();
    ppCloudKeysForCurrentUser().forEach(key=>{
        const unsub=ppDataDoc(key).onSnapshot(snap=>{
            if(!ppCloudReady||ppCloudSaving||!snap.exists)return;
            const remote=snap.data()?.items;
            if(!Array.isArray(remote))return;
            ppApplyingCloudState=true;
            try{
                ppSetDataset(key,remote);
                ppSaveLocalOnly();
                renderAll();
                ppFinalizeRoleUI?.();
            }finally{
                ppApplyingCloudState=false;
            }
        },err=>console.error("Firestore listener",key,err));
        ppCloudListeners.push(unsub);
    });
};

ppSaveCloudNow = async function(){
    if(!ppCloudReady||!ppCurrentUser||ppApplyingCloudState||ppCloudSaving)return;
    ppCloudSaving=true;
    const status=document.getElementById("ppCloudStatus");
    if(status)status.textContent="☁️ Synchronisation...";
    try{
        const state=ppStateSnapshot();
        const allowedKeys=ppCloudKeysForCurrentUser();
        const batch=ppDb.batch();

        allowedKeys.forEach(key=>{
            batch.set(ppDataDoc(key),{
                items:Array.isArray(state[key])?state[key]:[],
                updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy:ppCurrentUser.uid
            });
        });

        await batch.commit();
        if(status)status.textContent="✅ Synchronisé";
    }catch(err){
        console.error("Cloud save failed",err);
        if(status)status.textContent="⚠️ Synchronisation refusée";
        alert("La synchronisation Cloud a été refusée. Vérifiez les permissions de l'utilisateur.");
    }finally{
        ppCloudSaving=false;
    }
};

// Employee should not initialize/migrate the entire company database.
ppCloudHasData = async function(){
    if(ppIsAdmin()){
        const meta=await ppMetaDoc().get();
        if(meta.exists&&meta.data()?.initialized)return true;
    }
    const productDoc=await ppDataDoc("products").get();
    return productDoc.exists;
};



/* FIX EMPLOYEE IDENTITY + CLOUD AUDIT */
async function ppRefreshEmployeeIdentity(){
    const u=ppCurrentFirebaseUser();
    if(!u || !ppDb)return;
    try{
        const snap=await ppDb.collection("userProfiles").doc(u.uid).get();
        if(snap.exists){
            const p=snap.data()||{};
            ppCurrentUserProfile={...ppCurrentUserProfile,...p,
                role:p.role||ppCurrentRole||"employee",
                permissions:p.permissions||ppCurrentUserProfile?.permissions||{stock:true,expenses:true}};
            ppCurrentRole=ppCurrentUserProfile.role;
            const userText=document.getElementById("ppCloudUser");
            if(userText)userText.textContent=(p.name||p.username||"Utilisateur")+" — "+ppCurrentRole;
        }
    }catch(err){console.warn("Employee profile display:",err);}
}

ppUserIdentity=function(){
    const u=ppCurrentFirebaseUser(), p=ppCurrentUserProfile||{};
    return {
        uid:u?.uid||"local",
        email:u?.email||"",
        name:p.name||p.username||"Utilisateur",
        username:p.username||"",
        role:p.role||ppCurrentRole||"employee"
    };
};

ppWriteAudit=async function(module,entityId,action,before,after,label=""){
    const who=ppUserIdentity();
    const previous=ppAuditTrail.filter(x=>x.module===module && String(x.entityId)===String(entityId));
    const entry={
        id:Date.now()+Math.floor(Math.random()*100000),
        module, entityId:String(entityId), label:String(label||""), action,
        version:previous.length+1, user:who, at:new Date().toISOString(),
        before:ppAuditSnapshot(before), after:ppAuditSnapshot(after),
        changes:ppAuditDiff(before,after)
    };
    ppAuditTrail.push(entry);
    localStorage.setItem("pause_plate_audit_trail",JSON.stringify(ppAuditTrail));
    try{
        if(ppDb && who.uid!=="local") await ppDb.collection("auditLogs").add(entry);
    }catch(err){console.warn("Audit Cloud non synchronisé:",err);}
    return entry;
};

async function ppLoadCloudAuditForAdmin(){
    if(!ppIsAdmin() || !ppDb)return;
    try{
        const snap=await ppDb.collection("auditLogs").orderBy("at","desc").limit(1000).get();
        const cloud=[]; snap.forEach(d=>cloud.push(d.data()));
        const map=new Map();
        [...ppAuditTrail,...cloud].forEach(x=>{
            const key=String(x.id||"")+"|"+String(x.user?.uid||"")+"|"+String(x.at||"");
            map.set(key,x);
        });
        ppAuditTrail=[...map.values()];
        localStorage.setItem("pause_plate_audit_trail",JSON.stringify(ppAuditTrail));
    }catch(err){console.warn("Chargement Audit Cloud:",err);}
}

const ppOldOpenGlobalAuditIdentity=ppOpenGlobalAudit;
ppOpenGlobalAudit=async function(){
    await ppLoadCloudAuditForAdmin();
    return ppOldOpenGlobalAuditIdentity.apply(this,arguments);
};

const ppIdentityOldBootstrap=ppBootstrapCloud;
ppBootstrapCloud=async function(user){
    await ppIdentityOldBootstrap(user);
    await ppRefreshEmployeeIdentity();
    if(typeof ppFinalizeRoleUI==="function")ppFinalizeRoleUI();
};

setTimeout(ppRefreshEmployeeIdentity,1200);
setTimeout(ppRefreshEmployeeIdentity,3000);
