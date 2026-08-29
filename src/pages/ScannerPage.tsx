import { useState, useEffect } from 'react';
import { X, Camera, Package, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { createProduct, createPantryItem, getProductByBarcode, getAllProducts } from '@/database';
import { lookupProduct, validateBarcode, type ProductLookupResult } from '@/services/productProvider';
import BarcodeScanner from '@/scanner/BarcodeScanner';
import type { ProductCategory, PantryLocation } from '@/types';

type Step = 'scanning' | 'loading' | 'found' | 'not_found' | 'form' | 'success';

export default function ScannerPage() {
  const { setScannerOpen, addProduct, addPantryItem, settings } = useAppStore();
  const [step, setStep] = useState<Step>('scanning');
  const [barcode, setBarcode] = useState('');
  const [barcodeType, setBarcodeType] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Product data
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('alimentos');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState<PantryLocation>(settings.defaultLocation as PantryLocation || 'despensa');
  const [notes, setNotes] = useState('');

  // Flash message
  const [flashMessage, setFlashMessage] = useState('');

  function handleScan(code: string) {
    console.log('[Scanner] Código lido:', code);
    const validation = validateBarcode(code);
    setBarcode(code);
    setBarcodeType(validation.type);
    processBarcode(code);
  }

  async function processBarcode(code: string) {
    setStep('loading');

    // Check local DB first
    const localProduct = await getProductByBarcode(code);
    if (localProduct) {
      console.log('[Scanner] Produto encontrado localmente:', localProduct.name);
      setName(localProduct.name);
      setBrand(localProduct.brand);
      setCategory(localProduct.category);
      setImageUrl(localProduct.imageUrl);
      setStep('form');
      return;
    }

    // Try external APIs
    try {
      const result = await lookupProduct(code);
      if (result.found) {
        console.log('[Scanner] Produto encontrado via API:', result.name, 'fonte:', result.source);
        setName(result.name || '');
        setBrand(result.brand || '');
        setCategory((result.category as ProductCategory) || 'alimentos');
        setImageUrl(result.imageUrl || '');
        setStep('form');
      } else {
        console.log('[Scanner] Produto não encontrado em nenhuma base');
        setStep('not_found');
      }
    } catch (err) {
      console.error('[Scanner] Erro na busca:', err);
      setStep('not_found');
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }

    try {
      // Create product
      const product = await createProduct({
        barcode,
        name: name.trim(),
        brand: brand.trim(),
        category,
        quantityUnit: 'un',
        packageSize: '',
        imageUrl,
        ingredients: '',
        nutritionalInfo: '',
        source: 'manual',
      });
      addProduct(product);

      // Create pantry item
      if (expirationDate || quantity > 0) {
        const item = await createPantryItem({
          productId: product.id,
          quantity,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          purchaseDate: new Date(),
          openedDate: null,
          location,
          notes: notes.trim(),
        });
        addPantryItem(item);
      }

      setStep('success');
    } catch (err: any) {
      console.error('[Scanner] Erro ao salvar:', err);
      alert('Erro ao salvar: ' + err.message);
    }
  }

  function handleManualSubmit() {
    if (manualCode.trim()) {
      processBarcode(manualCode.trim());
      setShowManualEntry(false);
    }
  }

  function resetScanner() {
    setStep('scanning');
    setBarcode('');
    setBarcodeType('');
    setName('');
    setBrand('');
    setCategory('alimentos');
    setImageUrl('');
    setQuantity(1);
    setExpirationDate('');
    setLocation(settings.defaultLocation as PantryLocation || 'despensa');
    setNotes('');
  }

  // ---- Render ----

  if (step === 'scanning') {
    return (
      <>
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
        {/* Manual entry button */}
        <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center">
          <button
            onClick={() => setShowManualEntry(true)}
            className="px-6 py-3 bg-black/60 text-white rounded-full text-sm font-medium backdrop-blur-sm"
          >
            Digitar código manualmente
          </button>
        </div>

        {/* Manual entry modal */}
        {showManualEntry && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Código manual</h3>
              <input
                type="text"
                placeholder="Digite o código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white mb-4"
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
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 size={48} className="text-brand-600 animate-spin" />
        <p className="text-gray-600 dark:text-gray-300">Buscando produto...</p>
        <p className="text-xs text-gray-400">{barcode}</p>
        <button
          onClick={resetScanner}
          className="mt-4 px-6 py-2 text-gray-500 text-sm"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Check size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produto adicionado!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          {name} foi salvo na despensa.
        </p>
        <div className="flex gap-3 mt-4 w-full max-w-xs">
          <button
            onClick={resetScanner}
            className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium"
          >
            Escanear outro
          </button>
          <button
            onClick={() => setScannerOpen(false)}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Form (found or not_found with manual data)
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step === 'not_found' ? resetScanner() : setScannerOpen(false)}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {step === 'not_found' ? 'Cadastro manual' : 'Produto encontrado'}
        </h2>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Info banner */}
        {step === 'not_found' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-2">
            <AlertTriangle size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Produto não encontrado</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Código: {barcode}</p>
            </div>
          </div>
        )}

        {/* Image preview */}
        {imageUrl && (
          <div className="flex justify-center">
            <img src={imageUrl} alt="" className="w-24 h-24 rounded-xl object-cover" />
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do produto"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca do produto"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de validade</label>
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
            >
              -
            </button>
            <span className="text-xl font-bold text-gray-900 dark:text-white w-12 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
            >
              +
            </button>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local</label>
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

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          Adicionar à despensa
        </button>
      </div>
    </div>
  );
}
