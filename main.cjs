const { app, BrowserWindow, shell, ipcMain, nativeTheme, dialog, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const http = require('http');
const fs = require('fs');
const os = require('os');

// Sarı güvenlik uyarılarını kapatır, konsolu temizler
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 1. KRİTİK: Erişim hatalarını önler ve versiyonlar arası veri sürekliliğini sağlar
app.setPath('userData', path.join(app.getPath('appData'), 'yenice-ic-giyim-barkod'));
app.setAppUserModelId('com.yeniceicgiyim.barkod');

// 2. KRİTİK: Çökmeleri engellemek için donanım hızlandırmayı kapat
app.disableHardwareAcceleration();

// 3. Tekil Örnek Kilidi (Aynı anda iki uygulamanın açılmasını ve kilitlenmeyi önler)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Birisi ikinci bir kopya açmaya çalışırsa, ana pencereye odaklan
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

let win;

// Otomatik güncelleme log ayarları
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function createWindow() {
  // İkon yolunu belirliyoruz (build/icon.ico dosyasını kullandık)
  const iconPath = path.join(__dirname, 'build', 'icon.ico');

  win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Yenice İç Giyim Barkod Sistemi",
    icon: iconPath, // <--- YENİ LOGO BURAYA EKLENDİ
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      sandbox: false,
      nativeWindowOpen: true,
      setWindowRect: true
    }
  });

  win.maximize();

  // Görev çubuğu ikonu için Windows uygulama kimliği
  if (process.platform === 'win32') {
    app.setAppUserModelId("com.yeniceicgiyim.barkod");
  }

  // GELİŞTİRİLMİŞ PENCERE YÖNETİMİ (GOOGLE GİRİŞ + FİŞ YAZDIRMA)
  win.webContents.setWindowOpenHandler(({ url }) => {
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
          icon: iconPath, // Pop-up pencerelere de ikonu ekliyoruz
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true, 
            nativeWindowOpen: true
          }
        }
      };
    }
    
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (app.isPackaged) {
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

    const port = 14532;
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        // Port kullanımda ise uyarı ver veya alternatif bir mantık kur
        // Ancak origin değişmemesi için portun sabit kalması kritik.
        console.error(`Port ${port} kullanımda! Veri tutarlılığı için port değişmemeli.`);
      }
    });
    server.listen(port, '0.0.0.0', () => {
      win.loadURL(`http://localhost:${port}`);
    });
  } else {
    win.loadURL('http://localhost:5173', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    });

    win.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        if (!win.isDestroyed()) win.loadURL('http://localhost:5173');
      }, 2000);
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
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
  
  // Türkçe Masaüstü Bildirimi
  const notification = new Notification({
    title: 'Güncelleme Hazır',
    body: 'Yeni sürüm başarıyla indirildi. Değişiklikleri uygulamak için lütfen uygulamayı yeniden başlatın.',
    icon: path.join(__dirname, 'build', 'icon.ico') // İkon yolu güncellendi
  });
  
  notification.on('click', () => {
    autoUpdater.quitAndInstall();
  });
  
  notification.show();
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('check_for_updates', async () => {
  if (win) {
    console.log('🔍 Manuel güncelleme kontrolü başlatıldı...');
    try {
      // checkForUpdatesAndNotify yerine checkForUpdates kullanarak İngilizce bildirimi engelliyoruz
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('❌ Güncelleme kontrolü hatası:', error);
      if (win) win.webContents.send('updater_error', 'Güncelleme kontrolü başarısız. Daha sonra tekrar deneyin.');
    }
  }
});

ipcMain.on('set-theme', (event, theme) => {
  nativeTheme.themeSource = theme;
});

// --- Universal Label Bridge (BarTender & Argox) ---
const { exec } = require('child_process');

ipcMain.on('print-to-label-software', (event, { engine, templatePath, data, appPath }) => {
  try {
    const isArgox = engine === 'argox';
    const tempFileName = isArgox ? 'argox_print_data.csv' : 'bartender_print_data.csv';
    const tempFilePath = path.join(app.getPath('temp'), tempFileName);
    
    // Create CSV content (Semicolon separated)
    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(item => Object.values(item).map(v => `"${v}"`).join(';')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    fs.writeFileSync(tempFilePath, '\ufeff' + csvContent, 'utf8');

    let finalPath = '';
    let command = '';

    if (isArgox) {
      // Argox Label Dr. default paths
      const possibleArgoxPaths = [
        appPath,
        'C:\\Program Files (x86)\\Argox\\Label Dr\\LabelDr.exe',
        'C:\\Argox\\LabelDr.exe'
      ].filter(Boolean);
      finalPath = possibleArgoxPaths.find(p => fs.existsSync(p));
      
      if (!finalPath) {
        event.reply('print-error', 'Argox Label Dr. (LabelDr.exe) bulunamadı.');
        return;
      }
      // Argox Command: LabelDr.exe /P "template" /D "data"
      command = `"${finalPath}" /P "${templatePath}" /D "${tempFilePath}"`;
    } else {
      // BarTender default paths
      const possibleBTPaths = [
        appPath,
        'C:\\Program Files\\Seagull\\BarTender 2022\\bartend.exe',
        'C:\\Program Files\\Seagull\\BarTender 2021\\bartend.exe',
        'C:\\Program Files\\Seagull\\BarTender 2019\\bartend.exe',
        'C:\\Program Files (x86)\\Seagull\\BarTender Suite\\bartend.exe'
      ].filter(Boolean);
      finalPath = possibleBTPaths.find(p => fs.existsSync(p));

      if (!finalPath) {
        event.reply('print-error', 'BarTender (bartend.exe) bulunamadı.');
        return;
      }
      // BarTender Command: bartend.exe /F="template" /D="data" /P /X
      command = `"${finalPath}" /F="${templatePath}" /D="${tempFilePath}" /P /X`;
    }
    
    exec(command, (error) => {
      if (error) {
        event.reply('print-error', 'Baskı hatası: ' + error.message);
      } else {
        event.reply('print-success', `${isArgox ? 'Argox' : 'BarTender'} baskı emri iletildi.`);
      }
    });

  } catch (err) {
    event.reply('print-error', 'Beklenmedik hata: ' + err.message);
  }
});

ipcMain.on('save-excel', async (event, { buffer, filename }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Excel Dosyasını Kaydet',
      defaultPath: path.join(app.getPath('downloads'), filename),
      filters: [
        { name: 'Excel Dosyaları', extensions: ['xlsx'] }
      ]
    });

    if (filePath) {
      fs.writeFileSync(filePath, Buffer.from(buffer));
      event.reply('save-excel-success', filePath);
    }
  } catch (err) {
    event.reply('save-excel-error', err.message);
  }
});

// --- Local Data Persistence Handlers ---
ipcMain.handle('save-data', async (event, { collection, data }) => {
  try {
    const dataDir = path.join(app.getPath('userData'), 'local_db');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    
    const filePath = path.join(dataDir, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Save error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-data', async (event, { collection }) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'local_db', `${collection}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error('Load error:', error);
    return null;
  }
});

ipcMain.handle('get-ip', async () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['localhost'];
});

ipcMain.handle('get-hostname', async () => {
  return os.hostname().toLowerCase() + '.local';
});

// Pencere kapatıldığında uygulamayı tamamen kapat (macOS hariç)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});