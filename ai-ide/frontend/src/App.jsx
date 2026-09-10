import React, { useEffect } from 'react';
import { useStore } from './stores/useStore';
import AuthScreen from './components/AuthScreen';
import IDELayout from './components/IDELayout';
import CommandPalette from './components/CommandPalette';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';

export default function App() {
  const { isAuthenticated, loadProfile, commandPaletteOpen, settingsOpen } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+P - Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        useStore.getState().toggleCommandPalette();
      }
      // Ctrl+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        useStore.getState().saveFile();
      }
      // Ctrl+` - Toggle Terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        useStore.getState().toggleBottomPanel();
      }
      // Ctrl+B - Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useStore.getState().setSidebarView(
          useStore.getState().sidebarView === 'files' ? null : 'files'
        );
      }
      // Ctrl+L - Focus AI Chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        useStore.getState().toggleAIPanel();
      }
      // Escape - Close modals
      if (e.key === 'Escape') {
        if (useStore.getState().commandPaletteOpen) {
          useStore.getState().toggleCommandPalette();
        }
      }
      // Ctrl+P - Quick Open
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: '#0d1117', color: '#e6edf3' }}>
      {!isAuthenticated ? <AuthScreen /> : <IDELayout />}
      {commandPaletteOpen && <CommandPalette />}
      {settingsOpen && <SettingsModal />}
      <ToastContainer />
    </div>
  );
}
