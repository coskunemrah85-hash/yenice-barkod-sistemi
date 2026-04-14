

import { GoogleGenAI, Part, Type } from "@google/genai";
import { SaleRecord, Product, PurchaseItem, Supplier } from '../types';

// @ts-ignore
const XLSX = window.XLSX;


const fileToGenerativePart = (file: File): Promise<Part> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();
    const isSpreadsheet = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    reader.onerror = error => reject(error);
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          return reject(new Error("Dosya boş veya okunamadı."));
        }
        if (isSpreadsheet) {
          let textContent = "";
          if (fileName.endsWith('.csv')) {
              textContent = data as string;
          } else { // xls, xlsx
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              textContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
          }
          resolve({ text: `File name: ${file.name}\n\n${textContent}` });
        } else { // Images, PDF
          const base64Data = (data as string).split(',')[1];
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    if (isSpreadsheet && !fileName.endsWith('.csv')) {
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.csv')){
      reader.readAsText(file, 'UTF-8');
    } else { // Images, PDF
      reader.readAsDataURL(file);
    }
  });
};

function parseAiJson(text: string): any {
    const trimmedText = text.trim();
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = trimmedText.match(jsonBlockRegex);
    let jsonString = trimmedText;
    
    if (match && match[1]) {
        jsonString = match[1];
    } else {
        const firstBracket = trimmedText.indexOf('[');
        const firstBrace = trimmedText.indexOf('{');
        
        let startIndex = -1;
        let endIndex = -1;
        
        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            startIndex = firstBracket;
            endIndex = trimmedText.lastIndexOf(']');
        } else if (firstBrace !== -1) {
            startIndex = firstBrace;
            endIndex = trimmedText.lastIndexOf('}');
        }
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonString = trimmedText.substring(startIndex, endIndex + 1);
        }
    }

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Gemini JSON parse error. Raw response:", text, "Attempted to parse:", jsonString, e);
        throw new Error("Yapay zeka, beklenmedik bir formatta yanıt verdi. Lütfen dosyanızın okunabilir olduğundan emin olun veya farklı bir dosya deneyin.");
    }
}

const getApiKey = () => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  return storedKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
};

export const generateProductDescription = async (productInfo: Partial<Product>): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API anahtarı bulunamadı.");
  }

  const details = [
    productInfo.name,
    productInfo.marka,
    productInfo.model,
    productInfo.renk,
    productInfo.beden
  ].filter(Boolean).join(', ');

  if (!details) {
    throw new Error("Açıklama oluşturmak için yeterli ürün bilgisi yok (isim, marka, model vb.).");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Sen "Yenice İç Giyim" adlı bir iç giyim mağazası için çalışan bir pazarlama metin yazarısın.
      Aşağıdaki ürün detaylarına dayanarak, Türkçe dilinde, çekici, şık ve ürünün özelliklerini (kumaş, his, görünüm vb.) vurgulayan bir ürün açıklaması yaz.
      Açıklama kısa ve öz olmalı, en fazla 2-3 cümle uzunluğunda olmalı.
      
      Ürün Detayları: ${details}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() ?? '';

  } catch (error) {
    console.error("Gemini Product Description Error:", error);
    if (error instanceof Error) {
        throw new Error(`Yapay Zeka açıklaması oluşturulurken hata oluştu: ${error.message}`);
    }
    throw new Error("Yapay Zeka açıklaması oluşturulurken bilinmeyen bir hata oluştu.");
  }
};

export const getSalesCoaching = async (salesData: SaleRecord[], products: Product[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API anahtarı bulunamadı.");
  }
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSales = salesData.filter(s => new Date(s.date) > thirtyDaysAgo);
  if (recentSales.length === 0) {
    return "Son 30 günde analiz edilecek yeterli satış verisi bulunmuyor.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const salesSummary = recentSales.map(s => ({
        date: s.date,
        total: s.total,
        itemCount: s.items.length,
        items: s.items.map(i => ({ name: i.name, barcode: i.barcode, quantity: i.quantity, price: i.price }))
    }));

    const productsSummary = products.map(p => ({
        barcode: p.barcode,
        name: p.name,
        stock: p.stock,
        buyPrice: p.buyPrice,
        price: p.price
    }));

    const prompt = `
      You are an expert sales coach for a lingerie store named "Yenice İç Giyim".
      Analyze the provided sales data from the last 30 days and the current stock levels.
      Provide actionable insights and suggestions in Turkish.
      Format your response using markdown with clear headings.

      **Your analysis should include:**
      1.  **Top Performers:** Identify the top 3 best-selling products by quantity. For each, mention its current stock. If any of these are low on stock (10 or fewer units), highlight this as a critical warning and recommend reordering immediately.
      2.  **Underperformers:** Identify the 3 worst-selling products (or products that haven't sold at all). Suggest a simple, actionable promotional idea for one of them (e.g., "Bu hafta 2. ürüne %50 indirim yapmayı deneyin.").
      3.  **Cross-Sell Opportunities:** Analyze if any products are frequently bought together in the same transaction. If you find a pattern, suggest it as a cross-selling opportunity (e.g., "Dantelli Bralet alan müşteriler genellikle uyumlu Külot da alıyor. Bu ürünleri birlikte sergilemeyi düşünün."). If no strong pattern exists, state that.
      4.  **A Concluding Remark:** End with a short, encouraging summary.

      Here is the sales data (last 30 days):
      \`\`\`json
      ${JSON.stringify(salesSummary)}
      \`\`\`

      Here is the current product stock data:
      \`\`\`json
      ${JSON.stringify(productsSummary)}
      \`\`\`
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text ?? '';
  } catch (error) {
    console.error("Gemini Sales Coach Error:", error);
    if (error instanceof Error) {
        throw new Error(`Yapay Zeka analizi sırasında bir hata oluştu: ${error.message}`);
    }
    throw new Error("Yapay Zeka analizi sırasında bilinmeyen bir hata oluştu.");
  }
};


export const extractProductsFromContent = async (
    file: File, 
    prompt: string
): Promise<Partial<Product>[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const filePart = await fileToGenerativePart(file);

        const fullPrompt = `
            You are an intelligent and meticulous data entry assistant for an underwear store. Your task is to extract product details from the provided file and return them as a valid JSON array of objects. Be extremely careful and accurate.

            Here is the user's request: "${prompt}"

            Key Instructions:
            1.  **Focus on Detail:** For each unique product variant (e.g., a specific size and color combination), create one JSON object.
            2.  **Ignore Headers/Summaries:** The source data might have header rows that apply to several following variant rows (e.g., a row with a main product code and name, followed by rows for specific sizes/colors). Use the header info for the variants, but **do not** create a JSON object for the header row itself. Also, ignore any summary rows, totals, or non-product text.
            3.  **Validate Rows:** Only create an object for a product variant if it has a unique identifier ('barcode' or 'stokKodu'). Ignore rows that seem like comments, summaries, or incomplete entries without these identifiers.
            4.  **Extract Fields:** Extract these fields: "barcode", "name", "price", "buyPrice", "stock", "stokKodu", "marka", "model", "renk", "beden", "anaStokKodu", "group", "midGroup", "subGroup".
            5.  **Clean Data:**
                - "price", "buyPrice", and "stock" MUST be numbers. Convert values like "1.234,56 TL" to \`1234.56\`. If a value is not a valid number, omit the field.
                - "barcode" must be a string of digits. Remove any non-digit characters.
            6.  **Omit Missing Data:** If a value for a field is not found or invalid, omit the key from the JSON object. Do not use \`null\` or empty strings.
            7.  **Generate "name":** Construct a descriptive name if not explicitly given, e.g., "{marka} {model} {renk} {beden}".
            8.  **Generate "anaStokKodu":** If "anaStokKodu" is missing, derive it from "stokKodu" by taking the part before the last two dashes (e.g., from "1113-EBRU-D.SÜZ-SİYAH-80", derive "1113-EBRU-D.SÜZ").

            Your response must be ONLY a single, valid JSON array of objects. Do not include any other text, explanations, or markdown fences.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, {text: fullPrompt}] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            barcode: { type: Type.STRING, description: 'Ürünün barkodu (sadece rakamlar).' },
                            name: { type: Type.STRING, description: 'Ürünün tam adı.' },
                            buyPrice: { type: Type.NUMBER, description: 'Ürünün alış fiyatı.' },
                            price: { type: Type.NUMBER, description: 'Ürünün satış fiyatı.' },
                            stock: { type: Type.NUMBER, description: 'Ürünün stok adedi (miktar).' },
                            stokKodu: { type: Type.STRING, description: 'Varyanta özel stok kodu (örn: YN-KL-001).' },
                            marka: { type: Type.STRING, description: 'Ürünün markası.' },
                            model: { type: Type.STRING, description: 'Ürünün modeli.' },
                            renk: { type: Type.STRING, description: 'Ürünün rengi.' },
                            beden: { type: Type.STRING, description: 'Ürünün bedeni.' },
                            anaStokKodu: { type: Type.STRING, description: 'Ürün grubuna ait ana stok kodu (örn: YN-KL).' },
                            group: { type: Type.STRING, description: 'Ürünün ana grubu.' },
                            midGroup: { type: Type.STRING, description: 'Ürünün ara grubu.' },
                            subGroup: { type: Type.STRING, description: 'Ürünün alt grubu.' },
                        },
                    },
                },
            },
        });
        
        const products = parseAiJson(response.text ?? '');

        if (!Array.isArray(products)) {
            throw new Error("AI did not return a valid product array.");
        }
        return products;

    } catch (error) {
        console.error("Gemini Product Extraction Error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("AI ürün çıkarma sırasında bilinmeyen bir hata oluştu.");
    }
};


export const extractPurchaseItemsFromContent = async (
    file: File, 
    prompt: string
): Promise<Partial<PurchaseItem>[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const filePart = await fileToGenerativePart(file);

        const fullPrompt = `
            You are an intelligent and meticulous data entry assistant for an underwear store processing a supplier's invoice or product list.
            Your task is to extract purchase item details from the provided file and return them as a valid JSON array of objects. Be extremely careful and accurate.

            Here is the user's request: "${prompt}"

            Key Instructions:
            1.  **Identify Headers**: If the file is a spreadsheet (CSV, Excel), the first row likely contains headers. Use these headers to identify the columns for the fields below. For example, 'Adet' or 'Miktar' should map to "quantity".
            2.  **Extract Fields**: For each item, extract: "barcode", "stokKodu", "name", "quantity" (look for headers like 'adet', 'miktar', 'quantity'), and "buyPrice" (look for 'birim alış fiyatı', 'fiyat', 'buy price').
            3.  **Validate Rows**: Only process rows that look like actual products. Ignore any rows that are headers, footers, summaries, totals, empty lines, or do not represent a distinct purchasable item with a quantity.
            4.  **Critical Data**: 'quantity' and 'buyPrice' are the most important. They MUST be numbers. Convert values like "1.234,56 TL" to \`1234.56\`. If 'quantity' is missing or not a valid number for a row, skip that row entirely. If 'buyPrice' is missing, you can still include the item but prioritize finding it.
            5.  **Prioritize Identifiers**: The most important identifiers are 'barcode' and 'stokKodu'. Try to find at least one for each item.
            6.  **Omit Missing Data**: If a field is not available in the document, omit it from the JSON object for that item. Do not use \`null\` or empty strings.
            
            Your response must be ONLY a single, valid JSON array of objects. Do not include any other text, explanations, or markdown fences.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, {text: fullPrompt}] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            barcode: { type: Type.STRING, description: 'Ürünün barkodu.' },
                            stokKodu: { type: Type.STRING, description: 'Ürünün stok kodu.' },
                            name: { type: Type.STRING, description: 'Ürünün adı.' },
                            quantity: { type: Type.NUMBER, description: 'Satın alınan adet (miktar).' },
                            buyPrice: { type: Type.NUMBER, description: 'Birim alış fiyatı.' },
                        },
                        required: ["quantity"],
                    },
                },
            },
        });
        
        const items = parseAiJson(response.text ?? '');

        if (!Array.isArray(items)) {
            throw new Error("AI did not return a valid item array.");
        }
        return items;

    } catch (error) {
        console.error("Gemini Purchase Item Extraction Error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("AI fatura okuma sırasında bilinmeyen bir hata oluştu.");
    }
};


export const extractSuppliersFromContent = async (
    file: File, 
    prompt: string
): Promise<Partial<Supplier>[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const filePart = await fileToGenerativePart(file);

        const fullPrompt = `
            You are an intelligent and meticulous data entry assistant. Your task is to extract supplier (tedarikçi) information from the provided document (business card, invoice, list etc.) and return it as a JSON array of objects. Be extremely careful and accurate.

            User's request: "${prompt}"

            Key Instructions:
            1.  **Extract Fields:** For each supplier found, extract: "name", "code", "firstName", "lastName", "mobilePhone", "whatsapp", "email", "taxOffice", "taxNumber", "nationalId", "city", "district".
            2.  **Most Important Field:** The "name" (company name / tedarikçi ünvanı) is the most critical field. If you cannot find a name, do not create an entry.
            3.  **Clean Data:** Remove prefixes like "Tel:", "Email:". Format phone numbers consistently. Do not include irrelevant text.
            4.  **Handle Multiple:** If the document contains a list of suppliers, create an object for each one. If it's about a single supplier (like a business card), return an array with one object.
            
            Return ONLY a valid JSON array of objects. Do not include markdown or any other text.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, {text: fullPrompt}] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: 'Tedarikçi firma ünvanı.' },
                            code: { type: Type.STRING, description: 'Cari kodu.' },
                            firstName: { type: Type.STRING, description: 'Yetkili adı.' },
                            lastName: { type: Type.STRING, description: 'Yetkili soyadı.' },
                            mobilePhone: { type: Type.STRING, description: 'Cep telefonu.' },
                            whatsapp: { type: Type.STRING, description: 'WhatsApp numarası.' },
                            email: { type: Type.STRING, description: 'E-posta adresi.' },
                            taxOffice: { type: Type.STRING, description: 'Vergi dairesi.' },
                            taxNumber: { type: Type.STRING, description: 'Vergi numarası.' },
                            nationalId: { type: Type.STRING, description: 'T.C. Kimlik Numarası.' },
                            city: { type: Type.STRING, description: 'İl.' },
                            district: { type: Type.STRING, description: 'İlçe.' },
                        },
                        required: ["name"],
                    },
                },
            },
        });
        
        const suppliers = parseAiJson(response.text ?? '');

        if (!Array.isArray(suppliers)) {
            throw new Error("AI did not return a valid supplier array.");
        }
        return suppliers;

    } catch (error) {
        console.error("Gemini Supplier Extraction Error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("AI tedarikçi bilgisi çıkarma sırasında bilinmeyen bir hata oluştu.");
    }
};

export const analyzeSalesData = async (query: string, salesData: SaleRecord[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "API anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const salesDataString = JSON.stringify(salesData, null, 2);

    const prompt = `
      You are a helpful sales analysis assistant for an underwear store called "Yenice İç Giyim".
      Your task is to analyze the provided sales data and answer the user's question.
      The current date is ${new Date().toLocaleDateString('tr-TR')}.
      Provide clear, concise, and insightful answers in Turkish. Format your response using markdown.
      
      Here is the sales data in JSON format:
      \`\`\`json
      ${salesDataString}
      \`\`\`
 
      Here is the user's question:
      "${query}"

      Please provide your analysis based on the data.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text ?? '';
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error instanceof Error) {
        return `AI Analizi sırasında bir hata oluştu: ${error.message}`;
    }
    return "AI Analizi sırasında bilinmeyen bir hata oluştu.";
  }
};

export const generateLowStockReport = async (
    products: Product[], 
    salesHistory: SaleRecord[],
    threshold: number
): Promise<{ barcode: string; suggestedQuantity: number; reason: string }[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı.");
    }

    const lowStockProducts = products.filter(p => p.stock <= threshold && !p.isDeleted);
    if (lowStockProducts.length === 0) return [];

    const productsSummary = lowStockProducts.map(p => ({
        barcode: p.barcode,
        name: p.name,
        stock: p.stock,
        price: p.price,
        stokKodu: p.stokKodu,
        marka: p.marka,
        model: p.model,
        renk: p.renk,
        beden: p.beden
    }));

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const relevantSales = salesHistory
        .filter(s => new Date(s.date) > sixtyDaysAgo)
        .map(s => ({
            date: s.date,
            items: s.items
                .filter(i => lowStockProducts.some(lp => lp.barcode === i.barcode))
                .map(i => ({ barcode: i.barcode, quantity: i.quantity }))
        }))
        .filter(s => s.items.length > 0);

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            You are a smart inventory manager for "Yenice İç Giyim". 
            Analyze the following low-stock products and their recent sales history (last 60 days).
            Suggest an optimal order quantity for each product to maintain stock for the next 30 days.
            
            Consider:
            - Sales velocity (how fast it sells).
            - Current stock level.
            - Product attributes (Brand, Model, Color, Size) to identify popular trends or essential variants.
            - If a product hasn't sold recently but is low, suggest a minimum safety stock (e.g., 6 or 12).
            - If it sells fast, suggest more.
            
            Return ONLY a valid JSON array of objects with these fields:
            - "barcode": string
            - "suggestedQuantity": number (integer)
            - "reason": string (short explanation in Turkish, e.g., "Hızlı satılıyor", "Minimum stok")
            
            Low Stock Products:
            ${JSON.stringify(productsSummary)}
            
            Recent Sales History:
            ${JSON.stringify(relevantSales)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            barcode: { type: Type.STRING },
                            suggestedQuantity: { type: Type.NUMBER },
                            reason: { type: Type.STRING }
                        },
                        required: ["barcode", "suggestedQuantity", "reason"]
                    }
                }
            }
        });

        return parseAiJson(response.text ?? '');
    } catch (error) {
        console.error("Gemini Low Stock Report Error:", error);
        throw error;
    }
};

export const getAppSupport = async (userQuery: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı.");
    }

    const appFeaturesContext = `
        Uygulama Özellikleri ve Kullanım Klavuzu:
        
        1. GÖSTERGE PANELİ (DASHBOARD):
           - Günlük satışları, en çok satan ürünleri ve stok durumunu özet olarak görebilirsiniz.
        
        2. SATIŞ EKRANI:
           - Barkod okutarak veya ürün adı/kodu ile arama yaparak ürün ekleyebilirsiniz.
           - Ürün miktarlarını +/- butonları ile değiştirebilirsiniz.
           - İskonto (yüzde veya tutar) uygulayabilirsiniz.
           - Satışı askıya alabilir (bekletebilir) ve sonra devam edebilirsiniz.
           - Nakit veya Kredi Kartı ile satışı tamamlayabilirsiniz.
           - Satış sonunda fiş yazdırabilirsiniz.
        
        3. ÜRÜN YÖNETİMİ:
           - Yeni ürün ekleyebilir, mevcut ürünleri düzenleyebilir veya silebilirsiniz.
           - "Yapay Zeka ile Açıklama Oluştur" butonu ile ürün detaylarına göre otomatik pazarlama metni yazdırabilirsiniz.
           - Excel'den toplu ürün yükleyebilir veya mevcut listeyi Excel'e aktarabilirsiniz.
           - Sütunları özelleştirebilir, ihtiyacınız olmayan sütunları gizleyebilirsiniz.
        
        4. SATIN ALMA (ALIŞ FATURASI):
           - Tedarikçi seçerek alış faturası oluşturabilirsiniz.
           - "AI ile Yükle" butonu sayesinde tedarikçiden gelen fatura görselini veya PDF dosyasını yükleyerek ürünleri otomatik olarak faturaya ekleyebilirsiniz.
           - Excel'den alış faturası içe aktarabilirsiniz.
           - Faturayı kaydetmeden önce "Fiyat Kontrolü" ekranında alış ve satış fiyatlarını güncelleyebilir, kar marjınızı görebilirsiniz.
           - Satın alınan ürünler için barkod etiketi yazdırabilirsiniz.
        
        5. EKSİK LİSTESİ:
           - "AI ile Öneri Al" butonu ile yapay zekanın satış hızınıza ve stok durumunuza göre hangi üründen ne kadar sipariş vermeniz gerektiğini hesaplamasını sağlayabilirsiniz.
           - Oluşturulan listeleri WhatsApp veya E-posta üzerinden tedarikçiye gönderebilirsiniz.
           - Listeleri PDF veya Excel olarak indirebilirsiniz.
           - Geçmiş eksik listelerini "Geçmiş Listeler" sekmesinden görebilirsiniz.
        
        6. RAPORLAR VE ANALİZ:
           - Satış ve alış geçmişini detaylı olarak inceleyebilirsiniz.
           - "AI Satış Koçu" özelliği ile yapay zekadan satışlarınızı artırmak için tavsiyeler alabilirsiniz.
           - Kar/zarar analizi yapabilirsiniz.
        
        7. TANIMLAMALAR:
           - Marka, Model, Renk, Beden, Ürün Grupları, Tedarikçiler ve Müşterileri buradan yönetebilirsiniz.
        
        8. AYARLAR:
           - Firma bilgilerinizi, uygulama başlığını ve diğer sistem ayarlarını güncelleyebilirsiniz.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            Sen "Yenice İç Giyim" Barkodlu Satış ve Stok Yönetim Sistemi için bir yardım asistanısın.
            Kullanıcının uygulama hakkındaki sorularını aşağıda verilen uygulama özellikleri bağlamında cevapla.
            Cevapların net, öğretici ve adım adım (liste şeklinde) olsun. 
            Eğer kullanıcı bir özelliği nasıl kullanacağını soruyorsa, ona hangi menüye gitmesi gerektiğini ve hangi butonlara basması gerektiğini anlat.
            Cevaplarını her zaman Türkçe ver ve markdown formatını kullan.

            Uygulama Bağlamı:
            ${appFeaturesContext}

            Kullanıcı Sorusu:
            "${userQuery}"
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });

        return response.text ?? "Üzgünüm, bu konuda yardımcı olamadım. Lütfen sorunuzu farklı bir şekilde sormayı deneyin.";
    } catch (error) {
        console.error("Gemini App Support Error:", error);
        throw error;
    }
};

export const extractPriceUpdatesFromContent = async (
    file: File, 
    prompt: string
): Promise<{ barcode?: string; stokKodu?: string; newBuyPrice: number; name?: string }[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const filePart = await fileToGenerativePart(file);

        const fullPrompt = `
            You are an intelligent and meticulous data entry assistant. Your task is to extract product price updates from the provided document (Excel, CSV, etc.) and return them as a JSON array of objects.
            
            User's request: "${prompt}"

            Key Instructions:
            1.  **Extract Fields:** For each product found, extract: "barcode", "stokKodu", "newBuyPrice", "name".
            2.  **Required Field:** "newBuyPrice" is the most critical field. It MUST be a number. Convert values like "1.234,56 TL" to \`1234.56\`. If you cannot find a price for a row, do not create an entry for it.
            3.  **Identifiers:** Try to find "barcode" or "stokKodu" to identify the product. If both are missing, use "name" as a fallback.
            4.  **Clean Data:** Remove any currency symbols or non-numeric characters from the price.
            
            Return ONLY a valid JSON array of objects. Do not include markdown or any other text.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [filePart, {text: fullPrompt}] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            barcode: { type: Type.STRING, description: 'Ürünün barkodu.' },
                            stokKodu: { type: Type.STRING, description: 'Ürünün stok kodu.' },
                            newBuyPrice: { type: Type.NUMBER, description: 'Yeni alış fiyatı.' },
                            name: { type: Type.STRING, description: 'Ürün adı (eşleştirme için yardımcı).' },
                        },
                        required: ["newBuyPrice"],
                    },
                },
            },
        });
        
        const updates = parseAiJson(response.text ?? '');

        if (!Array.isArray(updates)) {
            throw new Error("AI did not return a valid update array.");
        }
        return updates;

    } catch (error) {
        console.error("Gemini Price Update Extraction Error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("AI fiyat güncelleme bilgisi çıkarma sırasında bilinmeyen bir hata oluştu.");
    }
};
