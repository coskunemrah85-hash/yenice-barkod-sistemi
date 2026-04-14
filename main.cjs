const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const http = require('http');
const fs = require('fs');

// Sarı güvenlik uyarılarını kapatır, konsolu temizler
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 1. KRİTİK: Erişim hatalarını önler
app.setPath('userData', path.join(app.getPath('appData'), 'yenice-ic-giyim-barkod-dev'));

// 2. KRİTİK: Çökmeleri engellemek için donanım hızlandırmayı kapat
app.disableHardwareAcceleration();

let win;

// Otomatik güncelleme log ayarları
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Yenice İç Giyim Barkod Sistemi",
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      sandbox: false,
      // Yeni nesil Electron sürümlerinde pop-up desteği için:
      nativeWindowOpen: true,
      setWindowRect: true
    }
  });

  win.maximize();

  // GELİŞTİRİLMİŞ PENCERE YÖNETİMİ (GOOGLE GİRİŞ + FİŞ YAZDIRMA)
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Yazdırma (about:blank) veya Google/Firebase adreslerine izin ver
    if (
      url.includes('accounts.google.com') || 
      url.includes('firebaseapp.com') || 
      url === 'about:blank' || 
      url.startsWith('blob:')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 800,
          height: 700,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, // Google ve güvenli pencereler için şart
            nativeWindowOpen: true
          }
        }
      };
    }
    
    // Bunlar dışındaki linkleri (web siteleri vb.) varsayılan tarayıcıda aç
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Uygulama paketlenmiş (exe) ise derlenmiş HTML dosyasını, değilse localhost'u yükle
  if (app.isPackaged) {
    // Firebase Google Auth'un "file://" protokolünde çalışmaması (yetkisiz alan adı) hatasını
    // çözmek için dosyaları rastgele bir localhost portunda sunan mini bir sunucu başlatıyoruz.
    const server = http.createServer((req, res) => {
      let reqUrl = decodeURIComponent(req.url.split('?')[0]);
      if (reqUrl === '/') reqUrl = '/index.html';
      
      let filePath = path.join(__dirname, 'dist', reqUrl);
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
          '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
          '.ico': 'image/x-icon', '.json': 'application/json'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(data);
      });
    });

    // Sabit bir port kullanıyoruz ki localStorage, IndexedDB ve Firebase Oturum bilgileri silinmesin.
    // Port rastgele olursa her açılışta adres değişir ve kullanıcı hep çıkış yapmış olur.
    let port = 14532;
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        port++;
        server.listen(port, '127.0.0.1');
      }
    });
    server.listen(port, '127.0.0.1', () => {
      win.loadURL(`http://localhost:${port}`);
    });
  } else {
    // Vite adresini yükle
    win.loadURL('http://localhost:5173', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    });

    // Geliştirme aşamasında sayfa yüklenemezse otomatik tazele
    win.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        if (!win.isDestroyed()) win.loadURL('http://localhost:5173');
      }, 2000);
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Uygulama paketlenmişse (production) güncellemeleri kontrol et
  if (app.isPackaged) {
    // React arayüzünün tamamen yüklenmesi ve bildirimi dinlemeye başlaması için
    // güncelleme kontrolünü 5 saniye geciktirerek başlatıyoruz.
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  }
});

autoUpdater.on('checking-for-update', () => {
  if (win) win.webContents.send('updater_status', 'Güncellemeler kontrol ediliyor...');
});

autoUpdater.on('update-available', () => {
  if (win) win.webContents.send('update_available');
});

autoUpdater.on('update-not-available', () => {
  if (win) win.webContents.send('updater_status', 'Sistem güncel. Yeni sürüm bulunamadı.');
  setTimeout(() => { if (win) win.webContents.send('updater_hide'); }, 4000);
});

autoUpdater.on('error', (err) => {
  if (win) win.webContents.send('updater_error', 'Güncelleme Hatası: ' + err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "İndiriliyor: %" + Math.round(progressObj.percent);
  if (win) win.webContents.send('updater_status', log_message);
});

autoUpdater.on('update-downloaded', () => {
  if (win) win.webContents.send('update_downloaded');
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('check_for_updates', async () => {
  if (win) {
    console.log('🔍 Manuel güncelleme kontrolü başlatıldı...');
    try {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      if (result && !result.updateInfo) {
        console.log('✅ Sistem güncel, yeni sürüm yok.');
      }
    } catch (error) {
      console.error('❌ Güncelleme kontrolü hatası:', error);
      if (win) win.webContents.send('updater_error', 'Güncelleme kontrolü başarısız. Daha sonra tekrar deneyin.');
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});