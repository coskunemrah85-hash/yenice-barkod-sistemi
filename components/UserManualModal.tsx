import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { getAppSupport } from '../services/geminiService';
import Markdown from 'react-markdown';

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const helpTopics = [
        {
            id: 'sales',
            title: 'Satış İşlemleri',
            icon: 'sale',
            content: `
### Satış Nasıl Yapılır?
1. **Ürün Ekleme:** Barkod okuyucu ile ürün barkodunu okutun veya arama kutusuna ürün adı/kodu yazarak ürünü seçin.
2. **Miktar Değiştirme:** Ürün satırındaki **+** ve **-** butonlarını kullanarak adedi güncelleyin.
3. **İskonto Uygulama:** "İskonto" butonuna basarak yüzde (%) veya tutar (₺) bazlı indirim yapabilirsiniz.
4. **Satışı Tamamlama:** Sağ alttaki "Satışı Tamamla" butonuna basın, ödeme yöntemini (Nakit/Kredi Kartı) seçin ve işlemi onaylayın.
5. **Fiş Yazdırma:** Satış tamamlandıktan sonra çıkan ekrandan fiş yazdırabilirsiniz.
            `
        },
        {
            id: 'products',
            title: 'Ürün ve Stok Yönetimi',
            icon: 'products',
            content: `
### Ürün Yönetimi İpuçları
- **Yeni Ürün:** "Yeni Ürün Ekle" butonu ile manuel giriş yapabilirsiniz.
- **AI Açıklama:** Ürün düzenleme ekranında "AI ile Açıklama Oluştur" butonuna basarak ürün özelliklerine uygun pazarlama metni hazırlatabilirsiniz.
- **Excel İşlemleri:** "Excel İşlemleri" menüsünden toplu ürün yükleyebilir veya mevcut stoğunuzu Excel'e aktarabilirsiniz.
- **Sütun Ayarları:** Tablo başlığındaki "Sütunlar" butonu ile görmek istemediğiniz bilgileri gizleyebilirsiniz.
            `
        },
        {
            id: 'purchase',
            title: 'Satın Alma ve Alış Faturası',
            icon: 'purchase',
            content: `
### Alış Faturası Oluşturma
- **Tedarikçi Seçimi:** Alış faturası ekranına girdiğinizde önce bir tedarikçi seçmelisiniz.
- **AI ile Fatura Yükleme:** Tedarikçiden gelen kağıt faturanın fotoğrafını çekip veya PDF dosyasını "AI ile Yükle" butonuna basarak sisteme yükleyebilirsiniz. Yapay zeka ürünleri, miktarları ve fiyatları otomatik tanıyacaktır.
- **Fiyat Kontrolü:** Faturayı kaydederken açılan pencerede ürünlerin alış fiyatlarını ve yeni satış fiyatlarını kontrol edip güncelleyebilirsiniz.
            `
        },
        {
            id: 'missing-list',
            title: 'Eksik Listesi ve AI Önerileri',
            icon: 'list-bullet',
            content: `
### Akıllı Eksik Listesi
- **AI Önerisi:** "Eksik Listesi" ekranında "AI ile Öneri Al" butonuna bastığınızda, sistem son 60 günlük satış hızınızı analiz ederek hangi üründen ne kadar sipariş vermeniz gerektiğini önerir.
- **Paylaşım:** Oluşturduğunuz listeyi WhatsApp veya E-posta butonları ile doğrudan tedarikçinize gönderebilirsiniz.
- **Kayıt:** Listeleri kaydederek "Geçmiş Listeler" sekmesinden daha sonra tekrar inceleyebilirsiniz.
            `
        },
        {
            id: 'reports',
            title: 'Raporlar ve AI Satış Koçu',
            icon: 'reports',
            content: `
### Verilerinizi Analiz Edin
- **Satış Geçmişi:** Tüm geçmiş satışlarınızı tarih ve ödeme yöntemine göre filtreleyebilirsiniz.
- **AI Satış Koçu:** Raporlar ekranındaki "AI Satış Koçu" butonu, satış verilerinizi analiz eder ve size "En çok satanlar", "Stok uyarısı" ve "Çapraz satış fırsatları" gibi konularda tavsiyeler verir.
            `
        }
    ];

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setAiResponse(null);
        setSelectedTopic(null);

        try {
            const response = await getAppSupport(searchQuery);
            setAiResponse(response);
        } catch (error) {
            setAiResponse("Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (aiResponse && scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [aiResponse]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                            <Icon name="help" className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Kullanma Kılavuzu & Destek</h2>
                            <p className="text-sm text-slate-500">Uygulamayı nasıl kullanacağınızı öğrenin veya AI asistanımıza sorun.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors">
                        <Icon name="x-circle" className="w-8 h-8" />
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto p-6 bg-slate-50/50">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Search Section */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Icon name="ai" className="w-5 h-5 text-purple-500" />
                                Yapay Zeka Destekli Arama
                            </h3>
                            <form onSubmit={handleSearch} className="relative">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Örn: Yapay zeka ile ürün yükleme nasıl yapılır?"
                                    className="w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-xl pl-4 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-300"
                                >
                                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="search" className="w-5 h-5" />}
                                </button>
                            </form>
                            <p className="mt-2 text-xs text-slate-400 italic">Uygulamanın herhangi bir özelliği hakkında soru sorabilirsiniz.</p>
                        </section>

                        {/* AI Response Section */}
                        {aiResponse && (
                            <section ref={scrollRef} className="bg-cyan-50 border border-cyan-100 p-6 rounded-xl animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-4 text-cyan-700 font-bold">
                                    <Icon name="ai" className="w-5 h-5" />
                                    AI Asistan Cevabı:
                                </div>
                                <div className="prose prose-slate max-w-none prose-sm prose-headings:text-cyan-800 prose-strong:text-cyan-900">
                                    <Markdown>{aiResponse}</Markdown>
                                </div>
                                <button 
                                    onClick={() => setAiResponse(null)}
                                    className="mt-4 text-xs text-cyan-600 hover:underline font-medium"
                                >
                                    Cevabı Temizle
                                </button>
                            </section>
                        )}

                        {/* Topics Grid */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-700 mb-4">Hızlı Yardım Konuları</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {helpTopics.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                                        className={`p-4 rounded-xl border text-left transition-all hover:shadow-md ${selectedTopic === topic.id ? 'bg-white border-cyan-500 ring-1 ring-cyan-500' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${selectedTopic === topic.id ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icon name={topic.icon as any} className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-slate-700">{topic.title}</span>
                                        </div>
                                        {selectedTopic === topic.id && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 prose prose-slate prose-sm max-w-none animate-fade-in">
                                                <Markdown>{topic.content}</Markdown>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                <footer className="p-4 border-t bg-slate-50 text-center text-xs text-slate-400">
                    Yenice İç Giyim - Akıllı Mağaza Yönetim Sistemi Yardım Merkezi (v1.0.4)
                </footer>
            </div>
            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default UserManualModal;
