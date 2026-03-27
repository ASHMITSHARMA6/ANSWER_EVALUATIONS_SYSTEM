import React, { useState, useRef, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const UploadModelAnswer = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('pdf');
  const [aiPairs, setAiPairs] = useState([]);
  const [selectedAi, setSelectedAi] = useState({});
  const [loadingAi, setLoadingAi] = useState(false);
  const [maxMarks, setMaxMarks] = useState(10);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const allSelected = aiPairs.length > 0 && aiPairs.every((_, idx) => selectedAi[idx]);

  useEffect(() => {
    const loadAiPairs = async () => {
      setLoadingAi(true);
      try {
        const params = selectedTestId ? `?testId=${selectedTestId}` : '';
        const res = await axiosInstance.get(`/generate-questions/latest${params}`);
        const pairs = res.data?.questionPairs || [];
        setAiPairs(pairs);
      } catch (err) {
        console.error('[UploadModelAnswer] Failed to load AI model answers:', err);
      } finally {
        setLoadingAi(false);
      }
    };

    loadAiPairs();
  }, [selectedTestId]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setPdfFile(f);
      setMessage('');
      setIsError(false);
    } else if (f) {
      setPdfFile(null);
      setMessage('Please select a PDF file.');
      setIsError(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setPdfFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setLoading(true);

    if (!selectedTestId) {
      setMessage('Please select a test first.');
      setIsError(true);
      setLoading(false);
      return;
    }

    if (!pdfFile) {
      setMessage('Please select a PDF file.');
      setIsError(true);
      setLoading(false);
      return;
    }

    try {
      console.log('[UploadModelAnswer] Starting PDF upload for:', pdfFile.name);
      
      // Step 1: Upload PDF to extract text
      const fd = new FormData();
      fd.append('file', pdfFile);
      
      console.log('[UploadModelAnswer] Sending PDF to /extract-pdf endpoint');
      const extractResponse = await axiosInstance.post('/extract-pdf', fd);

      console.log('[UploadModelAnswer] Extract response:', extractResponse.data);

      if (!extractResponse.data || !extractResponse.data.success) {
        const errorMsg = extractResponse?.data?.error || 'Failed to extract model answers from PDF.';
        console.error('[UploadModelAnswer] Extraction failed:', errorMsg);
        setMessage(errorMsg);
        setIsError(true);
        return;
      }

      const { text, fileName } = extractResponse.data;

      if (!text || text.trim().length === 0) {
        console.error('[UploadModelAnswer] No text extracted from PDF');
        setMessage('No text could be extracted from the PDF. Please ensure it is a text-based PDF.');
        setIsError(true);
        return;
      }

      console.log('[UploadModelAnswer] Extracted text length:', text.length);

      // Step 2: Save the extracted text as a model answer
      console.log('[UploadModelAnswer] Saving to database');
      const saveResponse = await axiosInstance.post('/upload-model-answer', {
        modelAnswer: text,
        questionText: `Model Answer from ${fileName}`,
        maxMarks: 10, // Default marks, can be changed later
        testId: selectedTestId
      });

      console.log('[UploadModelAnswer] Save response:', saveResponse.data);

      if (saveResponse?.data?.id) {
        console.log('[UploadModelAnswer] Success! Model answer ID:', saveResponse.data.id);
        setMessage('✅ Model answers extracted from PDF and indexed successfully! Ready for evaluation.');
        setPdfFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const errorMsg = saveResponse?.data?.error || 'Failed to save the extracted model answer.';
        console.error('[UploadModelAnswer] Save failed:', errorMsg);
        setMessage(errorMsg);
        setIsError(true);
      }

    } catch (err) {
      console.error('[UploadModelAnswer] Catch block error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Upload failed.';
      console.error('[UploadModelAnswer] Error message:', errorMsg);
      setMessage(errorMsg);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiAnswers = async () => {
    setMessage('');
    setIsError(false);

    if (!selectedTestId) {
      setMessage('Please select a test first.');
      setIsError(true);
      return;
    }

    const selected = aiPairs.filter((_, idx) => selectedAi[idx]);
    if (selected.length === 0) {
      setMessage('Please select at least one AI-generated model answer.');
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      const payloads = selected.map((pair) => ({
        questionText: pair.question,
        modelAnswer: pair.modelAnswer || 'Not enough information in the provided material.',
        maxMarks: Number(maxMarks) || 10,
        testId: selectedTestId
      }));

      for (const payload of payloads) {
        await axiosInstance.post('/upload-model-answer', payload);
      }

      setMessage(`✅ Saved ${payloads.length} AI-generated model answers successfully.`);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to save AI model answers.';
      setMessage(errorMsg);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Upload Model Answers</h1>
      <p className="page-desc">
        Upload a PDF containing model answers for the questions. All answers will be automatically extracted and indexed for AI-powered evaluation.
      </p>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      <div style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="radio"
            name="modelAnswerMode"
            value="pdf"
            checked={uploadMode === 'pdf'}
            onChange={() => setUploadMode('pdf')}
          />
          Upload PDF (custom answers)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="radio"
            name="modelAnswerMode"
            value="ai"
            checked={uploadMode === 'ai'}
            onChange={() => setUploadMode('ai')}
          />
          Use AI-generated model answers
        </label>
      </div>

      {uploadMode === 'pdf' && (
        <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label htmlFor="pdf-input" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
            📄 Select PDF with Model Answers
          </label>
          <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '15px' }}>
            Upload a PDF file containing model answers. The system will extract all text and use it for evaluating student answers with AI.
          </p>
          
          <input
            id="pdf-input"
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={onFileChange}
            style={{
              padding: '12px',
              border: '2px dashed #3498db',
              borderRadius: '6px',
              width: '100%',
              cursor: 'pointer',
              backgroundColor: '#ecf0f1',
              fontSize: '14px'
            }}
          />
          
          {pdfFile && (
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: '#d5f4e6',
              borderLeft: '4px solid #27ae60',
              borderRadius: '4px',
              color: '#27ae60',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>✅</span>
              <div>
                <div>{pdfFile.name}</div>
                <small style={{ fontSize: '12px', opacity: 0.8 }}>
                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                </small>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !pdfFile}
          style={{
            padding: '14px 28px',
            backgroundColor: loading ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            width: '100%',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? '⏳ Processing PDF...' : '📤 Upload & Extract Model Answers'}
        </button>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '14px',
            borderRadius: '4px',
            backgroundColor: isError ? '#fadbd8' : '#d5f4e6',
            color: isError ? '#c0392b' : '#27ae60',
            border: `2px solid ${isError ? '#e74c3c' : '#27ae60'}`,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px' }}>{isError ? '❌' : '✅'}</span>
            <span>{message}</span>
          </div>
        )}

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f0f7ff',
          borderRadius: '4px',
          borderLeft: '4px solid #3498db'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2980b9' }}>💡 How It Works</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#34495e' }}>
            <li>Upload your PDF with model answers</li>
            <li>System extracts and analyzes the text</li>
            <li>Model answers are indexed in the database</li>
            <li>AI uses these for accurate student evaluation</li>
          </ul>
        </div>
        </form>
      )}

      {uploadMode === 'ai' && (
        <div className="form-card">
          <h3 style={{ marginTop: 0 }}>AI-Generated Model Answers</h3>
          <p style={{ color: '#7f8c8d' }}>
            Select the AI-generated model answers you want to save. You can edit or replace them later.
          </p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 'bold' }}>Max Marks (applies to all selected)</label>
            <input
              type="number"
              min={1}
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: 6, border: '1px solid #ddd', borderRadius: 6 }}
            />
          </div>

          {loadingAi && <div>Loading AI-generated answers...</div>}
          {!loadingAi && aiPairs.length === 0 && (
            <div style={{ color: '#e67e22' }}>No AI-generated question set found yet. Generate questions first.</div>
          )}

          {aiPairs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  if (allSelected) {
                    setSelectedAi({});
                  } else {
                    const next = {};
                    aiPairs.forEach((_, idx) => {
                      next[idx] = true;
                    });
                    setSelectedAi(next);
                  }
                }}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #3498db',
                  background: allSelected ? '#ecf0f1' : '#e8f4ff',
                  color: '#2c3e50',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {allSelected ? 'Clear All' : 'Select All'}
              </button>
              {aiPairs.map((pair, idx) => (
                <label key={idx} style={{ display: 'flex', gap: 12, padding: 12, border: '1px solid #e0e0e0', borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!selectedAi[idx]}
                    onChange={(e) => setSelectedAi((prev) => ({ ...prev, [idx]: e.target.checked }))}
                    style={{ marginTop: 6 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Q{idx + 1}: {pair.question}</div>
                    <div style={{ color: '#34495e', whiteSpace: 'pre-wrap' }}>{pair.modelAnswer || 'Not enough information in the provided material.'}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            disabled={loading || aiPairs.length === 0}
            onClick={handleSaveAiAnswers}
            style={{
              marginTop: 16,
              padding: '14px 28px',
              backgroundColor: loading ? '#95a5a6' : '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {loading ? '⏳ Saving...' : '✅ Save Selected AI Answers'}
          </button>

          {message && (
            <div style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '4px',
              backgroundColor: isError ? '#fadbd8' : '#d5f4e6',
              color: isError ? '#c0392b' : '#27ae60',
              border: `2px solid ${isError ? '#e74c3c' : '#27ae60'}`,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '18px' }}>{isError ? '❌' : '✅'}</span>
              <span>{message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadModelAnswer;
