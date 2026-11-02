// Categorias padrao (RF-040) + base de palavras-chave usada pelo motor de
// classificacao (camada 3 do RF-041). Cada subcategoria tem um slug estavel.

export type CatDef = { slug: string; name: string; icon: string; color: string; kind: "INCOME" | "EXPENSE"; subs?: { slug: string; name: string; keywords: string[] }[]; keywords?: string[] };

export const DEFAULT_CATEGORIES: CatDef[] = [
  { slug: "moradia", name: "Moradia", icon: "🏠", color: "#0B4F3A", kind: "EXPENSE", subs: [
    { slug: "moradia.aluguel", name: "Aluguel", keywords: ["aluguel", "condominio", "condomínio", "iptu"] },
    { slug: "moradia.contas", name: "Luz, água e gás", keywords: ["luz", "energia", "enel", "cemig", "light", "copel", "agua", "água", "sabesp", "gas", "gás", "comgas"] },
    { slug: "moradia.internet", name: "Internet e telefone", keywords: ["internet", "vivo", "claro", "tim", "oi ", "net ", "telefone", "celular"] },
    { slug: "moradia.manutencao", name: "Manutenção", keywords: ["reforma", "pedreiro", "eletricista", "encanador", "leroy", "telhanorte"] },
  ]},
  { slug: "alimentacao", name: "Alimentação", icon: "🍽️", color: "#19C37D", kind: "EXPENSE", subs: [
    { slug: "alimentacao.mercado", name: "Mercado", keywords: ["mercado", "supermercado", "carrefour", "assai", "assaí", "atacadao", "atacadão", "pao de acucar", "pão de açúcar", "extra", "dia ", "sacolao", "hortifruti", "feira"] },
    { slug: "alimentacao.delivery", name: "Delivery", keywords: ["ifood", "rappi", "delivery", "uber eats", "ze delivery", "zé delivery", "aiqfome"] },
    { slug: "alimentacao.restaurante", name: "Restaurantes e lanches", keywords: ["restaurante", "lanche", "lanchonete", "almoco", "almoço", "jantar", "pizza", "hamburguer", "mcdonald", "burger king", "bk ", "subway", "bar ", "cafe", "café", "starbucks"] },
    { slug: "alimentacao.padaria", name: "Padaria", keywords: ["padaria", "pao", "pão", "panificadora"] },
  ]},
  { slug: "transporte", name: "Transporte", icon: "🚗", color: "#3B82F6", kind: "EXPENSE", subs: [
    { slug: "transporte.combustivel", name: "Combustível", keywords: ["gasolina", "etanol", "alcool", "álcool", "diesel", "combustivel", "combustível", "posto", "shell", "ipiranga", "petrobras", "br mania"] },
    { slug: "transporte.app", name: "Apps de transporte", keywords: ["uber", "99", "99pop", "cabify", "taxi", "táxi"] },
    { slug: "transporte.publico", name: "Transporte público", keywords: ["onibus", "ônibus", "metro", "metrô", "trem", "bilhete unico", "passagem"] },
    { slug: "transporte.carro", name: "Carro", keywords: ["estacionamento", "pedagio", "pedágio", "sem parar", "oficina", "mecanico", "mecânico", "ipva", "seguro auto", "lava rapido", "lava jato"] },
  ]},
  { slug: "saude", name: "Saúde", icon: "💊", color: "#E5484D", kind: "EXPENSE", subs: [
    { slug: "saude.farmacia", name: "Farmácia", keywords: ["farmacia", "farmácia", "drogaria", "droga raia", "drogasil", "pague menos", "remedio", "remédio"] },
    { slug: "saude.plano", name: "Plano de saúde", keywords: ["plano de saude", "plano de saúde", "unimed", "amil", "bradesco saude", "sulamerica", "hapvida"] },
    { slug: "saude.consultas", name: "Consultas e exames", keywords: ["consulta", "medico", "médico", "dentista", "exame", "laboratorio", "laboratório", "psicologo", "psicólogo"] },
  ]},
  { slug: "educacao", name: "Educação", icon: "📚", color: "#8B5CF6", kind: "EXPENSE", subs: [
    { slug: "educacao.cursos", name: "Cursos e faculdade", keywords: ["faculdade", "curso", "escola", "mensalidade escolar", "udemy", "alura", "material escolar", "livro"] },
  ]},
  { slug: "lazer", name: "Lazer", icon: "🎉", color: "#FFB020", kind: "EXPENSE", subs: [
    { slug: "lazer.passeios", name: "Passeios e eventos", keywords: ["cinema", "show", "ingresso", "teatro", "parque", "balada", "festa"] },
    { slug: "lazer.viagem", name: "Viagem", keywords: ["hotel", "airbnb", "passagem aerea", "passagem aérea", "latam", "gol", "azul", "booking"] },
  ]},
  { slug: "assinaturas", name: "Assinaturas", icon: "📺", color: "#EC4899", kind: "EXPENSE", subs: [
    { slug: "assinaturas.streaming", name: "Streaming", keywords: ["netflix", "spotify", "disney", "prime video", "amazon prime", "hbo", "max ", "globoplay", "deezer", "youtube premium", "apple"] },
    { slug: "assinaturas.academia", name: "Academia", keywords: ["academia", "smart fit", "smartfit", "bluefit", "gympass", "wellhub"] },
    { slug: "assinaturas.apps", name: "Apps e serviços", keywords: ["icloud", "google one", "chatgpt", "microsoft 365", "assinatura"] },
  ]},
  { slug: "compras", name: "Compras", icon: "🛍️", color: "#F97316", kind: "EXPENSE", subs: [
    { slug: "compras.roupas", name: "Roupas e acessórios", keywords: ["roupa", "renner", "c&a", "riachuelo", "zara", "shein", "tenis", "tênis", "sapato"] },
    { slug: "compras.online", name: "Lojas online", keywords: ["amazon", "mercado livre", "shopee", "magalu", "magazine luiza", "americanas", "aliexpress"] },
    { slug: "compras.casa", name: "Casa e limpeza", keywords: ["limpeza", "detergente", "sabao", "sabão", "utilidades", "tok stok", "camicado"] },
    { slug: "compras.eletronicos", name: "Eletrônicos", keywords: ["celular novo", "notebook", "fone", "eletronico", "eletrônico", "kabum"] },
  ]},
  { slug: "pets", name: "Pets", icon: "🐾", color: "#A16207", kind: "EXPENSE", subs: [
    { slug: "pets.geral", name: "Pet shop e veterinário", keywords: ["pet", "petz", "cobasi", "racao", "ração", "veterinario", "veterinário"] },
  ]},
  { slug: "impostos", name: "Impostos e taxas", icon: "🧾", color: "#64748B", kind: "EXPENSE", subs: [
    { slug: "impostos.tarifas", name: "Tarifas e juros", keywords: ["tarifa", "juros", "iof", "anuidade", "multa", "taxa"] },
    { slug: "impostos.impostos", name: "Impostos", keywords: ["imposto", "darf", "das ", "mei", "irpf"] },
  ]},
  { slug: "outros", name: "Outros gastos", icon: "📦", color: "#94A3B8", kind: "EXPENSE", subs: [
    { slug: "outros.geral", name: "Diversos", keywords: [] },
  ]},
  // Receitas
  { slug: "receita", name: "Dinheiro que entrou", icon: "💰", color: "#19C37D", kind: "INCOME", subs: [
    { slug: "receita.salario", name: "Salário", keywords: ["salario", "salário", "pagamento empresa", "holerite", "13o", "decimo terceiro", "ferias", "férias"] },
    { slug: "receita.freela", name: "Freela e serviços", keywords: ["freela", "freelance", "servico", "serviço", "cliente", "job"] },
    { slug: "receita.aluguel", name: "Aluguel recebido", keywords: ["aluguel recebido", "inquilino"] },
    { slug: "receita.reembolso", name: "Reembolso", keywords: ["reembolso", "estorno", "devolucao", "devolução", "cashback"] },
    { slug: "receita.pix", name: "Pix recebido", keywords: ["pix recebido", "transferencia recebida"] },
    { slug: "receita.outros", name: "Outras entradas", keywords: ["mesada", "presente", "venda", "rendimento"] },
  ]},
];

export const FALLBACK_EXPENSE = "outros.geral";
export const FALLBACK_INCOME = "receita.outros";
