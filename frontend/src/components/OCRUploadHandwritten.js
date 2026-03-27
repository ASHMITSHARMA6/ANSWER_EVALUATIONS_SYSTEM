import React, { useState, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import '../styles/OCRUpload.css';

/**
 * Component for uploading and evaluating handwritten student answers
 * Uses OCR.Space API to extract text, then AI for evaluation
 */
const OCRUploadHandwritten = () => {
  const [mode, setMode] = useState('handwritten'); // 'handwritten' | 'typed'
  const [file, setFile] = useState(null);
  const [studentText, setStudentText] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [studentName, setStudentName] = useState('Student');
  
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'application/pdf'];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setMessage('');
        setIsError(false);
        setExtractedText('');
        setEvaluation(null);
      } else {
        setMessage('Please select a valid image (JPG, PNG, GIF) or PDF file.');
        setIsError(true);
        setFile(null);
      }
    }
  };

  const handleExtractOCR = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      setIsError(true);
      return;
    }

    setLoading(true);
    setOcrProgress(0);
    setMessage('');
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setOcrProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await axiosInstance.post('/ocr/extract', formData);

      clearInterval(progressInterval);
      setOcrProgress(100);

      if (response.data.success) {
        setExtractedText(response.data.extractedText);
        setMessage('✓ Text extracted successfully from handwritten answer');
        setIsError(false);
      }
    } catch (error) {
      setMessage(
        error?.response?.data?.error || 'Failed to extract text. Please try again.'
      );
      setIsError(true);
    } finally {
      setLoading(false);
      setTimeout(() => setOcrProgress(0), 500);
    }
  };

  const handleEvaluate = async () => {
    const answerToEvaluate = mode === 'handwritten' ? extractedText : studentText;

    if (!answerToEvaluate.trim()) {
      setMessage(
        mode === 'handwritten'
          ? 'Please extract text from the handwritten image first.'
          : 'Please enter the student answer.'
      );
      setIsError(true);
      return;
    }

    if (!modelAnswer.trim()) {
      setMessage('Please enter the model answer.');
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await axiosInstance.post('/evaluate/text', {
        studentAnswer: answerToEvaluate,
        modelAnswer,
        question: question || '',
      });

      if (response.data.success) {
        setEvaluation(response.data.evaluation);
        setMessage('✓ Evaluation completed');
        setIsError(false);
      }
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Evaluation failed.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>🖊️ Evaluate Handwritten Answers (with OCR)</h1>
      <p className="page-desc">
        Upload handwritten answer sheets and automatically extract text using OCR,
        then evaluate with AI.
      </p>

      <div className="ocr-container">
        {/* Mode Selector */}
        <div className="ocr-mode-tabs">
          <button
            type="button"
            className={mode === 'handwritten' ? 'tab active' : 'tab'}
            onClick={() => setMode('handwritten')}
          >
            🖊️ Handwritten (OCR)
          </button>
          <button
            type="button"
            className={mode === 'typed' ? 'tab active' : 'tab'}
            onClick={() => setMode('typed')}
          >
            ⌨️ Typed Answer
          </button>
        </div>

        {/* Handwritten Upload Section */}
        {mode === 'handwritten' && (
          <div className="form-card">
            <h3>📸 Upload Handwritten Answer</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Upload a photo/scan of the handwritten answer. We'll use OCR to
              extract the text automatically.
            </p>

            <div className="form-group form-group-sm">
              <label>Student Name (optional)</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
              />
            </div>

            <div className="form-group">
              <label>Upload Image/PDF *</label>
              <div className="file-upload-box">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <div className="upload-placeholder">
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                  <p>Click to upload or drag and drop</p>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    JPG, PNG, GIF or PDF
                  </p>
                </div>
                {file && (
                  <div className="file-selected">
                    ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* OCR Extraction Button */}
            <button
              className="btn-primary"
              onClick={handleExtractOCR}
              disabled={!file || loading}
              style={{ marginBottom: '16px' }}
            >
              {loading ? `Extracting... ${ocrProgress}%` : '🔍 Extract Text with OCR'}
            </button>

            {ocrProgress > 0 && ocrProgress < 100 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            )}

            {/* Extracted Text Display */}
            {extractedText && (
              <div className="extracted-text-box">
                <h4>📝 Extracted Text:</h4>
                <div className="extracted-text-content">{extractedText}</div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = extractedText;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    alert('Text copied to clipboard!');
                  }}
                >
                  📋 Copy Text
                </button>
              </div>
            )}
          </div>
        )}

        {/* Typed Answer Section */}
        {mode === 'typed' && (
          <div className="form-card">
            <h3>⌨️ Enter Student Answer</h3>
            <div className="form-group form-group-sm">
              <label>Student Name (optional)</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
              />
            </div>

            <div className="form-group">
              <label>Student Answer *</label>
              <textarea
                value={studentText}
                onChange={(e) => setStudentText(e.target.value)}
                rows={6}
                placeholder="Paste or type the student's answer..."
              />
            </div>
          </div>
        )}

        {/* Common Evaluation Fields */}
        <div className="form-card">
          <h3>📚 Model Answer & Evaluation</h3>

          <div className="form-group form-group-sm">
            <label>Question (optional)</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is the question being answered?"
            />
          </div>

          <div className="form-group">
            <label>Model Answer (Correct Answer) *</label>
            <textarea
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={6}
              placeholder="Enter the correct/model answer..."
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleEvaluate}
            disabled={
              loading ||
              !modelAnswer.trim() ||
              (!extractedText.trim() && mode === 'handwritten') ||
              (!studentText.trim() && mode === 'typed')
            }
          >
            {loading ? 'Evaluating...' : '⚖️ Evaluate Answer'}
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`form-${isError ? 'error' : 'success'}`}>{message}</div>
        )}

        {/* Evaluation Results */}
        {evaluation && (
          <div className="evaluation-results">
            <h3>📊 Evaluation Results</h3>

            <div className="score-display">
              <div className="score-value">{evaluation.score}</div>
              <div className="score-label">/ 100</div>
            </div>

            {evaluation.matchedConcepts && evaluation.matchedConcepts.length > 0 && (
              <div className="concepts-box matched">
                <h4>✓ Matched Concepts:</h4>
                <ul>
                  {evaluation.matchedConcepts.map((concept, i) => (
                    <li key={i}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.missingConcepts && evaluation.missingConcepts.length > 0 && (
              <div className="concepts-box missing">
                <h4>✗ Missing Concepts:</h4>
                <ul>
                  {evaluation.missingConcepts.map((concept, i) => (
                    <li key={i}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.feedback && (
              <div className="feedback-box">
                <h4>💬 Feedback:</h4>
                <p>{evaluation.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OCRUploadHandwritten;
