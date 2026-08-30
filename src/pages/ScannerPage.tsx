import { useState, useMemo, useCallback, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Loader2, Calendar, Barcode, Tag, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { createProduct, createPantryItem, getProductByBarcode } from '@/database';
import { lookupProduct, saveToLocalCache } from '@/services/productProvider';
import { analyzeBarcode, getDefaultExpirationDays, formatExpirationInfo } from '@/utils/barcode';
import { logError, logInfo } from '@/utils/logger';
import BarcodeScanner from '@/scanner/BarcodeScanner';
import type { ProductCategory, PantryLocation } from '@/types';

type Step = 'scanning' | 'loading' | 'form' | 'success';

export default function ScannerPage() {
  const { setScannerOpen, addProduct, addPantryItem, settings } = useAppStore();
  const [step, setStep] = useState<Step>('scanning');
  const [barcode, setBarcode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dataSource, setDataSource] = useState<string>('');

  // Product data
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('alimentos');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState<PantryLocation>((settings.defaultLocation as PantryLocation) || 'despensa');
  const [notes, setNotes] = useState('');

  const barcodeInfo = useMemo(() => {
    if (!barcode) return null;
    return analyzeBarcode(barcode);
  }, [barcode]);

  const handleScan = useCallback((code: string) => {
    console.log('[Scanner] Código lido:', code);
    // Always reset everything before processing new scan
    resetAllFields();
    setBarcode(code);
    processBarcode(code);
  }, []);

  function resetAllFields() {
    setDataSource('');
    setName('');
    setBrand('');
    setCategory('alimentos');
    setImageUrl('');
    setQuantity(1);
    setExpirationDate('');
    setLocation((settings.defaultLocation as PantryLocation) || 'despensa');
    setNotes('');
    setSaveError('');
  }

  async function processBarcode(code: string) {
    console.log('[Scanner] processBarcode called with:', code);
    setStep('loading');
    setSaveError('');
    setDataSource('');

    // Validate barcode length
    if (code.length < 8) {
      console.warn('[Scanner] Código muito curto:', code);
      setDataSource('⚠️ Código muito curto');
      resetFormForNewProduct(code);
      return;
    }

    // 1. Check local DB first (products the user already saved)
    try {
      const localProduct = await getProductByBarcode(code);
      if (localProduct) {
        console.log('[Scanner] ✅ Produto encontrado no banco local:', localProduct.name);
        setName(localProduct.name);
        setBrand(localProduct.brand);
        setCategory(localProduct.category);
        setImageUrl(localProduct.imageUrl);
        setDataSource('banco_local');
        const days = getDefaultExpirationDays(localProduct.category) ?? 730;
        setExpirationDate(getDefaultDate(days));
        setStep('form');
        return;
      }
    } catch (err) {
      console.warn('[Scanner] Erro ao buscar local:', err);
    }

    // 2. Try external APIs for ALL products (including Brazilian 789/790)
    //    Priority: OpenBeautyFacts → OpenProductsFacts → OSCBR → OpenFoodFacts
    try {
      const result = await lookupProduct(code);
      if (result.found) {
        console.log('[Scanner] ✅ Produto encontrado via API:', result.name, 'fonte:', result.source);
        setName(result.name || '');
        setBrand(result.brand || '');
        const cat = (result.category as ProductCategory) || 'outros';
        setCategory(cat);
        setImageUrl(result.imageUrl || '');
        setDataSource(result.source || 'api');
        const days = getDefaultExpirationDays(cat) ?? 730;
        setExpirationDate(getDefaultDate(days));
        setStep('form');
        return;
      }
    } catch (err) {
      console.error('[Scanner] Erro na busca:', err);
      logError('Erro ao buscar produto na API', `Barcode: ${code} - ${(err as Error).message}`, 'scanner');
    }

    // 3. Not found anywhere — open empty form for manual entry
    console.log('[Scanner] ❌ Produto não encontrado');
    setDataSource('nao_encontrado');
    resetFormForNewProduct(code);
  }

  function resetFormForNewProduct(code?: string) {
    const info = code ? analyzeBarcode(code) : null;
    const cat = (info?.suggestedCategory as ProductCategory) || 'alimentos';
    setCategory(cat);
    setBrand(info?.suggestedBrand || '');
    setName('');
    setImageUrl('');
    setQuantity(1);
    const days = getDefaultExpirationDays(cat) ?? 180;
    setExpirationDate(getDefaultDate(days));
    setLocation((settings.defaultLocation as PantryLocation) || 'despensa');
    setNotes('');
    setStep('form');
  }

  function getDefaultDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }

    setSaveError('');

    try {
      // Parse expiration date
      let expDate: Date | null = null;
      if (expirationDate && expirationDate.trim() !== '') {
        const parsed = new Date(expirationDate + 'T12:00:00');
        if (!isNaN(parsed.getTime())) {
          expDate = parsed;
        }
      }

      const purchaseDate = new Date();

      // Create product in DB
      const product = await createProduct({
        barcode: barcode || 'manual_' + Date.now(),
        name: name.trim(),
        brand: brand.trim(),
        category,
        quantityUnit: 'un',
        packageSize: '',
        imageUrl,
        ingredients: '',
        nutritionalInfo: '',
        source: barcode ? 'scan' : 'manual',
      });
      addProduct(product);

      // Save to local cache for future scans
      if (barcode) {
        saveToLocalCache(barcode, {
          name: name.trim(),
          brand: brand.trim(),
          category,
        });
      }

      // Create pantry item
      const item = await createPantryItem({
        productId: product.id,
        quantity,
        expirationDate: expDate,
        purchaseDate,
        openedDate: null,
        location,
        notes: notes.trim(),
      });
      addPantryItem(item);

      setStep('success');
    } catch (err: any) {
      console.error('[Scanner] Erro ao salvar:', err);
      logError('Erro ao salvar produto', `Nome: ${name} - ${(err as Error).message}`, 'scanner');
      setSaveError(err?.message || 'Erro desconhecido ao salvar');
      setStep('form');
    }
  }

  function handleManualSubmit() {
    if (manualCode.trim()) {
      resetAllFields();
      setBarcode(manualCode.trim());
      processBarcode(manualCode.trim());
      setShowManualEntry(false);
      setManualCode('');
    }
  }

  function goToForm() {
    resetAllFields();
    setBarcode('');
    resetFormForNewProduct();
  }

  function resetScanner() {
    setStep('scanning');
    resetAllFields();
    setBarcode('');
  }

  function rescan() {
    resetAllFields();
    setBarcode('');
    setStep('scanning');
  }

  const expiryInfo = useMemo(() => {
    if (!expirationDate) return null;
    return formatExpirationInfo(expirationDate);
  }, [expirationDate]);

  // Source label for display
  const sourceLabel = useMemo(() => {
    switch (dataSource) {
      case 'banco_local': return { text: '📦 Encontrado no banco local', color: 'green' };
      case 'user_cache': return { text: '💾 Encontrado no cache', color: 'blue' };
      case 'local_database': return { text: '📱 Base de dados local', color: 'blue' };
      case 'osccbr': return { text: '🇧🇷 Consulta OSCBR (Brasil)', color: 'green' };
      case 'openfoodfacts': return { text: '🌍 Open Food Facts', color: 'blue' };
      case 'openbeautyfacts': return { text: '🧴 Open Beauty Facts', color: 'purple' };
      case 'openproductsfacts': return { text: '📦 Open Products Facts', color: 'blue' };
      case 'prefix_hint': return { text: '🏷️ Apenas sugestão pelo prefixo', color: 'yellow' };
      case 'produto_brasileiro': return { text: '🇧🇷 Produto brasileiro — digite o nome do produto', color: 'green' };
      case 'nao_encontrado': return { text: '❌ Produto não encontrado — cadastre manualmente', color: 'red' };
      default: return null;
    }
  }, [dataSource]);

  // ---- RENDER: Scanning ----
  if (step === 'scanning') {
    return (
      <>
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />

        <div className="fixed bottom-24 inset-x-0 z-50 flex flex-col items-center gap-3 px-4">
          <button
            onClick={goToForm}
            className="w-full max-w-xs py-3 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg"
          >
            📝 Cadastrar produto manualmente
          </button>
          <button
            onClick={() => setShowManualEntry(true)}
            className="w-full max-w-xs py-3 bg-black/60 text-white rounded-full text-sm font-medium backdrop-blur-sm"
          >
            🔢 Digitar código de barras
          </button>
        </div>

        {showManualEntry && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Código manual</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Digite o código de barras do produto
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 7891234567890"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-center text-lg font-mono tracking-wider mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowManualEntry(false); setManualCode(''); }}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl disabled:opacity-50"
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---- RENDER: Loading ----
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="text-brand-600 animate-spin" />
        <p className="text-gray-600 dark:text-gray-300">Buscando produto...</p>
        <p className="text-xs text-gray-400 font-mono">{barcode}</p>
        <button
          onClick={resetScanner}
          className="mt-4 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Cancelar
        </button>
      </div>
    );
  }

  // ---- RENDER: Success ----
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produto adicionado!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">{name}</p>
        {expiryInfo && (
          <p className={`text-sm font-medium text-${expiryInfo.color}-600`}>
            {expiryInfo.label}
          </p>
        )}
        <div className="flex gap-3 mt-4 w-full max-w-xs">
          <button onClick={rescan} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Escanear outro
          </button>
          <button onClick={() => setScannerOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ---- RENDER: Form ----
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={rescan} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {dataSource === 'nao_encontrado' ? 'Cadastrar produto' : barcode ? 'Confirmar produto' : 'Cadastrar produto'}
          </h2>
          {barcode && (
            <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
              <Barcode size={12} /> {barcode}
            </p>
          )}
        </div>
        <button onClick={() => setScannerOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <X size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Error banner */}
        {saveError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-200">❌ {saveError}</p>
          </div>
        )}

        {/* Source indicator */}
        {sourceLabel && (
          <div className={`p-3 rounded-xl border ${
            sourceLabel.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            sourceLabel.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
            sourceLabel.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
            'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <p className={`text-sm font-medium ${
              sourceLabel.color === 'green' ? 'text-green-800 dark:text-green-200' :
              sourceLabel.color === 'red' ? 'text-red-800 dark:text-red-200' :
              sourceLabel.color === 'yellow' ? 'text-yellow-800 dark:text-yellow-200' :
              'text-blue-800 dark:text-blue-200'
            }`}>
              {sourceLabel.text}
            </p>
          </div>
        )}

        {/* Barcode info */}
        {barcode && barcodeInfo && (
          <div className={`p-3 rounded-xl border ${
            barcodeInfo.isBrazilian
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{barcodeInfo.isBrazilian ? '🇧🇷' : '🌍'}</span>
              <div>
                <p className={`text-sm font-medium ${barcodeInfo.isBrazilian ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'}`}>
                  {barcodeInfo.description}
                </p>
                {barcodeInfo.suggestedBrand && !brand && (
                  <p className="text-xs text-gray-500">Possível marca: {barcodeInfo.suggestedBrand}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!barcode && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              📝 Preencha os dados do produto.
            </p>
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <div className="flex justify-center">
            <img src={imageUrl} alt="" className="w-24 h-24 rounded-xl object-cover shadow-sm" />
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do produto *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Desodorante Rexona"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <span className="flex items-center gap-1.5"><Tag size={14} /> Marca</span>
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex: Unilever"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => {
              const newCat = e.target.value as ProductCategory;
              setCategory(newCat);
              const days = getDefaultExpirationDays(newCat);
              setExpirationDate(days ? getDefaultDate(days) : '');
            }}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="alimentos">🍎 Alimentos</option>
            <option value="bebidas">🥤 Bebidas</option>
            <option value="limpeza">🧹 Limpeza</option>
            <option value="higiene">🧴 Higiene</option>
            <option value="farmacia">💊 Farmácia</option>
            <option value="pet">🐾 Pet</option>
            <option value="descartaveis">📦 Descartáveis</option>
            <option value="outros">📋 Outros</option>
          </select>
        </div>

        {/* Expiration date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> Data de validade</span>
          </label>
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          {expiryInfo && (
            <p className={`text-xs mt-1 font-medium ${
              expiryInfo.color === 'red' ? 'text-red-600' :
              expiryInfo.color === 'orange' ? 'text-orange-600' :
              expiryInfo.color === 'yellow' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {expiryInfo.label}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-90 transition-all text-xl font-bold"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-900 dark:text-white w-16 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-90 transition-all text-xl font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> Local</span>
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as PantryLocation)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="despensa">📦 Despensa</option>
            <option value="geladeira">❄️ Geladeira</option>
            <option value="freezer">🧊 Freezer</option>
            <option value="armario">🗄️ Armário</option>
            <option value="outro">📍 Outro</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações opcionais"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Rescan button - show when we have a barcode */}
          {barcode && (
            <button
              onClick={rescan}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={18} /> Ler novamente
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={`${barcode ? 'flex-1' : 'w-full'} py-4 bg-brand-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-brand-600/20`}
          >
            Adicionar à despensa
          </button>
        </div>
      </div>
    </div>
  );
}
