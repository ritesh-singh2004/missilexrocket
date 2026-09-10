import React, { useEffect } from 'react';
import { useStore } from '../stores/useStore';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import EditorArea from './EditorArea';
import AIPanel from './AIPanel';
import BottomPanel from './BottomPanel';
import StatusBar from './StatusBar';
import WelcomeScreen from './WelcomeScreen';

export default function IDELayout() {
  const { currentProject, loadProjects, aiPanelOpen, bottomPanelOpen } = useStore();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {currentProject ? <EditorArea /> : <WelcomeScreen />}
          </div>
          {bottomPanelOpen && <BottomPanel />}
        </div>
        {aiPanelOpen && <AIPanel />}
      </div>
      <StatusBar />
    </div>
  );
}
