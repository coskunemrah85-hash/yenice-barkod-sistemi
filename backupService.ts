/**
 * GÜVENLİ VERİ YEDEKLEME VE GERİ YÜKLEME SERVİSİ
 * Tüm veritabanını dışa aktarır ve bulut senkronizasyon klasörlerine kaydedilebilir formata getirir.
 */

export const exportDatabaseToCloudFolder = async (appState: any, autoBackup = false): Promise<boolean> => {
    try {
        // Tüm verileri JSON formatına dönüştür
        const jsonData = JSON.stringify(appState, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;

        // Otomatik tarih ve saat damgası
        const date = new Date();
        const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours()}${date.getMinutes()}`;

        link.download = `Barkod_Sistemi_Tam_Yedek_${timestamp}${autoBackup ? '_OTO' : ''}.json`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log("✅ Veriler başarıyla yedeklendi.");
        return true;
    } catch (error) {
        console.error("❌ Yedekleme sırasında kritik hata:", error);
        return false;
    }
};

export const importDatabaseFromCloud = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const parsedData = JSON.parse(result);
                resolve(parsedData);
            } catch (error) {
                reject(new Error("Bozuk veya geçersiz yedekleme dosyası. Lütfen doğru dosyayı seçin."));
            }
        };
        reader.onerror = () => reject(new Error("Dosya sistemden okunamadı."));
        reader.readAsText(file);
    });
};