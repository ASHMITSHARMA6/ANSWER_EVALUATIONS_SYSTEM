import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

function BatchUploadAnswers() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');

  // Handle file selection from folder
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Filter supported formats
    const supported = selectedFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return ['pdf', 'txt', 'json'].includes(ext);
    });

    if (supported.length < selectedFiles.length) {
      setError(`${selectedFiles.length - supported.length} file(s) skipped (unsupported format)`);
    }

    setFiles(supported);
    setError('');
    setResults(null);
  };

  // Handle batch upload
  const handleBatchUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (!selectedTestId) {
      setError('Please select a test first');
      return;
    }

    setIsProcessing(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      
      // Add all files
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      // Add max score
      formData.append('maxScore', maxScore);
  formData.append('testId', selectedTestId);

      console.log(`📤 Uploading ${files.length} files for batch evaluation...`);
      console.log(`📋 Files to upload:`, files.map(f => f.name));

      const response = await axiosInstance.post('/batch-upload-answers', formData, {
        // Don't set Content-Type header - let axios handle it with FormData
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(percent);
            console.log(`⏳ Upload progress: ${percent}%`);
          }
        }
      });

      console.log(`✅ Server response:`, response.data);

      if (response.data.success) {
        setResults(response.data);
        setFiles([]);
        setError('');
      } else {
        const errorMsg = response.data.error || 'Batch upload failed';
        console.error(`❌ Batch upload error:`, errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      console.error('❌ Batch upload error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h2>📁 Batch Upload & Evaluate Answers</h2>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />
      
      {/* Instructions */}
      <div style={{
        backgroundColor: '#f0f8ff',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <strong>How it works:</strong>
        <ol style={{ marginTop: '10px' }}>
          <li>Select a folder with answer files (PDF, TXT, or JSON)</li>
          <li>System processes each file one-by-one</li>
          <li>For each file: extract text → embed → query vector DB → LLM evaluate</li>
          <li>Results show score, matched concepts, missing concepts, feedback</li>
          <li>All results saved to database for later review</li>
        </ol>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '5px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {/* File Selection */}
      {!results && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Select Folder with PDF Files:
          </label>
          <input
            type="file"
            multiple
            webkitdirectory="webkitdirectory"
            mozdirectory="mozdirectory"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.json"
            disabled={isProcessing}
            style={{
              padding: '8px',
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '5px',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Supported formats: PDF, TXT, JSON
            {files.length > 0 && ` • ${files.length} file(s) selected`}
          </p>

          {/* File List */}
          {files.length > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '5px'
            }}>
              <strong>Selected files ({files.length}):</strong>
              <ul style={{ marginTop: '8px', fontSize: '13px' }}>
                {files.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Max Score Setting */}
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Max Score:
            </label>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value) || 100)}
              min="10"
              max="1000"
              disabled={isProcessing}
              style={{
                padding: '8px',
                width: '100px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleBatchUpload}
            disabled={isProcessing || files.length === 0}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: isProcessing ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isProcessing || files.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isProcessing ? `Processing... (${progress}%)` : 'Upload & Process'}
          </button>

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{ marginTop: '15px' }}>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#ddd',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.3s'
                }}></div>
              </div>
              <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                {progress}% complete
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          {/* Summary */}
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>✅ Batch Processing Complete</h3>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td><strong>Total Files:</strong></td>
                  <td>{results.summary.totalFiles}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td><strong>Processed:</strong></td>
                  <td>{results.summary.processedFiles} ✓</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td><strong>Failed:</strong></td>
                  <td>{results.summary.failedFiles}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td><strong>Average Score:</strong></td>
                  <td><strong>{results.summary.averageScore}</strong>/{maxScore}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td><strong>Range:</strong></td>
                  <td>{results.summary.lowestScore} - {results.summary.highestScore}</td>
                </tr>
                <tr>
                  <td><strong>Total Time:</strong></td>
                  <td>{results.summary.totalTime.toFixed(1)} seconds</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Individual Results */}
          <div>
            <h3>📄 Results by File</h3>
            <div style={{
              display: 'grid',
              gap: '15px'
            }}>
              {results.results.map((result, idx) => (
                <div key={idx} style={{
                  border: `2px solid ${result.status === 'completed' ? '#4CAF50' : '#ff9800'}`,
                  padding: '15px',
                  borderRadius: '5px',
                  backgroundColor: result.status === 'completed' ? '#f1f8e9' : '#fff3e0'
                }}>
                  {/* File Header */}
                  <div style={{ marginBottom: '10px' }}>
                    <strong>{result.filename}</strong>
                    {result.status === 'completed' && (
                      <span style={{
                        marginLeft: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        ✓ Complete
                      </span>
                    )}
                    {result.status === 'failed' && (
                      <span style={{
                        marginLeft: '10px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        ✗ Failed
                      </span>
                    )}
                  </div>

                  {/* Completed Result */}
                  {result.status === 'completed' && (
                    <>
                      {/* Score */}
                      <div style={{
                        backgroundColor: 'white',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span><strong>Score:</strong></span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196F3' }}>
                          {result.score}/{result.maxScore}
                        </span>
                        <span style={{ fontSize: '14px', color: '#666' }}>
                          ({result.percentage}%)
                        </span>
                      </div>

                      {/* Matched Concepts */}
                      {result.matchedConcepts.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>✓ Matched Concepts:</strong>
                          <div style={{ marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {result.matchedConcepts.map((concept, i) => (
                              <span key={i} style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}>
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Concepts */}
                      {result.missingConcepts.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>✗ Missing Concepts:</strong>
                          <div style={{ marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {result.missingConcepts.map((concept, i) => (
                              <span key={i} style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '3px',
                                fontSize: '12px'
                              }}>
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {result.feedback && (
                        <div style={{
                          backgroundColor: 'white',
                          padding: '10px',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          fontSize: '13px',
                          borderLeft: '3px solid #2196F3'
                        }}>
                          <strong>💬 Feedback:</strong>
                          <p style={{ marginTop: '5px', margin: '5px 0' }}>
                            {result.feedback}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div style={{
                        fontSize: '12px',
                        color: '#999',
                        borderTop: '1px solid #ddd',
                        paddingTop: '8px'
                      }}>
                        ID: {result.evaluationId} | Time: {result.processingTime.toFixed(2)}s
                      </div>
                    </>
                  )}

                  {/* Failed Result */}
                  {result.status === 'failed' && (
                    <div style={{
                      backgroundColor: '#ffebee',
                      padding: '10px',
                      borderRadius: '4px',
                      color: '#c62828',
                      fontSize: '13px'
                    }}>
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setResults(null);
              setFiles([]);
              setError('');
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Process Another Batch
          </button>
        </div>
      )}
    </div>
  );
}

export default BatchUploadAnswers;
