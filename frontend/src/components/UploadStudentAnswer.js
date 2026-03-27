import React, { useState, useRef, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import BatchUploadAnswers from './BatchUploadAnswers';
import TestSelector from './TestSelector';

const UploadStudentAnswer = () => {
  const [uploadType, setUploadType] = useState('single');

  // Student answer
  const [studentAnswer, setStudentAnswer] = useState('');
  const [studentName, setStudentName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [question, setQuestion] = useState('');

  // Model answer
  const [modelAnswer, setModelAnswer] = useState('');
  const [modelAnswerSource, setModelAnswerSource] = useState('database');
  const [savedModelAnswer, setSavedModelAnswer] = useState(null);
  const [loadingModelAnswer, setLoadingModelAnswer] = useState(true);

  // UI state
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const fileInputRef = useRef(null);

  const fetchLatestModelAnswer = useCallback(async () => {
    setLoadingModelAnswer(true);
    try {
      const params = selectedTestId ? `?testId=${selectedTestId}` : '';
      const response = await axiosInstance.get(`/upload-model-answer/latest${params}`);
      if (response.data.found) {
        setSavedModelAnswer(response.data);
      } else {
        setSavedModelAnswer(null);
      }
    } catch (err) {
      console.log('Could not fetch model answer:', err.message);
      setSavedModelAnswer(null);
    } finally {
      setLoadingModelAnswer(false);
    }
  }, [selectedTestId]);

  // Fetch latest model answer from DB on mount
  useEffect(() => {
    fetchLatestModelAnswer();
  }, [fetchLatestModelAnswer]);

  const isImageOrPDF = (file) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
    return imageTypes.includes(file.type) || file.type === 'application/pdf';
  };

  const extractTextFromFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      setMessage('🔄 Extracting text from image/PDF...');
      const response = await axiosInstance.post('/ocr/extract', formData);
      const extracted = response.data.extractedText || response.data.text || '';
      setExtractedText(extracted);
      setShowExtractedText(true);
      setStudentAnswer(extracted);
      return extracted;
    } catch (err) {
      setMessage('OCR extraction failed: ' + (err?.response?.data?.error || err.message));
      setIsError(true);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setLoading(true);
    setEvaluation(null);
    setShowExtractedText(false);

    try {
      if (!selectedTestId) {
        setMessage('Please select a test first.');
        setIsError(true);
        setLoading(false);
        return;
      }
      let textToEvaluate = '';

      if (uploadFile) {
        if (isImageOrPDF(uploadFile)) {
          setMessage('🔄 Extracting text from image/PDF...');
          textToEvaluate = await extractTextFromFile(uploadFile);
          if (!textToEvaluate) { setLoading(false); return; }
        } else {
          setMessage('Invalid file type. Please upload an image (JPG, PNG, GIF, BMP) or PDF.');
          setIsError(true);
          setLoading(false);
          return;
        }
      } else if (studentAnswer.trim()) {
        textToEvaluate = studentAnswer;
      } else {
        setMessage('Please enter or upload the student answer.');
        setIsError(true);
        setLoading(false);
        return;
      }

      const effectiveModelAnswer = modelAnswerSource === 'manual' ? modelAnswer.trim() : '';

      if (modelAnswerSource === 'manual' && !effectiveModelAnswer) {
        setMessage('You selected "Type manually" but didn\'t enter a model answer. Please enter one or switch to "Use saved".');
        setIsError(true);
        setLoading(false);
        return;
      }

      if (modelAnswerSource === 'database' && !savedModelAnswer) {
        setMessage('No model answer found in database. Please upload one at the Model Answer page, or switch to "Type Manually".');
        setIsError(true);
        setLoading(false);
        return;
      }

      setMessage('⚖️ Evaluating answer...');
      const payload = {
        studentAnswer: textToEvaluate,
        question: question || 'General Question',
        testId: selectedTestId,
      };

      if (modelAnswerSource === 'manual' && effectiveModelAnswer) {
        payload.modelAnswer = effectiveModelAnswer;
      }

      const response = await axiosInstance.post('/evaluate/text', payload);
      setEvaluation(response.data.evaluation || response.data);
      setMessage('✅ Evaluation completed!');
      setIsError(false);

      try {
        await axiosInstance.post('/upload-student-answer', {
          studentAnswer: textToEvaluate,
          studentName: studentName || 'Student',
          wasExtractedFromOCR: !!extractedText,
          testId: selectedTestId,
        });
      } catch (saveErr) {
        console.log('Could not save student answer:', saveErr.message);
      }

    } catch (err) {
      setMessage(err?.response?.data?.error || 'Process failed.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (isImageOrPDF(f)) {
        setUploadFile(f);
        setStudentAnswer('');
        setMessage('');
        setIsError(false);
      } else {
        setUploadFile(null);
        setMessage('Invalid file type. Please upload JPG, PNG, GIF, BMP, or PDF.');
        setIsError(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      setUploadFile(null);
    }
  };

  const handleTextChange = (e) => {
    setStudentAnswer(e.target.value);
    if (uploadFile) {
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setMessage('');
    setIsError(false);
    setStudentAnswer('');
    setUploadFile(null);
    setExtractedText('');
    setShowExtractedText(false);
    setEvaluation(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sectionStyle = {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const sectionTitleStyle = {
    margin: '0 0 4px 0',
    fontSize: '1.1em',
    fontWeight: 700,
    color: '#185a9d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const sectionDescStyle = {
    margin: '0 0 16px 0',
    fontSize: '0.88em',
    color: '#888',
  };

  const chipStyle = (active) => ({
    padding: '8px 18px',
    border: active ? '2px solid #185a9d' : '2px solid #ddd',
    borderRadius: '20px',
    backgroundColor: active ? '#e8f0fe' : '#fafafa',
    color: active ? '#185a9d' : '#666',
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
    fontSize: '0.9em',
    transition: 'all 0.2s ease',
  });

  const scoreColor = (score) => score >= 70 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336';

  return (
    <div className="page">
      <h1 style={{ marginBottom: '4px' }}>📝 Upload & Evaluate Student Answers</h1>
      <p style={{ color: '#888', marginTop: 0, marginBottom: '20px' }}>
        Upload a student answer, then evaluate it against a model answer using AI.
      </p>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      {/* Upload Type Tabs */}
      <div style={{ display: 'flex', marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #185a9d' }}>
        <button
          type="button"
          onClick={() => setUploadType('single')}
          style={{
            flex: 1, padding: '12px', border: 'none',
            backgroundColor: uploadType === 'single' ? '#185a9d' : '#fff',
            color: uploadType === 'single' ? '#fff' : '#185a9d',
            cursor: 'pointer', fontWeight: 700, fontSize: '1em',
            transition: 'all 0.2s ease',
          }}
        >📝 Single Upload</button>
        <button
          type="button"
          onClick={() => setUploadType('batch')}
          style={{
            flex: 1, padding: '12px', border: 'none',
            borderLeft: '2px solid #185a9d',
            backgroundColor: uploadType === 'batch' ? '#185a9d' : '#fff',
            color: uploadType === 'batch' ? '#fff' : '#185a9d',
            cursor: 'pointer', fontWeight: 700, fontSize: '1em',
            transition: 'all 0.2s ease',
          }}
        >📁 Batch Upload</button>
      </div>

      {/* ═══ SINGLE UPLOAD ═══ */}
      {uploadType === 'single' && (
        <form onSubmit={handleSubmit}>

          {/* Section 1: Student Info */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>👤 Student Info</h3>
            <p style={sectionDescStyle}>Optional — helps identify the student in results.</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
                style={{ flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.95em' }}
              />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Question (e.g. Explain photosynthesis)"
                style={{ flex: 2, minWidth: '220px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.95em' }}
              />
            </div>
          </div>

          {/* Section 2: Student Answer */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>📄 Student Answer <span style={{ color: '#e53935', fontSize: '0.85em' }}>*</span></h3>
            <p style={sectionDescStyle}>Upload a handwritten image/PDF (OCR will extract text) or type/paste the answer.</p>

            <div
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '2px dashed #ccc',
                marginBottom: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '2em', marginBottom: '4px' }}>📎</div>
              <div style={{ fontWeight: 600, color: '#185a9d', marginBottom: '4px' }}>
                Click to upload Image or PDF
              </div>
              <div style={{ fontSize: '0.82em', color: '#999' }}>
                JPG, PNG, GIF, BMP, PDF — max 10MB
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.bmp,.pdf"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {uploadFile && (
              <div style={{
                padding: '10px 14px', backgroundColor: '#e8f5e9', borderRadius: '6px',
                color: '#2e7d32', fontWeight: 600, fontSize: '0.9em', marginBottom: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>✅ {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                <button type="button" onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontWeight: 700, fontSize: '1.1em' }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0', color: '#bbb', fontSize: '0.85em' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
              <span>OR TYPE BELOW</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
            </div>

            <textarea
              value={studentAnswer}
              onChange={handleTextChange}
              rows={5}
              placeholder="Paste or type the student's answer here..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.95em',
                boxSizing: 'border-box', resize: 'vertical',
              }}
            />
          </div>

          {/* OCR Preview */}
          {showExtractedText && extractedText && (
            <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3' }}>
              <h3 style={{ ...sectionTitleStyle, color: '#1565c0' }}>🔍 OCR Extracted Text</h3>
              <p style={sectionDescStyle}>Review and edit the extracted text before evaluation.</p>
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                rows={4}
                style={{
                  width: '100%', padding: '12px', borderRadius: '6px',
                  border: '1px solid #90caf9', fontSize: '0.95em',
                  fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Section 3: Model Answer */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>📚 Model Answer</h3>
            <p style={sectionDescStyle}>
              Choose where the model answer comes from. Use a previously uploaded one or type a new one here.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setModelAnswerSource('database')} style={chipStyle(modelAnswerSource === 'database')}>
                💾 Use Saved Model Answer
              </button>
              <button type="button" onClick={() => setModelAnswerSource('manual')} style={chipStyle(modelAnswerSource === 'manual')}>
                ✍️ Type Manually
              </button>
            </div>

            {modelAnswerSource === 'database' && (
              <div style={{ padding: '14px', backgroundColor: '#f0f7f0', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                {loadingModelAnswer ? (
                  <div style={{ color: '#888', fontStyle: 'italic' }}>⏳ Loading saved model answer...</div>
                ) : savedModelAnswer ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#2e7d32', fontWeight: 700 }}>✅ Model answer found</span>
                      <span style={{ fontSize: '0.8em', color: '#888' }}>
                        (uploaded {new Date(savedModelAnswer.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <div style={{
                      padding: '10px', backgroundColor: '#fff', borderRadius: '6px',
                      border: '1px solid #e0e0e0', maxHeight: '120px', overflow: 'auto',
                      fontSize: '0.88em', color: '#444', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {savedModelAnswer.modelAnswer.length > 500
                        ? savedModelAnswer.modelAnswer.substring(0, 500) + '...'
                        : savedModelAnswer.modelAnswer}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.82em', color: '#888' }}>
                      Max marks: {savedModelAnswer.maxMarks} · {savedModelAnswer.modelAnswer.length} chars
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#e65100', fontWeight: 600, marginBottom: '8px' }}>
                      ⚠️ No model answer found in database
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88em', color: '#666' }}>
                      Upload a model answer first at{' '}
                      <a href="/upload-model-answer" style={{ color: '#185a9d', fontWeight: 600 }}>Upload Model Answer</a>{' '}
                      page, or switch to "Type Manually" above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {modelAnswerSource === 'manual' && (
              <textarea
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                rows={5}
                placeholder="Enter the correct/expected answer for comparison..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '8px',
                  border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.95em',
                  boxSizing: 'border-box', resize: 'vertical',
                }}
              />
            )}
          </div>

          {/* Messages */}
          {message && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px',
              backgroundColor: isError ? '#ffebee' : '#e8f5e9',
              color: isError ? '#c62828' : '#2e7d32',
              border: '1px solid ' + (isError ? '#ef9a9a' : '#a5d6a7'),
              marginBottom: '16px', fontWeight: 600, fontSize: '0.95em',
            }}>
              {message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="submit"
              disabled={loading || (!uploadFile && !studentAnswer.trim())}
              style={{
                flex: 1, padding: '14px', borderRadius: '8px', border: 'none',
                backgroundColor: loading ? '#bbb' : '#185a9d',
                color: '#fff', fontSize: '1.05em', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              {loading ? '🔄 Processing...' : '🚀 Process & Evaluate'}
            </button>
            {(studentAnswer || uploadFile || evaluation) && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '14px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#f44336', color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}
              >
                🔄 Reset
              </button>
            )}
          </div>
        </form>
      )}

      {/* ═══ EVALUATION RESULTS ═══ */}
      {uploadType === 'single' && evaluation && (
        <div style={{ ...sectionStyle, borderTop: '4px solid #185a9d' }}>
          <h3 style={{ ...sectionTitleStyle, fontSize: '1.2em', marginBottom: '16px' }}>📊 Evaluation Results</h3>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 24px' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              border: '6px solid ' + scoreColor(evaluation.score),
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              backgroundColor: '#fff',
              boxShadow: '0 0 20px ' + scoreColor(evaluation.score) + '33',
            }}>
              <div style={{ fontSize: '2.4em', fontWeight: 800, color: scoreColor(evaluation.score), lineHeight: 1 }}>
                {evaluation.score}
              </div>
              <div style={{ fontSize: '0.85em', color: '#888' }}>/ 100</div>
            </div>
          </div>

          {evaluation.matchedConcepts && evaluation.matchedConcepts.length > 0 && (
            <div style={{
              padding: '14px', backgroundColor: '#e8f5e9',
              borderLeft: '4px solid #4caf50', borderRadius: '6px', marginBottom: '12px',
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>✅ Matched Concepts</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {evaluation.matchedConcepts.map((c, i) => (
                  <span key={i} style={{
                    padding: '4px 12px', backgroundColor: '#c8e6c9',
                    borderRadius: '12px', fontSize: '0.85em', color: '#1b5e20',
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {evaluation.missingConcepts && evaluation.missingConcepts.length > 0 && (
            <div style={{
              padding: '14px', backgroundColor: '#ffebee',
              borderLeft: '4px solid #f44336', borderRadius: '6px', marginBottom: '12px',
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#c62828' }}>❌ Missing Concepts</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {evaluation.missingConcepts.map((c, i) => (
                  <span key={i} style={{
                    padding: '4px 12px', backgroundColor: '#ffcdd2',
                    borderRadius: '12px', fontSize: '0.85em', color: '#b71c1c',
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {evaluation.feedback && (
            <div style={{
              padding: '14px', backgroundColor: '#fff3e0',
              borderLeft: '4px solid #ff9800', borderRadius: '6px',
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#e65100' }}>💬 Feedback</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.93em', color: '#444', lineHeight: 1.6 }}>
                {evaluation.feedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ BATCH UPLOAD ═══ */}
      {uploadType === 'batch' && <BatchUploadAnswers />}
    </div>
  );
};

export default UploadStudentAnswer;
