import React, { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../stores/useStore';

function EditorTabs() {
  const { openFiles, activeFile, setActiveFile, closeFile } = useStore();

  return (
    <div style={{
      display: 'flex', background: '#0d1117', borderBottom: '1px solid #30363d',
      overflowX: 'auto', flexShrink: 0
    }}>
      {openFiles.map(file => (
        <div
          key={file.path}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            background: activeFile?.path === file.path ? '#161b22' : 'transparent',
            borderRight: '1px solid #30363d', cursor: 'pointer', fontSize: '12px',
            color: activeFile?.path === file.path ? '#e6edf3' : '#8b949e',
            borderBottom: activeFile?.path === file.path ? '2px solid #58a6ff' : '2px solid transparent',
            whiteSpace: 'nowrap', minWidth: 0
          }}
          onClick={() => setActiveFile(file)}
        >
          <span style={{ color: file.modified ? '#d29922' : 'inherit' }}>{file.name}</span>
          <div
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex' }}
            onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EditorArea() {
  const { activeFile, updateFileContent, editorLanguage } = useStore();
  const editorRef = useRef(null);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('ai-ide-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b2208',
        'editor.selectionBackground': '#264f7826',
        'editorCursor.foreground': '#58a6ff',
        'editor.selectionHighlightBackground': '#58a6ff1a',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#e6edf3',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#30363d',
        'editorWidget.background': '#161b22',
        'editorWidget.border': '#30363d',
        'input.background': '#0d1117',
        'input.border': '#30363d',
        'focusBorder': '#58a6ff',
        'scrollbar.shadow': '#00000000',
        'scrollbarSlider.background': '#30363d80',
        'scrollbarSlider.hoverBackground': '#484f58aa',
        'scrollbarSlider.activeBackground': '#484f58dd',
      }
    });
    monaco.editor.setTheme('ai-ide-dark');

    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => useStore.getState().saveFile()
    });
  }, []);

  const handleChange = useCallback((value) => {
    updateFileContent(value || '');
  }, []);

  if (!activeFile) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e'
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 16px', opacity: 0.3 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style={{ fontSize: '13px' }}>Select a file to edit</p>
          <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.5 }}>or create a new file</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <EditorTabs />
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={editorLanguage}
          value={activeFile.content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            padding: { top: 10, bottom: 10 },
            lineNumbers: 'on',
            wordWrap: 'off',
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
            },
            automaticLayout: true,
          }}
          loading={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e' }}>
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
