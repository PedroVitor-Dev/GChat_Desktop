/** Preload da janela oculta do player. Expõe só o necessário para tocar e medir áudio. */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  AudioChannel,
  type PlayRequest,
  type ProbeRequest,
  type ProbeResult,
} from '../shared/audio';

contextBridge.exposeInMainWorld('audioHost', {
  onPlay(listener: (req: PlayRequest) => void): void {
    ipcRenderer.on(AudioChannel.Play, (_e: IpcRendererEvent, req: PlayRequest) => listener(req));
  },
  onProbe(listener: (req: ProbeRequest) => void): void {
    ipcRenderer.on(AudioChannel.Probe, (_e: IpcRendererEvent, req: ProbeRequest) => listener(req));
  },
  probeResult(result: ProbeResult): void {
    ipcRenderer.send(AudioChannel.ProbeResult, result);
  },
});
