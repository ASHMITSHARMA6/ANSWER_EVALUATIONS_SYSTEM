import React, { useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const UploadMaterial = () => {
  const [mode, setMode] = useState('text'); // 'text' | 'pdf' | 'folder'
  const [material, setMaterial] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setMessage('');
    setUploadProgress('');
    setPdfFile(null);
    setFolderFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setUploadProgress('');
    setIsError(false);
    setLoading(true);
    try {
      if (!selectedTestId) {
        setMessage('Please select a test first.');
        setIsError(true);
        setLoading(false);
        return;
      }
      if (mode === 'folder') {
        if (folderFiles.length === 0) {
          setMessage('Please select a folder with PDF files.');
          setIsError(true);
          setLoading(false);
          return;
        }
        
        const pdfFiles = folderFiles.filter(f => f.type === 'application/pdf');
        if (pdfFiles.length === 0) {
          setMessage('No PDF files found in the selected folder.');
          setIsError(true);
          setLoading(false);
          return;
        }

        // Upload files one by one
        for (let i = 0; i < pdfFiles.length; i++) {
          const file = pdfFiles[i];
          setUploadProgress(`Uploading ${i + 1} of ${pdfFiles.length}: ${file.name}`);
          
          const fd = new FormData();
          fd.append('file', file);
          fd.append('testId', selectedTestId);
          
          try {
            await axiosInstance.post('/upload-material', fd);
          } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            setMessage(`Error uploading ${file.name}: ${err?.response?.data?.error || err?.message}`);
            setIsError(true);
            setLoading(false);
            return;
          }
        }
        
        setMessage(`✅ Successfully uploaded and processed ${pdfFiles.length} PDF file(s) from the folder!`);
        setFolderFiles([]);
        if (folderInputRef.current) folderInputRef.current.value = '';
      } else if (mode === 'pdf') {
        if (!pdfFile) {
          setMessage('Please select a PDF file.');
          setIsError(true);
          setLoading(false);
          return;
        }
  const fd = new FormData();
  fd.append('file', pdfFile);
  fd.append('testId', selectedTestId);
        await axiosInstance.post('/upload-material', fd);
        setMessage('✅ PDF uploaded and text extracted successfully!');
        setPdfFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        if (!material.trim()) {
          setMessage('Please enter or paste your material.');
          setIsError(true);
          setLoading(false);
          return;
        }
        await axiosInstance.post('/upload-material', { material, testId: selectedTestId });
        setMessage('✅ Material uploaded successfully!');
        setMaterial('');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(err?.response?.data?.error || err?.message || 'Upload failed.');
      setIsError(true);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setPdfFile(f);
      setMessage('');
    } else if (f) {
      setPdfFile(null);
      setMessage('Please select a PDF file.');
      setIsError(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setPdfFile(null);
    }
  };

  const onFolderChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setFolderFiles(fileArray);
      const pdfCount = fileArray.filter(f => f.type === 'application/pdf').length;
      setMessage(`📁 Selected folder with ${fileArray.length} file(s) (${pdfCount} PDFs)`);
      setIsError(false);
    } else {
      setFolderFiles([]);
    }
  };

  return (
    <div className="page">
      <h1>Upload Study Material</h1>
      <p className="page-desc">
        Paste text, upload a single PDF, or upload a folder containing multiple PDFs. Content is used to generate questions. PDFs must be text-based (scanned image PDFs may not work).
      </p>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      <div className="upload-mode-tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={mode === 'text' ? 'tab active' : 'tab'}
          onClick={() => handleModeChange('text')}
          style={{
            padding: '10px 20px',
            backgroundColor: mode === 'text' ? '#3498db' : '#ecf0f1',
            color: mode === 'text' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: mode === 'text' ? 'bold' : 'normal'
          }}
        >
          📝 Paste text
        </button>
        <button
          type="button"
          className={mode === 'pdf' ? 'tab active' : 'tab'}
          onClick={() => handleModeChange('pdf')}
          style={{
            padding: '10px 20px',
            backgroundColor: mode === 'pdf' ? '#3498db' : '#ecf0f1',
            color: mode === 'pdf' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: mode === 'pdf' ? 'bold' : 'normal'
          }}
        >
          📄 Upload PDF
        </button>
        <button
          type="button"
          className={mode === 'folder' ? 'tab active' : 'tab'}
          onClick={() => handleModeChange('folder')}
          style={{
            padding: '10px 20px',
            backgroundColor: mode === 'folder' ? '#3498db' : '#ecf0f1',
            color: mode === 'folder' ? 'white' : '#2c3e50',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: mode === 'folder' ? 'bold' : 'normal'
          }}
        >
          📁 Upload Folder
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        {mode === 'text' && (
          <div className="form-group">
            <label htmlFor="material-textarea">Content</label>
            <textarea
              id="material-textarea"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              rows={10}
              placeholder="Paste or type your study material here..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #bdc3c7',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {mode === 'pdf' && (
          <div className="form-group">
            <label htmlFor="pdf-input" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>PDF file</label>
            <input
              id="pdf-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileChange}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                position: 'relative',
                opacity: 1
              }}
            />
            {pdfFile && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#e8f8f5',
                borderRadius: '4px',
                color: '#27ae60',
                fontWeight: 'bold'
              }}>
                ✅ {pdfFile.name}
              </div>
            )}
          </div>
        )}

        {mode === 'folder' && (
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Step 1: Select folder with PDFs
            </label>

            {/* Visible folder picker button */}
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => folderInputRef.current && folderInputRef.current.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}
              >
                📂 Choose Folder
              </button>
              {/* Hidden actual file input — NOT using className="file-input" to avoid OCRUpload.css conflict */}
              <input
                id="folder-input"
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={onFolderChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Show selected files */}
            {folderFiles.length > 0 && (() => {
              const pdfCount = folderFiles.filter(f => f.type === 'application/pdf').length;
              return (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e8f8f5',
                  borderRadius: '6px',
                  border: '1px solid #27ae60',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: '6px' }}>
                    📁 Selected folder — {folderFiles.length} file(s), {pdfCount} PDF(s)
                  </div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '13px', color: '#555' }}>
                    {folderFiles.filter(f => f.type === 'application/pdf').map((f, i) => (
                      <div key={i}>📄 {f.name}</div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {folderFiles.length > 0 && (
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#27ae60' }}>
                Step 2: Click "Upload" below to process all PDFs
              </label>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'pdf' && !pdfFile) || (mode === 'text' && !material.trim()) || (mode === 'folder' && folderFiles.length === 0)}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 24px',
            backgroundColor: loading ? '#95a5a6' : (mode === 'folder' && folderFiles.length === 0) ? '#bdc3c7' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || (mode === 'folder' && folderFiles.length === 0) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '16px',
            position: 'relative',
            zIndex: 10
          }}
        >
          {loading ? '⏳ Uploading...' : mode === 'folder' ? `📤 Upload ${folderFiles.filter(f => f.type === 'application/pdf').length || ''} PDF(s)` : '📤 Upload'}
        </button>

        {uploadProgress && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: '#d6eaf8',
            color: '#1f618d',
            border: '1px solid #3498db',
            fontWeight: 'bold'
          }}>
            {uploadProgress}
          </div>
        )}

        {message && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: isError ? '#fadbd8' : '#d5f4e6',
            color: isError ? '#c0392b' : '#27ae60',
            border: `1px solid ${isError ? '#e74c3c' : '#27ae60'}`,
            fontWeight: 'bold'
          }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadMaterial;
