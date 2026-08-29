import { useState, useCallback } from 'react';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { createProduct, createPantryItem, getProductByBarcode, getSettings } from '@/database';
import { lookupProduct, validateBarcode, type ProductLookupResult } from '@/services/productProvider';
import type { ProductCategory, QuantityUnit, PantryLocation } from '@/types';

type Step = 'scanning' | 'looking' | 'found' | 'not-found' | 'add-to-pantry' | 'done';

export default function ScannerPage() {
  const { scannerOpen, setScannerOpen, setCurrentPage } = useAppStore();
  const [step, setStep] = useState<Step>('scanning');
  const [barcode, setBarcode] = useState('');
  const [barcodeType, setBarcodeType] = useState('');
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [productId, setProductId] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('alimentos');
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('un');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState('');

  // Pantry state
  const [quantity, setQuantity] = useState(1);
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState<PantryLocation>('despensa');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleScan = useCallback(async (code: string, format: string) => {
    setBarcode(code);
    setBarcodeType(format);
    setStep('looking');
    setError('');

    // Validate
    const validation = validateBarcode(code);

    // Check local DB first
    const existing = await getProductByBarcode(code);
    if (existing) {
      setProductId(existing.id);
      setName(existing.name);
      setBrand(existing.brand);
      setCategory(existing.category);
      setQuantityUnit(existing.quantityUnit);
      setImageUrl(existing.imageUrl);
      setIngredients(existing.ingredients);
      setLookupResult({ found: true, barcode: code, name: existing.name, brand: existing.brand });
      setStep('found');
      return;
    }

    // Lookup online
    const result = await lookupProduct(code);
    setLookupResult(result);

    if (result.found) {
      setName(result.name || '');
      setBrand(result.brand || '');
      setImageUrl(result.imageUrl || '');
      setIngredients(result.ingredients || '');
      if (result.category) {
        setCategory(result.category as ProductCategory);
      }
      setStep('found');
    } else {
      setStep('not-found');
    }
  }, []);

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      setError('Nome do produto é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const product = await createProduct({
        barcode,
        name: name.trim(),
        brand: brand.trim(),
        category,
        quantityUnit,
        packageSize: '',
        imageUrl,
        ingredients,
        nutritionalInfo: '',
        source: lookupResult?.found ? 'openfoodfacts' : 'manual'
      });
      setProductId(product.id);
      setStep('add-to-pantry');
    } catch (err) {
      setError('Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPantry = async () => {
    if (!expirationDate) {
      setError('Data de validade é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const settings = await getSettings();
      await createPantryItem({
        productId,
        quantity,
        expirationDate: new Date(expirationDate),
        purchaseDate: new Date(),
        openedDate: null,
        location: location || settings.defaultLocation,
        notes
      });
      setStep('done');
    } catch (err) {
      setError('Erro ao adicionar à despensa');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep('scanning');
    setBarcode('');
    setBarcodeType('');
    setLookupResult(null);
    setProductId('');
    setName('');
    setBrand('');
    setCategory('alimentos');
    setQuantityUnit('un');
    setImageUrl('');
    setIngredients('');
    setQuantity(1);
    setExpirationDate('');
    setLocation('despensa');
    setNotes('');
    setError('');
  };

  if (!scannerOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      {/* Scanner */}
      {step === 'scanning' && (
        <ScannerOverlay onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}

      {/* Looking up */}
      {step === 'looking' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">Buscando produto...</p>
            <p className="text-sm text-gray-500 mt-1">Código: {barcode}</p>
          </div>
        </div>
      )}

      {/* Product found */}
      {step === 'found' && (
        <div className="min-h-screen p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('scanning')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Produto encontrado</h1>
              <p className="text-sm text-gray-500">{barcode} ({barcodeType})</p>
            </div>
          </div>

          <ProductForm
            name={name} setName={setName}
            brand={brand} setBrand={setBrand}
            category={category} setCategory={setCategory}
            quantityUnit={quantityUnit} setQuantityUnit={setQuantityUnit}
            imageUrl={imageUrl} setImageUrl={setImageUrl}
            ingredients={ingredients} setIngredients={setIngredients}
            error={error}
          />

          <div className="mt-6 space-y-3">
            <button
              onClick={handleSaveProduct}
              disabled={saving || !name.trim()}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Salvando...' : productId ? 'Próximo: Adicionar à despensa' : 'Salvar e adicionar à despensa'}
            </button>
            {!productId && (
              <button
                onClick={() => setStep('add-to-pantry')}
                className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium"
              >
                Pular para validade
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product not found */}
      {step === 'not-found' && (
        <div className="min-h-screen p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep('scanning')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Produto não encontrado</h1>
              <p className="text-sm text-gray-500">Código: {barcode} ({barcodeType})</p>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl mb-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Produto não encontrado na base de dados. Preencha os dados manualmente.
            </p>
          </div>

          <ProductForm
            name={name} setName={setName}
            brand={brand} setBrand={setBrand}
            category={category} setCategory={setCategory}
            quantityUnit={quantityUnit} setQuantityUnit={setQuantityUnit}
            imageUrl={imageUrl} setImageUrl={setImageUrl}
            ingredients={ingredients} setIngredients={setIngredients}
            error={error}
          />

          <button
            onClick={handleSaveProduct}
            disabled={saving || !name.trim()}
            className="w-full mt-6 py-3 bg-brand-600 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Cadastrar e adicionar à despensa'}
          </button>
        </div>
      )}

      {/* Add to pantry */}
      {step === 'add-to-pantry' && (
        <div className="min-h-screen p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={reset} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar à despensa</h1>
          </div>

          {/* Product summary */}
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl mb-6 border border-gray-100 dark:border-gray-700">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Package size={24} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
              {brand && <p className="text-sm text-gray-500">{brand}</p>}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de validade *</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-bold"
                >
                  −
                </button>
                <span className="text-2xl font-bold w-12 text-center text-gray-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 bg-brand-600 text-white rounded-xl flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as PantryLocation)}
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="despensa">📦 Despensa</option>
                <option value="geladeira">❄️ Geladeira</option>
                <option value="freezer">🧊 Freezer</option>
                <option value="armario">🗄️ Armário</option>
                <option value="outro">📌 Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Comprado no mercado X"
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            onClick={handleAddToPantry}
            disabled={saving || !expirationDate}
            className="w-full mt-6 py-3 bg-brand-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Adicionar à despensa'}
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Produto adicionado!</h2>
            <p className="text-gray-500 mb-6">Adicionado à despensa com sucesso.</p>
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold"
              >
                Escanear outro produto
              </button>
              <button
                onClick={() => { setScannerOpen(false); setCurrentPage('dashboard'); }}
                className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Sub Components ====================

function ScannerOverlay({ onScan, onClose }: { onScan: (code: string, format: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <BarcodeScannerInline onScan={onScan} onClose={onClose} />
    </div>
  );
}

function BarcodeScannerInline({ onScan, onClose }: { onScan: (code: string, format: string) => void; onClose: () => void }) {
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');

  // Dynamic import to avoid SSR issues
  const [ScannerComponent, setScannerComponent] = useState<React.ComponentType<{ onScan: (code: string, format: string) => void; onClose: () => void }> | null>(null);

  useState(() => {
    import('@/scanner/BarcodeScanner').then(mod => {
      setScannerComponent(() => mod.default);
    });
  });

  if (manualMode) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-6 z-50">
        <form
          onSubmit={(e) => { e.preventDefault(); if (manualCode.trim()) onScan(manualCode.trim(), 'manual'); }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="text-center text-white mb-6">
            <p className="text-lg">Digite o código de barras</p>
          </div>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ex: 7891234567890"
            className="w-full p-4 text-lg text-center bg-white/10 text-white border border-white/30 rounded-xl focus:outline-none focus:border-brand-400"
            autoFocus
            inputMode="numeric"
          />
          <button type="submit" disabled={!manualCode.trim()} className="w-full p-4 bg-brand-600 text-white rounded-xl font-semibold disabled:opacity-50">
            Buscar
          </button>
          <button type="button" onClick={() => setManualMode(false)} className="w-full p-3 text-white/60 text-sm">
            Voltar para câmera
          </button>
        </form>
      </div>
    );
  }

  if (ScannerComponent) {
    return <ScannerComponent onScan={onScan} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6 z-50">
      <div className="text-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Carregando câmera...</p>
        <button onClick={() => setManualMode(true)} className="text-brand-400 text-sm">
          Ou digite o código manualmente
        </button>
      </div>
    </div>
  );
}

function ProductForm({
  name, setName, brand, setBrand, category, setCategory,
  quantityUnit, setQuantityUnit, imageUrl, setImageUrl,
  ingredients, setIngredients, error
}: {
  name: string; setName: (v: string) => void;
  brand: string; setBrand: (v: string) => void;
  category: ProductCategory; setCategory: (v: ProductCategory) => void;
  quantityUnit: QuantityUnit; setQuantityUnit: (v: QuantityUnit) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
  ingredients: string; setIngredients: (v: string) => void;
  error: string;
}) {
  return (
    <div className="space-y-4">
      {error && (
        <p className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-xl">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
        <input
          type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
        <select
          value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
        >
          <option value="alimentos">🍎 Alimentos</option>
          <option value="bebidas">🥤 Bebidas</option>
          <option value="limpeza">🧹 Limpeza</option>
          <option value="higiene">🧴 Higiene</option>
          <option value="farmacia">💊 Farmácia</option>
          <option value="pet">🐾 Pet</option>
          <option value="outros">📦 Outros</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
        <select
          value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value as QuantityUnit)}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
        >
          <option value="un">Unidade</option>
          <option value="kg">Quilograma</option>
          <option value="g">Grama</option>
          <option value="l">Litro</option>
          <option value="ml">Mililitro</option>
          <option value="cx">Caixa</option>
          <option value="pct">Pacote</option>
        </select>
      </div>

      {imageUrl && (
        <div className="text-center">
          <img src={imageUrl} alt="" className="w-24 h-24 rounded-xl object-cover mx-auto" />
          <button onClick={() => setImageUrl('')} className="text-xs text-red-500 mt-1">Remover foto</button>
        </div>
      )}
    </div>
  );
}
