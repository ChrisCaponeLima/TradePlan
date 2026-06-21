let db;
const request = indexedDB.open("DispensaInteligenteDB", 1);

request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("itens")) db.createObjectStore("itens", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("locais")) db.createObjectStore("locais", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("categorias")) db.createObjectStore("categorias", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("receitas")) db.createObjectStore("receitas", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("dieta")) db.createObjectStore("dieta", { keyPath: "id" }); // id format: 'dia-refeicao'
    if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "chave" });
};

request.onsuccess = function(e) {
    db = e.target.result;
    inicializarMódulos();
};

function inicializarMódulos() {
    processarConsumosDiarios().then(() => {
        carregarFiltrosEConfiguracoes();
        renderizarPainelGeral();
    });
}

// --- NAVEGAÇÃO SPA ---
function mudarAba(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active');
    
    const titulos = { painel: 'Dashboard', estoque: 'Dispensa', receitas: 'Receitas', dieta: 'Dieta Semanal', compras: 'Lista de Compras', config: 'Ajustes' };
    document.getElementById('header-titulo').innerText = titulos[tabId];

    if (tabId === 'painel') renderizarPainelGeral();
    if (tabId === 'estoque') listarEstoque();
    if (tabId === 'receitas') listarReceitas();
    if (tabId === 'dieta') renderizarGradeDieta();
    if (tabId === 'compras') gerarListaCompras();
}

// --- ENGINE: CONSUMOS AUTOMÁTICOS RETROATIVOS ---
async function processarConsumosDiarios() {
    return new Promise((resolve) => {
        const tx = db.transaction(["itens", "meta"], "readwrite");
        const storeItens = tx.objectStore("itens");
        const storeMeta = tx.objectStore("meta");

        storeMeta.get("ultimo_acesso").onsuccess = function(e) {
            const registro = e.target.result;
            const hoje = new Date().setHours(0,0,0,0);
            let diasPassados = 0;

            if (registro) {
                const ultimoAcesso = new Date(registro.valor).setHours(0,0,0,0);
                diasPassados = Math.floor((hoje - ultimoAcesso) / (1000 * 60 * 60 * 24));
            }
            storeMeta.put({ chave: "ultimo_acesso", valor: hoje });

            storeItens.getAll().onsuccess = function(ev) {
                const itens = ev.target.result;
                if (diasPassados > 0) {
                    itens.forEach(item => {
                        if (item.autoConsumo && item.gastoDiario > 0) {
                            item.qtd = Math.max(0, item.qtd - (diasPassados * item.gastoDiario));
                            storeItens.put(item);
                        }
                    });
                }
                tx.oncomplete = () => resolve();
            };
        };
    });
}

// --- RENDERIZADORES DAS TELAS ---
function renderizarPainelGeral() {
    db.transaction("itens", "readonly").objectStore("itens").getAll().onsuccess = function(e) {
        const itens = e.target.result;
        const containerAuto = document.getElementById("container-auto-consumo");
        const containerMins = document.getElementById("lista-alertas-minimos");
        containerAuto.innerHTML = ""; containerMins.innerHTML = "";

        const autos = itens.filter(i => i.autoConsumo);
        const baixos = itens.filter(i => i.qtd <= i.minimo);

        if(!autos.length) containerAuto.innerHTML = `<p class="card-alerta ok">Nenhum consumo automático configurado.</p>`;
        autos.forEach(item => {
            const dias = item.gastoDiario > 0 ? Math.floor(item.qtd / item.gastoDiario) : 0;
            const dataFim = new Date(); dataFim.setDate(dataFim.getDate() + dias);
            let classeCor = dias < 4 ? 'warning' : 'ok';
            if(dias <= 1) classeCor = 'warning';

            let descExtra = "";
            if (item.unidade === 'g' && item.nome.toLowerCase().includes("ração")) {
                descExtra = ` (~${(item.qtd / 85).toFixed(1)} sachês)`;
            }

            let alertaCompra = "";
            if (item.dataCompra) {
                const dc = new Date(item.dataCompra + 'T00:00:00');
                if (dc > dataFim) alertaCompra = `<br><span style="color:#ff453a;font-weight:bold;">🔴 Acaba antes da entrega agendada (${dc.toLocaleDateString('pt-BR')})!</span>`;
                else alertaCompra = `<br><span style="color:#30d158;">📅 Entrega programada: ${dc.toLocaleDateString('pt-BR')}</span>`;
            }

            containerAuto.innerHTML += `
                <div class="card-alerta ${classeCor}">
                    <strong>${item.nome}</strong>: ${item.qtd.toFixed(1)}${item.unidade}${descExtra}<br>
                    ⏱️ Autonomia: <b>${dias} dias</b> (Esgota em: ${dataFim.toLocaleDateString('pt-BR')}) ${alertaCompra}
                </div>`;
        });

        if(!baixos.length) containerMins.innerHTML = `<p style="color:#30d158;font-weight:600;">🎉 Todos os estoques da casa normais!</p>`;
        baixos.forEach(item => {
            containerMins.innerHTML += `
                <div class="item-row" style="border-left:4px solid #ff453a">
                    <div class="item-info"><div class="nome">${item.nome}</div><div class="detalhes">${item.local}</div></div>
                    <div class="qtd-display" style="color:#ff453a">${item.qtd.toFixed(1)} ${item.unidade}</div>
                </div>`;
        });
    };
}

function listarEstoque() {
    const fL = document.getElementById("filtro-local").value;
    const fC = document.getElementById("filtro-categoria").value;
    const container = document.getElementById("lista-estoque");
    container.innerHTML = "";

    db.transaction("itens", "readonly").objectStore("itens").getAll().onsuccess = function(e) {
        e.target.result.forEach(item => {
            if (fL && item.local !== fL) return;
            if (fC && item.categoria !== fC) return;
            container.innerHTML += `
                <div class="item-row">
                    <div class="item-info" onclick="editarItem(${item.id})">
                        <div class="nome">${item.nome}</div>
                        <div class="detalhes">${item.categoria} • ${item.local}</div>
                    </div>
                    <div class="item-acoes">
                        <div class="qtd-display">${item.qtd.toFixed(1)}<span style="font-size:0.75rem">${item.unidade}</span></div>
                        <button class="btn-primary" style="padding:6px 12px; font-size:0.85rem;" onclick="darBaixaManual(${item.id},'${item.unidade}')">Baixar</button>
                    </div>
                </div>`;
        });
    };
}

function darBaixaManual(id, unidade) {
    let valor = prompt(`Retirar quanto (${unidade})?`);
    if(!valor || isNaN(valor)) return;
    const tx = db.transaction("itens", "readwrite");
    const store = tx.objectStore("itens");
    store.get(id).onsuccess = function(e) {
        const item = e.target.result;
        item.qtd = Math.max(0, item.qtd - parseFloat(valor));
        store.put(item);
        tx.oncomplete = () => listarEstoque();
    };
}

// --- ENGINE: ABA RECEITAS & DISPONIBILIDADE AUTOMÁTICA ---
function listarReceitas() {
    const container = document.getElementById("lista-receitas");
    container.innerHTML = "";

    const tx = db.transaction(["receitas", "itens"], "readonly");
    tx.objectStore("itens").getAll().onsuccess = function(evt) {
        const estoqueMap = {};
        evt.target.result.forEach(i => estoqueMap[i.nome.toLowerCase()] = i.qtd);

        tx.objectStore("receitas").getAll().onsuccess = function(e) {
            e.target.result.forEach(rec => {
                let status = "🟢 Completa";
                let corStatus = "#30d158";
                let detalhesIngs = [];

                rec.ingredientes.forEach(ing => {
                    const estQtd = estoqueMap[ing.nome.toLowerCase()] || 0;
                    detalhesIngs.push(`${ing.qtd}${ing.unidade} de ${ing.nome}`);
                    if(estQtd <= 0) { status = "🔴 Indisponível"; corStatus = "#ff453a"; }
                    else if(estQtd < ing.qtd && status !== "🔴 Indisponível") { status = "🟡 Parcial"; corStatus = "#ffd60a"; }
                });

                container.innerHTML += `
                    <div class="item-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
                        <div style="display:flex; justify-content:space-between; width:100%;">
                            <strong style="font-size:1.1rem">${rec.nome}</strong>
                            <span style="color:${corStatus}; font-weight:bold; font-size:0.85rem;">${status}</span>
                        </div>
                        <div class="item-info"><div class="detalhes">${detalhesIngs.join(", ")}</div></div>
                        <div style="display:flex; gap:10px; margin-top:4px; width:100%; justify-content:flex-end;">
                            <button class="btn-danger-xs" onclick="deletarReceita(${rec.id})">Remover</button>
                            <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="prepararReceita(${rec.id})">Preparar (Dar Baixa)</button>
                        </div>
                    </div>`;
            });
        };
    };
}

function prepararReceita(id) {
    const tx = db.transaction(["receitas", "itens"], "readwrite");
    tx.objectStore("receitas").get(id).onsuccess = function(e) {
        const receita = e.target.result;
        tx.objectStore("itens").getAll().onsuccess = function(ev) {
            const itens = ev.target.result;
            receita.ingredientes.forEach(ing => {
                const match = itens.find(i => i.nome.toLowerCase() === ing.nome.toLowerCase());
                if(match) match.qtd = Math.max(0, match.qtd - ing.qtd);
            });
            itens.forEach(i => tx.objectStore("itens").put(i));
            tx.oncomplete = () => { alert("Baixa da receita aplicada com sucesso!"); listarReceitas(); };
        };
    };
}

// --- ENGINE: DIETA DIÁRIA GRADE SEMANAL (OPÇÃO B) ---
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const REFEICOES = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];

function renderizarGradeDieta() {
    const container = document.getElementById("grade-dieta");
    container.innerHTML = "";

    const tx = db.transaction("dieta", "readonly");
    tx.objectStore("dieta").getAll().onsuccess = function(e) {
        const v_dieta = e.target.result;
        const mapaDieta = {};
        v_dieta.forEach(v => mapaDieta[v.id] = v.nome);

        DIAS_SEMANA.forEach(dia => {
            let htmlDia = `<div class="dia-card"><div class="dia-titulo">${dia}</div>`;
            REFEICOES.forEach(ref => {
                const chave = `${dia}-${ref}`;
                const vinculo = mapaDieta[chave] || `<button class="btn-add-refeicao" onclick="abrirModalVinculo('${dia}','${ref}')">+ Adicionar Receita</button>`;
                const botaoLixo = mapaDieta[chave] ? `<button class="btn-danger-xs" onclick="removerVinculoDieta('${chave}')">✕</button>` : '';
                
                htmlDia += `
                    <div class="refeicao-row">
                        <div class="refeicao-nome">${ref}</div>
                        <div class="refeicao-conteudo"><b>${vinculo}</b></div>
                        ${botaoLixo}
                    </div>`;
            });
            htmlDia += `</div>`;
            container.innerHTML += htmlDia;
        });
    };
}

// --- ENGINE: MOTOR PREDITIVO DE COMPRAS EXTRAORDINÁRIO ---
let itensParaAbastecerEmMemoria = [];

function gerarListaCompras() {
    const diasPlanejados = parseInt(document.getElementById("dias-previsao").value || 7);
    const container = document.getElementById("lista-compras");
    container.innerHTML = "Calculando demandas do período...";
    document.getElementById("row-finalizar-compra").style.display = "none";
    itensParaAbastecerEmMemoria = [];

    const tx = db.transaction(["itens", "dieta", "receitas"], "readonly");
    
    tx.objectStore("itens").getAll().onsuccess = function(e_itens) {
        const todosItens = e_itens.target.result;
        
        tx.objectStore("receitas").getAll().onsuccess = function(e_recs) {
            const todasRecs = e_recs.target.result;
            
            tx.objectStore("dieta").getAll().onsuccess = function(e_dieta) {
                const dietaCadastrada = e_dieta.target.result;

                // 1. Mapeamento de consumo da dieta diária
                const demandasPorDiaSemana = {}; 
                DIAS_SEMANA.forEach(d => demandasPorDiaSemana[d] = []);

                dietaCadastrada.forEach(d => {
                    const [diaSemana, _] = d.id.split("-");
                    const receitaCorreta = todasRecs.find(r => r.nome === d.nome);
                    if (receitaCorreta) {
                        receitaCorreta.ingredientes.forEach(ing => {
                            demandasPorDiaSemana[diaSemana].push({ nome: ing.nome.toLowerCase(), qtd: ing.qtd });
                        });
                    }
                });

                // 2. Projeção de Demanda Baseada em Dias Configuráveis
                const mapaDemandasTotais = {};
                const hoje = new Date();

                for (let i = 0; i < diasPlanejados; i++) {
                    const dataAnalise = new Date(hoje);
                    dataAnalise.setDate(hoje.getDate() + i);
                    const labelDia = DIAS_SEMANA[dataAnalise.getDay() === 0 ? 6 : dataAnalise.getDay() - 1];

                    // Soma receitas da dieta planejadas para aquele dia da semana
                    demandasPorDiaSemana[labelDia].forEach(ing => {
                        mapaDemandasTotais[ing.nome] = (mapaDemandasTotais[ing.nome] || 0) + ing.qtd;
                    });

                    // Soma os itens de Consumo Automático Fixo Fixo (ex: Gata)
                    todosItens.forEach(item => {
                        if (item.autoConsumo && item.gastoDiario > 0) {
                            mapaDemandasTotais[item.nome.toLowerCase()] = (mapaDemandasTotais[item.nome.toLowerCase()] || 0) + item.gastoDiario;
                        }
                    });
                }

                // 3. Montagem Cruzada e Geração do Checklist Final
                container.innerHTML = "";
                let temItens = false;

                todosItens.forEach(item => {
                    const nomeChave = item.nome.toLowerCase();
                    const demandaNecessaria = mapaDemandasTotais[nomeChave] || 0;
                    
                    // Condição de compra: Estoque Futuro menor que o Mínimo de Segurança configurado
                    const estoqueFuturoPreditivo = item.qtd - demandaNecessaria;

                    if (estoqueFuturoPreditivo <= item.minimo || item.qtd <= item.minimo) {
                        temItens = true;
                        // Cálculo da compra: Garantir que cubra a demanda e devolva ao estoque mínimo estável
                        const comprarQuanto = (demandaNecessaria + item.minimo) - item.qtd;
                        const valorSugerido = comprarQuanto > 0 ? comprarQuanto : (item.minimo - item.qtd);

                        container.innerHTML += `
                            <div class="item-row" style="border-left: 4px solid #ffd60a;">
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <input type="checkbox" class="checkbox-compra" data-id="${item.id}" data-qtd="${valorSugerido.toFixed(2)}" onchange="verificarCheckboxesCompra()">
                                    <div class="item-info">
                                        <div class="nome">${item.nome}</div>
                                        <div class="detalhes">Estoque Atual: ${item.qtd.toFixed(1)}${item.unidade} | Consumo no Período: ${demandaNecessaria.toFixed(1)}${item.unidade}</div>
                                    </div>
                                </div>
                                <div class="qtd-display" style="color:#ffd60a">+${valorSugerido.toFixed(1)}<span style="font-size:0.75rem">${item.unidade}</span></div>
                            </div>`;
                    }
                });

                if(!temItens) container.innerHTML = `<p style="color:#30d158; font-weight:bold;">🎉 Dispensa perfeitamente abastecida para os próximos ${diasPlanejados} dias!</p>`;
            };
        };
    };
}

function verificarCheckboxesCompra() {
    const list = document.querySelectorAll('.checkbox-compra:checked');
    document.getElementById("row-finalizar-compra").style.display = list.length > 0 ? "flex" : "none";
}

function finalizarCompra() {
    const checkboxes = document.querySelectorAll('.checkbox-compra:checked');
    const tx = db.transaction("itens", "readwrite");
    const store = tx.objectStore("itens");

    let promessas = Array.from(checkboxes).map(cb => {
        return new Promise((resolve) => {
            const id = parseInt(cb.getAttribute('data-id'));
            const qtdAdicionar = parseFloat(cb.getAttribute('data-qtd'));
            store.get(id).onsuccess = function(e) {
                const item = e.target.result;
                item.qtd += qtdAdicionar;
                store.put(item);
                resolve();
            };
        });
    });

    Promise.all(promessas).then(() => {
        tx.oncomplete = () => {
            alert("Dispensa atualizada com os itens comprados!");
            gerarListaCompras();
        };
    });
}

// --- LOGICA DE CRUD AUXILIAR & JANELAS MODAIS ---
let contadorIngredientes = 0;
function abrirModalReceita() {
    document.getElementById("receita-id").value = "";
    document.getElementById("receita-nome").value = "";
    document.getElementById("ingredientes-dinamicos").innerHTML = "";
    contadorIngredientes = 0;
    adicionarLinhaIngrediente();
    document.getElementById("modal-receita").classList.add("open");
}
function fecharModalReceita() { document.getElementById("modal-receita").classList.remove("open"); }

function adicionarLinhaIngrediente() {
    const div = document.getElementById("ingredientes-dinamicos");
    const row = document.createElement("div");
    row.className = "form-row";
    row.style.marginBottom = "8px";
    row.id = `ing-row-${contadorIngredientes}`;
    row.innerHTML = `
        <input type="text" placeholder="Nome ingrediente" class="ing-nome" required>
        <input type="number" placeholder="Qtd" class="ing-qtd" style="width:70px;" required>
        <select class="ing-uni" style="width:75px;"><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select>
        <button class="btn-danger-xs" style="padding:12px 10px;" onclick="document.getElementById('ing-row-${contadorIngredientes}').remove()">✕</button>
    `;
    div.appendChild(row);
    contadorIngredientes++;
}

function salvarReceita() {
    const nome = document.getElementById("receita-nome").value.trim();
    if(!nome) return;
    const ingreds = [];
    document.querySelectorAll("#ingredientes-dinamicos .form-row").forEach(row => {
        const n = row.querySelector(".ing-nome").value;
        const q = parseFloat(row.querySelector(".ing-qtd").value);
        const u = row.querySelector(".ing-uni").value;
        if(n && q) ingreds.push({ nome: n, qtd: q, unidade: u });
    });

    const tx = db.transaction("receitas", "readwrite");
    tx.objectStore("receitas").put({ nome, ingredientes: ingreds });
    tx.oncomplete = () => { fecharModalReceita(); listarReceitas(); };
}

function deletarReceita(id) {
    if(confirm("Deseja apagar essa receita?")) {
        const tx = db.transaction("receitas", "readwrite");
        tx.objectStore("receitas").delete(id);
        tx.oncomplete = () => listarReceitas();
    }
}

function abrirModalVinculo(dia, ref) {
    document.getElementById("vinculo-dia").value = dia;
    document.getElementById("vinculo-refeicao").value = ref;
    const select = document.getElementById("vinculo-receita-select");
    select.innerHTML = "";

    db.transaction("receitas", "readonly").objectStore("receitas").getAll().onsuccess = function(e) {
        e.target.result.forEach(r => select.innerHTML += `<option value="${r.nome}">${r.nome}</option>`);
        document.getElementById("modal-vinculo-dieta").classList.add("open");
    };
}
function fecharModalVinculo() { document.getElementById("modal-vinculo-dieta").classList.remove("open"); }

function salvarVinculoDieta() {
    const dia = document.getElementById("vinculo-dia").value;
    const ref = document.getElementById("vinculo-refeicao").value;
    const nome = document.getElementById("vinculo-receita-select").value;
    const id = `${dia}-${ref}`;

    const tx = db.transaction("dieta", "readwrite");
    tx.objectStore("dieta").put({ id, nome });
    tx.oncomplete = () => { fecharModalVinculo(); renderizarGradeDieta(); };
}

function removerVinculoDieta(chave) {
    const tx = db.transaction("dieta", "readwrite");
    tx.objectStore("dieta").delete(chave);
    tx.oncomplete = () => renderizarGradeDieta();
}

// --- OPERAÇÕES CRUD DE ITENS BASE DA DISPENSA ---
function abrirModalItem() {
    document.getElementById("modal-item-titulo").innerText = "Novo Item";
    document.getElementById("item-id").value = "";
    document.getElementById("item-nome").value = "";
    document.getElementById("item-qtd").value = "";
    document.getElementById("item-minimo").value = "0";
    document.getElementById("item-auto-consumo").checked = false;
    document.getElementById("item-gasto-diario").value = "";
    document.getElementById("item-data-compra").value = "";
    toggleFormConsumo();
    document.getElementById("modal-item").classList.add("open");
}
function fecharModalItem() { document.getElementById("modal-item").classList.remove("open"); }
function toggleFormConsumo() {
    const c = document.getElementById("item-auto-consumo").checked;
    document.getElementById("form-auto-consumo-dados").style.display = c ? "block" : "none";
}

function salvarItem() {
    const id = document.getElementById("item-id").value;
    const item = {
        nome: document.getElementById("item-nome").value.trim(),
        qtd: parseFloat(document.getElementById("item-qtd").value || 0),
        unidade: document.getElementById("item-unidade").value,
        local: document.getElementById("item-local").value,
        categoria: document.getElementById("item-categoria").value,
        minimo: parseFloat(document.getElementById("item-minimo").value || 0),
        autoConsumo: document.getElementById("item-auto-consumo").checked,
        gastoDiario: parseFloat(document.getElementById("item-gasto-diario").value || 0),
        dataCompra: document.getElementById("item-data-compra").value
    };
    if(!item.nome) return;
    if(id) item.id = parseInt(id);

    const tx = db.transaction("itens", "readwrite");
    tx.objectStore("itens").put(item);
    tx.oncomplete = () => { fecharModalItem(); listarEstoque(); };
}

function editarItem(id) {
    db.transaction("itens", "readonly").objectStore("itens").get(id).onsuccess = function(e) {
        const item = e.target.result;
        abrirModalItem();
        document.getElementById("modal-item-titulo").innerText = "Editar Item";
        document.getElementById("item-id").value = item.id;
        document.getElementById("item-nome").value = item.nome;
        document.getElementById("item-qtd").value = item.qtd;
        document.getElementById("item-unidade").value = item.unidade;
        document.getElementById("item-local").value = item.local;
        document.getElementById("item-categoria").value = item.categoria;
        document.getElementById("item-minimo").value = item.minimo;
        document.getElementById("item-auto-consumo").checked = item.autoConsumo;
        document.getElementById("item-gasto-diario").value = item.gastoDiario;
        document.getElementById("item-data-compra").value = item.dataCompra;
        toggleFormConsumo();
    };
}

// --- CONFIGURAÇÕES DE BADGES DE AUXÍLIO ---
function carregarFiltrosEConfiguracoes() {
    const renderLista = (storeName, selectId, listId) => {
        db.transaction(storeName, "readonly").objectStore(storeName).getAll().onsuccess = function(e) {
            const data = e.target.result;
            const select = document.getElementById(selectId);
            const list = document.getElementById(listId);
            const filter = document.getElementById(`filtro-${storeName.slice(0, -1)}`);
            
            if(filter) filter.innerHTML = `<option value="">Todos</option>`;
            select.innerHTML = ""; list.innerHTML = "";
            
            data.forEach(d => {
                select.innerHTML += `<option value="${d.nome}">${d.nome}</option>`;
                list.innerHTML += `<li>${d.nome}</li>`;
                if(filter) filter.innerHTML += `<option value="${d.nome}">${d.nome}</option>`;
            });
        };
    };
    renderLista("locais", "item-local", "lista-locais");
    renderLista("categorias", "item-categoria", "lista-categorias");
}

function salvarLocal() {
    const nome = document.getElementById("novo-local").value.trim(); if(!nome) return;
    const tx = db.transaction("locais", "readwrite"); tx.objectStore("locais").add({ nome });
    tx.oncomplete = () => { document.getElementById("novo-local").value = ""; carregarFiltrosEConfiguracoes(); };
}
function salvarCategoria() {
    const nome = document.getElementById("nova-categoria").value.trim(); if(!nome) return;
    const tx = db.transaction("categorias", "readwrite"); tx.objectStore("categorias").add({ nome });
    tx.oncomplete = () => { document.getElementById("nova-categoria").value = ""; carregarFiltrosEConfiguracoes(); };
}

// --- BACKUP E RECOVERY MANUAL ---
function exportarBackup() {
    const backup = {}; const stores = ["itens", "locais", "categorias", "receitas", "dieta"]; let cont = 0;
    stores.forEach(s => {
        db.transaction(s, "readonly").objectStore(s).getAll().onsuccess = function(e) {
            backup[s] = e.target.result; cont++;
            if(cont === stores.length) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
                const dl = document.createElement('a'); dl.setAttribute("href", dataStr);
                dl.setAttribute("download", `backup_dispensa_${new Date().toISOString().slice(0,10)}.json`); dl.click();
            }
        };
    });
}

function importarBackup(event) {
    const fReader = new FileReader();
    fReader.onload = function(e) {
        const d = JSON.parse(e.target.result);
        const tx = db.transaction(["itens", "locais", "categorias", "receitas", "dieta"], "readwrite");
        if(d.itens) { tx.objectStore("itens").clear(); d.itens.forEach(i => { delete i.id; tx.objectStore("itens").add(i); }); }
        if(d.locais) { tx.objectStore("locais").clear(); d.locais.forEach(l => { delete l.id; tx.objectStore("locais").add(l); }); }
        if(d.categorias) { tx.objectStore("categorias").clear(); d.categorias.forEach(c => { delete c.id; tx.objectStore("categorias").add(c); }); }
        if(d.receitas) { tx.objectStore("receitas").clear(); d.receitas.forEach(r => { delete r.id; tx.objectStore("receitas").add(r); }); }
        if(d.dieta) { tx.objectStore("dieta").clear(); d.dieta.forEach(dt => tx.objectStore("dieta").add(dt)); }
        tx.oncomplete = () => { alert("Backup processado e injetado!"); window.location.reload(); };
    };
    fReader.readAsText(event.target.files[0]);
}

// --- SW REGISTRATION ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('swdispensa.js').then(() => console.log('SW Dispensa Online'));
}