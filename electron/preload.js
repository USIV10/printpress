const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  auth: {
    login:          (c)  => ipcRenderer.invoke('auth:login', c),
    getUsers:       ()   => ipcRenderer.invoke('auth:getUsers'),
    createUser:     (u)  => ipcRenderer.invoke('auth:createUser', u),
    deleteUser:     (id) => ipcRenderer.invoke('auth:deleteUser', id),
    changePassword: (p)  => ipcRenderer.invoke('auth:changePassword', p),
  },
  stock: {
    getAll: ()  => ipcRenderer.invoke('stock:getAll'),
    upsert: (s) => ipcRenderer.invoke('stock:upsert', s),
  },
  email: {
    getSettings: ()      => ipcRenderer.invoke('email:getSettings'),
    saveSettings: (s)    => ipcRenderer.invoke('email:saveSettings', s),
    testSend: ()         => ipcRenderer.invoke('email:testSend'),
    sendNow: (date)      => ipcRenderer.invoke('email:sendNow', date),
  },
  jobs: {
    getAll:  ()    => ipcRenderer.invoke('jobs:getAll'),
    create:  (job) => ipcRenderer.invoke('jobs:create', job),
    update:  (job) => ipcRenderer.invoke('jobs:update', job),
    delete:  (id)  => ipcRenderer.invoke('jobs:delete', id),
  },
  momo: {
    getAll:  ()  => ipcRenderer.invoke('momo:getAll'),
    create:  (p) => ipcRenderer.invoke('momo:create', p),
    delete:  (id)=> ipcRenderer.invoke('momo:delete', id),
  },
});
