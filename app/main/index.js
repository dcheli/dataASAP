import path from 'path';
import { app, crashReporter, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
//import mainTemplate from './menuTemplate';
import Store from './Store';


const isDevelopment = process.env.NODE_ENV === 'development';
const fs = require('fs');

let mainWindow = null;
let configWindow = null;
let forceQuit = false;


require('electron-context-menu')({
    prepend: (params, browserWindow) => [{
        label: 'Rainbow',
        // Only show it when right-clicking images
        visible: params.mediaType === 'image'
    }]
});

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  for (const name of extensions) {
    try {
      await installer.default(installer[name], forceDownload);
    } catch (e) {
      console.log(`Error installing ${name} extension: ${e.message}`);
    }
  }
};



function createConfigWindow(type) {
    console.log("Creating config window with ", type);
    configWindow = new BrowserWindow({
        width: 1200,
        height: 1000,
         title: "Config Stuff"
    });

    const configMenu = Menu.buildFromTemplate(configTemplate);
    var dir = path.resolve(path.join(__dirname, '../renderer/config.html'));
    configWindow.webContents.openDevTools();
    configWindow.loadURL(`${dir}#/${type}`);
    configWindow.setMenu(configMenu);
}

crashReporter.start({
  productName: 'YourName',
  companyName: 'YourCompany',
  submitURL: 'https://your-domain.com/url-to-submit',
  uploadToServer: false,
});
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    show: false,
    webPreferences: {
        backgroundThrottling: false
    }
  });
  
  const menu = Menu.buildFromTemplate(mainTemplate);
  Menu.setApplicationMenu(menu);
  mainWindow.webContents.openDevTools();
 
  
  mainWindow.loadFile(path.resolve(path.join(__dirname, '../renderer/index.html')));
  mainWindow.on('closed', () => { app.quit() });


  // show window once on first load
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();
  });


  mainWindow.webContents.on('did-finish-load', () => {
    // Handle window logic properly on macOS:
    // 1. App should not terminate if window has been closed
    // 2. Click on icon in dock should re-open the window
    // 3. ⌘+Q should close the window and quit the app
    if (process.platform === 'darwin') {
      mainWindow.on('close', function(e) {
        if (!forceQuit) {
          e.preventDefault();
          mainWindow.hide();
        }
      });
      app.on('browser-window-focus', () => {
          console.log("Calling browser-window-focus");
        createMainMenu();
      });

      app.on('activate', () => {
        mainWindow.show();
      });

      app.on('before-quit', () => {
        forceQuit = true;
      });
    } else {
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
    }
  });

  if (isDevelopment) {
    // auto-open dev tools
    mainWindow.webContents.openDevTools();

    // add inspect element on right click menu
    /*mainWindow.webContents.on('context-menu', (e, props) => {
      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click() {
            mainWindow.inspectElement(props.x, props.y);
          },
        },
      ]).popup(mainWindow);
    });*/
  }
});


ipcMain.on('saveConfig', (event, domain, type, content) => {
    console.log("Saving  with type ", type);
    const store = new Store({
        configName : 'user-preferences',
        domain: domain,
        content: {}
    });
    
    store.set(type, content);
});

ipcMain.on('folder:open', (event, content) => {
    
  
    // WE DON"T KNOW WHAT VALUE CONTENT IS
    dialog.showSaveDialog((fileName) => {
        //http://mylifeforthecode.com/getting-started-with-standard-dialogs-in-electron/
  
          if(fileName === undefined) {
              console.log("you did not enter a file name");
              return;
          }
  
          var rawContent;
          if(content.indexOf("?xml")> -1) {
              rawContent = content;
          } else {
            rawContent = content.replace(/<[^>]+>/g, ""); // I think this replaces HTML tags
          }
          
          fs.writeFile(fileName, rawContent, (error) => {  
              if(null){ 
                  console.log("Error Saving File ", error);
                  // maybe pop up an alert
              }
          });
          
      });
  });

/////////////////////////
  

////////////////////////

  const configTemplate = [
    { role: 'Close' }
    ];

  const mainTemplate = [
    {
        label: 'File',
        submenu: [
            {role: 'quit'}
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            {role: 'pasteandmatchstyle'},
            {role: 'delete'},
            {role: 'selectall'}
    ]
    },
    {
        label: 'View',
        submenu: [
            {role: 'reload'},
            {role: 'forcereload'},
            {role: 'toggledevtools'},
            {type: 'separator'},
            {role: 'resetzoom'},
            {role: 'zoomin'},
            {role: 'zoomout'},
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    },
    {
        role: 'Window',
        submenu: [
            {role: 'minimize'}
        ]
    },
    {
        label: 'Config',
        submenu: [
            {
            label: 'Deidentify',
            submenu: [
                {
                    label:'NCPDP',        
                    submenu:[
                    {
                        label: "NCPDP D.0",
                        click()  { createConfigWindow("NCPDP_D0");  }
                    },
                    { 
                        label: "SCRIPT 10.6",
                        click()  { createConfigWindow("SCRIPT_10_6");  }
                    }
                    ]
                },
                {label: "X12"},
            
                {label: "Hl7"}
            ]
            }
        ]
    },
    {
        role: 'Help',
        submenu: [
            {
            label: 'Learn More',
            click () { require('electron').shell.openExternal('https://electronjs.org') }
            }
        ]
    }
];



if (process.platform === 'darwin') {
    template.unshift({
      //label: app.getName(),
      label: "DataASAP",
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {role: 'services', submenu: []},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    })
  
    // Edit menu
    template[1].submenu.push(
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'}
        ]
      }
    )
  
    // Window menu
    template[3].submenu = [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'}
    ]

}