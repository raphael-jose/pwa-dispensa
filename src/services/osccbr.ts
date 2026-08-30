/**
 * OSCBR GTIN API - Brazilian product database
 * Free tier: 20 requests/minute
 * Docs: https://github.com/OpenSourceCommunityBrasil/Client-API-GTIN
 */

const API_BASE = 'https://gtin.rscsistemas.com.br';
const CREDENTIALS_KEY = 'despensa_osccbr_credentials';

export interface OSCredentials {
  username: string;
  password: string;
}

export interface OSCCbrProduct {
  ean: string;
  ean_tipo: string;
  ncm: number;
  nome: string;
  marca: string;
  pais: string;
  categoria: string;
  link_foto: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function getCredentials(): OSCredentials | null {
  try {
    const data = localStorage.getItem(CREDENTIALS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: OSCredentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  // Clear cached token when credentials change
  cachedToken = null;
  tokenExpiresAt = 0;
}

export function hasCredentials(): boolean {
  const creds = getCredentials();
  return !!(creds?.username && creds?.password);
}

async function getToken(): Promise<string | null> {
  const creds = getCredentials();
  if (!creds) return null;

  // Return cached token if still valid (expires in 1 hour, we check 5 min before)
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  try {
    const credentials = btoa(`${creds.username}:${creds.password}`);
    const response = await fetch(`${API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error('[OSCBR] Token error:', response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = data.token;
    tokenExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    console.log('[OSCBR] Token obtido com sucesso');
    return cachedToken;
  } catch (err) {
    console.error('[OSCBR] Erro ao obter token:', err);
    return null;
  }
}

export async function lookupByGTIN(gtin: string): Promise<{
  found: boolean;
  name?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  ncm?: number;
}> {
  const token = await getToken();
  if (!token) {
    console.log('[OSCBR] Sem token disponível');
    return { found: false };
  }

  try {
    const response = await fetch(`${API_BASE}/api/gtin/infor/${gtin}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log(`[OSCBR] Produto não encontrado: ${response.status}`);
      return { found: false };
    }

    const data: OSCCbrProduct = await response.json();

    if (!data.nome) {
      return { found: false };
    }

    console.log(`[OSCBR] ✅ Produto encontrado: ${data.nome} (${data.marca})`);

    return {
      found: true,
      name: data.nome,
      brand: data.marca || '',
      category: mapOSCCategory(data.nome, data.marca, data.categoria),
      imageUrl: data.link_foto || '',
      ncm: data.ncm
    };
  } catch (err) {
    console.error('[OSCBR] Erro na busca:', err);
    return { found: false };
  }
}

/**
 * Map OSCBR product name/brand/category to our app categories
 */
function mapOSCCategory(name: string, brand: string, oscCategory: string): string {
  const all = `${name} ${brand} ${oscCategory}`.toLowerCase();

  // Higiene pessoal
  if (/\b(sabonete|desodorante|shampoo|condicionador|creme de pentear|pasta de dente|escova de dente|fio dental|desodorante|loção corporal|protetor solar|protetor labial|base líquida|batom|rímel|sombra)\b/.test(all)) {
    return 'higiene';
  }

  // Limpeza
  if (/\b(sabão em pó|amaciante|detergente|desinfetante|água sanitária|cloro|vespilha|esponja|product multiuso|limpa vidro|limpa frios|removedor|alvejante|lavanderia|roupa|passar roupa)\b/.test(all)) {
    return 'limpeza';
  }

  // Alimentos
  if (/\b(arroz|feijão|macarrão|massa|farinha|óleo|açúcar|sal|café|leite|queijo|manteiga|margarina|presunto|mortadela|salsicha|pão|biscoito|bolo|cereal|achocolatado|suco|extrato de tomate|molho|catchup|maionese|mostarda|castanha|noz|amendoim|granola|mel|geleia)\b/.test(all)) {
    return 'alimentos';
  }

  // Bebidas
  if (/\b(água|refrigerante|cerveja|vinho|suco|energético|cha|chá|achocolatado em pó|leite em pó)\b/.test(all)) {
    return 'bebidas';
  }

  // Farmácia
  if (/\b(medicamento|remédio|vitamina|suplemento|band-aid|gaze|álcool|peróxido|antisséptico|analgésico|anti-inflamatório)\b/.test(all)) {
    return 'farmacia';
  }

  // Pet
  if (/\b(ração|pet|cão|gato|cachorro|gato|aves|peixe|hamster)\b/.test(all)) {
    return 'pet';
  }

  // Descartáveis
  if (/\b(descartável|copo|prato|talher|guardanapo|sacola|papel alumínio|papel filme|film|alumínio|isopor)\b/.test(all)) {
    return 'descartaveis';
  }

  return 'outros';
}
