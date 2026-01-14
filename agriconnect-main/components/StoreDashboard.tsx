
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Phone, Trash2, Tag, X, Box, Camera, ImageIcon, MapPin, Loader2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { StoreProduct, Language, User } from '../types';
import { TRANSLATIONS } from '../constants';

interface DashboardProps {
  language: Language;
  currentUser: User;
  onUserUpdate?: (user: User) => void;
}

const StoreDashboard: React.FC<DashboardProps> = ({ language, currentUser, onUserUpdate }) => {
  const t = TRANSLATIONS[language];
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const shopFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  
  const [productForm, setProductForm] = useState<{name: string, category: any, price: string, images: string[]}>({
    name: '',
    category: 'Seeds',
    price: '',
    images: []
  });

  const fetchProducts = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await storageService.getStoreProducts(currentUser.id);
      setProducts(data);
    } catch (e) {
      console.error("Store refresh failed", e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(true);
    // Real-time synchronization interval
    const interval = setInterval(() => fetchProducts(false), 5000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleShopImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const currentImages = currentUser.shopImages || [];
    const remainingSlots = 3 - currentImages.length;
    
    if (remainingSlots <= 0) {
      alert("Maximum 3 shop images allowed.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    let processedCount = 0;
    const newBase64Images: string[] = [];

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        newBase64Images.push(reader.result as string);
        processedCount++;
        
        if (processedCount === filesToProcess.length) {
          const finalImages = [...currentImages, ...newBase64Images];
          const updatedUser = await storageService.updateUser(currentUser.id, { shopImages: finalImages });
          if (updatedUser && onUserUpdate) {
            onUserUpdate(updatedUser);
          } else if (onUserUpdate) {
            onUserUpdate({ ...currentUser, shopImages: finalImages });
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removeShopImage = async (index: number) => {
    const currentImages = currentUser.shopImages || [];
    const newImages = currentImages.filter((_, i) => i !== index);
    const updatedUser = await storageService.updateUser(currentUser.id, { shopImages: newImages });
    if (updatedUser && onUserUpdate) {
      onUserUpdate(updatedUser);
    } else if (onUserUpdate) {
      onUserUpdate({ ...currentUser, shopImages: newImages });
    }
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (productForm.images.length + files.length > 3) {
      alert("Maximum 3 images allowed.");
      return;
    }

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeProductImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name) return;

    const newProduct: StoreProduct = {
      id: crypto.randomUUID(),
      name: productForm.name,
      category: productForm.category,
      price: productForm.price,
      images: productForm.images
    };

    // Immediate local feedback
    setProducts(prev => [...prev, newProduct]);

    const updated = await storageService.addStoreProduct(currentUser.id, newProduct);
    setProducts(updated);
    setIsAdding(false);
    setProductForm({ name: '', category: 'Seeds', price: '', images: [] });
  };

  const handleDeleteProduct = async (productId: string) => {
    // Instant feedback
    setProducts(prev => prev.filter(p => p.id !== productId));
    const updated = await storageService.deleteStoreProduct(currentUser.id, productId);
    setProducts(updated);
  };

  return (
    <div className="pb-24 px-4">
      {/* Store Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-purple-100 mt-6 mb-8 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShoppingBag className="h-32 w-32" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight">{currentUser.name}</h2>
              <p className="text-purple-100 text-sm font-medium opacity-90 flex items-center">
                <MapPin className="h-3 w-3 mr-1" /> {currentUser.location}
              </p>
            </div>
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
          </div>
          
          {/* Shop Gallery */}
          <div className="mb-5 bg-black/10 p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200 mb-3 flex items-center">
              <Camera className="w-3 h-3 mr-1.5" /> Shop Gallery (Max 3)
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar items-center">
               {currentUser.shopImages?.map((img, i) => (
                 <div key={i} className="relative flex-shrink-0 group">
                   <img src={img} className="w-24 h-24 rounded-2xl object-cover border-2 border-white/30 shadow-lg group-hover:scale-105 transition-transform" />
                   <button 
                    onClick={() => removeShopImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-xl hover:bg-red-600 active:scale-90 transition-all border border-white/20"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
               ))}
               {(currentUser.shopImages?.length || 0) < 3 && (
                 <button 
                    onClick={() => shopFileInputRef.current?.click()}
                    className="w-24 h-24 bg-white/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/30 hover:bg-white/20 hover:border-white/50 transition-all flex-shrink-0 active:scale-95"
                 >
                    <Camera className="w-8 h-8 mb-2 text-white/80" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">ADD PHOTO</span>
                 </button>
               )}
               <input 
                  type="file" 
                  ref={shopFileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  multiple
                  onChange={handleShopImageUpload}
               />
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/20 p-3.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
            <Phone className="h-4 w-4 text-purple-200" />
            <span className="font-extrabold text-sm tracking-wide">+91 {currentUser.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="text-xl font-black text-gray-900 flex items-center">
          <Tag className="h-5 w-5 mr-2 text-purple-600" /> {t.products}
          {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin text-gray-300" />}
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-purple-100 hover:bg-purple-700 active:scale-95 transition-all flex items-center font-black text-xs uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1.5" /> {t.addProduct}
        </button>
      </div>

      <div className="space-y-4">
        {products.length === 0 && !loading ? (
          <div className="text-center py-20 bg-white/50 rounded-[2.5rem] border border-dashed border-gray-300">
            <div className="bg-gray-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
              <Box className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t.noResults}</p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-xl hover:border-purple-100 transition-all group">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-purple-50 rounded-2xl overflow-hidden flex items-center justify-center border border-purple-100 flex-shrink-0 shadow-inner">
                  {(product.images && product.images.length > 0) ? (
                    <img src={product.images[0]} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="h-8 w-8 text-purple-200" />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{product.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-purple-600 font-black uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                      {product.category === 'Seeds' ? t.seeds : 
                       product.category === 'Fertilizer' ? t.fertilizers : 
                       product.category === 'Pesticide' ? t.pesticides : t.tools}
                    </span>
                    {product.price && (
                      <span className="text-sm font-black text-agri-green">₹{product.price}</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteProduct(product.id)}
                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom duration-300 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t.addProduct}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2.5 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"><X className="h-6 w-6 text-gray-500"/></button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Product Name</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent font-bold transition-all" 
                  placeholder="e.g. Urea, Hybrid Rice Seeds" 
                  value={productForm.name} 
                  onChange={e => setProductForm({...productForm, name: e.target.value})} 
                />
              </div>

              {/* Product Photos */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Product Photos (Max 3)</label>
                <div className="flex flex-wrap gap-3 p-1">
                   {productForm.images.map((img, idx) => (
                     <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-100 shadow-md">
                        <img src={img} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeProductImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg border border-white/20"
                        >
                          <X className="w-3 h-3" />
                        </button>
                     </div>
                   ))}
                   {productForm.images.length < 3 && (
                     <button 
                       type="button"
                       onClick={() => productFileInputRef.current?.click()}
                       className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-all bg-gray-50 shadow-sm"
                     >
                       <Camera className="w-8 h-8 mb-1" />
                       <span className="text-[9px] font-black uppercase tracking-tighter">ADD</span>
                     </button>
                   )}
                   <input 
                      type="file" 
                      ref={productFileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleProductImageChange}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                  <select 
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-purple-600 font-bold appearance-none transition-all"
                    value={productForm.category}
                    onChange={e => setProductForm({...productForm, category: e.target.value as any})}
                  >
                    <option value="Seeds">{t.seeds}</option>
                    <option value="Fertilizer">{t.fertilizers}</option>
                    <option value="Pesticide">{t.pesticides}</option>
                    <option value="Tools">{t.tools}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Price (Opt)</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-purple-600 font-bold transition-all" 
                    placeholder="e.g. 500" 
                    value={productForm.price} 
                    onChange={e => setProductForm({...productForm, price: e.target.value})} 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-purple-200 mt-4 active:scale-95 transition-all transform hover:-translate-y-1">
                {t.addProduct}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDashboard;
