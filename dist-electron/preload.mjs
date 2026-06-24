"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  OPEN_FILE_DIALOG: "dialog:openFile",
  READ_FILE: "file:read",
  READ_ANNOTATION: "annotation:read",
  WRITE_ANNOTATION: "annotation:write",
  GET_CONFIG: "config:get",
  SET_CONFIG: "config:set",
  ADD_RECENT_FILE: "config:addRecent",
  ON_FILE_OPENED: "file:opened"
};
const api = {
  openFileDialog: () => electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG),
  readFile: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  readAnnotation: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.READ_ANNOTATION, filePath),
  writeAnnotation: (filePath, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.WRITE_ANNOTATION, filePath, data),
  getConfig: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  setConfig: (config) => electron.ipcRenderer.invoke(IPC_CHANNELS.SET_CONFIG, config),
  addRecentFile: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.ADD_RECENT_FILE, filePath),
  onFileOpened: (callback) => {
    const handler = (_event, file) => {
      callback(file);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_FILE_OPENED, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_FILE_OPENED, handler);
    };
  }
};
electron.contextBridge.exposeInMainWorld("mdtool", api);
