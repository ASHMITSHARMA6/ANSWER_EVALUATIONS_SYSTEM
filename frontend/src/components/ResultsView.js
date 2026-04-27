import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString();
};

const numOr = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const ResultsView = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'batch'
  const [batchResults, setBatchResults] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');

  const fetchResults = useCallback(async () => {
    setError('');
    try {
      setLoading(true);
      const res = await axiosInstance.get('/results', { 
        params: { groupByBatch: viewMode === 'batch' ? 'true' : 'false', testId: selectedTestId || undefined }
      });
      
      if (viewMode === 'batch') {
        // For batch view, results are already grouped
        setResults(res.data.results || []);
      } else {
        // For individual view, just show all results
        setResults(res.data.results || []);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedTestId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const fetchBatchResults = async (batchId) => {
    try {
      const res = await axiosInstance.get(`/results/batch/${batchId}`, {
        params: { testId: selectedTestId || undefined }
      });
      setBatchResults(res.data.results || []);
      setShowBatchModal(true);
    } catch (err) {
      alert('Failed to load batch results');
    }
  };

  const deleteResult = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this result?')) {
      return;
    }
    try {
      await axiosInstance.delete(`/results/${resultId}`);
      setResults(results.filter(r => r._id !== resultId));
      alert('Result deleted successfully');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete result');
    }
  };

  const downloadPDF = (resultId, studentName) => {
    axiosInstance.get(`/results/download/pdf/${resultId}`, {
      params: { testId: selectedTestId || undefined },
      responseType: 'blob'
    })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `result_${studentName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error('Download error:', err);
      alert('Failed to download PDF: ' + (err?.response?.data?.error || err.message));
    });
  };

  const downloadAllPDFs = async () => {
    if (results.length === 0) {
      alert('No results to download');
      return;
    }

    if (!window.confirm(`Download PDFs for ${results.length} students? This will open multiple downloads.`)) {
      return;
    }

    // Download each PDF with a small delay to avoid browser blocking
    results.forEach((result, index) => {
      setTimeout(() => {
        downloadPDF(result._id, result.studentName);
      }, index * 500); // 500ms delay between downloads
    });

    alert(`Downloading ${results.length} student result PDFs...`);
  };

  return (
    <div className="page">
      <h1>📊 Results</h1>
      <p className="page-desc">View and manage all AI evaluation results.</p>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      {/* View Mode Toggle */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setViewMode('individual')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'individual' ? '#3498db' : '#ecf0f1',
            color: viewMode === 'individual' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          👤 Individual Results
        </button>
        <button
          onClick={() => setViewMode('batch')}
          style={{
            padding: '10px 20px',
            backgroundColor: viewMode === 'batch' ? '#3498db' : '#ecf0f1',
            color: viewMode === 'batch' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📦 Batch Results
        </button>
      </div>

      {loading && <div className="loading">Loading results...</div>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && results.length === 0 && (
        <div className="empty-state">
          No results yet. Run an evaluation from the Evaluate page or upload student answers.
        </div>
      )}

      {/* Individual Results View */}
      {!loading && viewMode === 'individual' && results.length > 0 && (
        <>
          {/* Download All PDFs Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={downloadAllPDFs}
              style={{
                padding: '12px 24px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              📥 Download All ({results.length}) as PDF
            </button>
          </div>

          <div className="results-list">
            {results.map((r) => (
            <div key={r._id} className="result-card" style={{
              padding: '15px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              marginBottom: '15px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>📝 {r.studentName}</h4>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    {r.questionText ? `Q: ${r.questionText.substring(0, 60)}...` : 'No question'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#999' }}>
                    {formatDate(r.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: r.marks >= r.maxMarks * 0.7 ? '#27ae60' : r.marks >= r.maxMarks * 0.5 ? '#f39c12' : '#e74c3c'
                  }}>
                    {r.marks}/{r.maxMarks}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {((r.marks / r.maxMarks) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {r.feedback && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  fontSize: '13px'
                }}>
                  <strong>Feedback:</strong> {r.feedback.substring(0, 100)}...
                </div>
              )}

              {r.matchedConcepts && r.matchedConcepts.length > 0 && (
                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                  <strong>✅ Matched:</strong> {r.matchedConcepts.join(', ')}
                </div>
              )}

              {r.missingConcepts && r.missingConcepts.length > 0 && (
                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                  <strong>❌ Missing:</strong> {r.missingConcepts.join(', ')}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => deleteResult(r._id)}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* Batch Results View */}
      {!loading && viewMode === 'batch' && results.length > 0 && (
        <div className="results-list">
          {results.map((batch) => (
            <div 
              key={batch.batchId} 
              onClick={() => fetchBatchResults(batch.batchId)}
              style={{
                padding: '15px',
                border: '2px solid #3498db',
                borderRadius: '6px',
                marginBottom: '15px',
                backgroundColor: '#ecf7ff',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d6efff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecf7ff'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>📦 {batch.batchName || `Batch ${batch.batchId}`}</h4>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    👥 {batch.totalStudents} students • 📅 {formatDate(batch.createdAt)}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                    Average: {batch.averageScore ? batch.averageScore.toFixed(1) : 'N/A'} | Highest: {batch.highestScore || 0} | Lowest: {batch.lowestScore || 0}
                  </p>
                </div>
                <div style={{
                  textAlign: 'right',
                  marginLeft: '20px',
                  padding: '10px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  borderRadius: '4px'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {batch.totalStudents}
                  </div>
                  <div style={{ fontSize: '12px' }}>results</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#0066cc' }}>
                Click to view all student results →
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Results Modal */}
      {showBatchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '900px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>📦 Batch Results - {batchResults.length} Students</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                style={{
                  padding: '8px 15px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ✕ Close
              </button>
            </div>

            <div className="results-list">
              {batchResults.map((r) => (
                <div key={r._id} style={{
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <strong>{r.studentName}</strong>
                    <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>
                      {formatDate(r.createdAt)}
                    </p>
                    {r.feedback && <p style={{ margin: '3px 0', fontSize: '11px' }}>{r.feedback.substring(0, 80)}...</p>}
                    {r.marksBreakdown && (
                      <p style={{ margin: '3px 0', fontSize: '11px', color: '#4b5563' }}>
                        Coverage: {(numOr(r.marksBreakdown.completion_ratio, 0) * 100).toFixed(0)}% ·
                        Depth: {(numOr(r.marksBreakdown.depth_quality_ratio, 0) * 100).toFixed(0)}% ·
                        +Expr: {numOr(r.marksBreakdown.human_expression_bonus, 0).toFixed(1)} ·
                        -Missing: {numOr(r.marksBreakdown.missing_concept_penalty, 0).toFixed(1)} ·
                        -Critical: {numOr(r.marksBreakdown.raw_penalty, 0).toFixed(1)}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '15px' }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: numOr(r.marks, numOr(r.score, 0)) >= numOr(r.maxMarks, numOr(r.maxScore, 0)) * 0.7
                        ? '#27ae60'
                        : numOr(r.marks, numOr(r.score, 0)) >= numOr(r.maxMarks, numOr(r.maxScore, 0)) * 0.5
                          ? '#f39c12'
                          : '#e74c3c'
                    }}>
                      {numOr(r.marks, numOr(r.score, 0))}/{numOr(r.maxMarks, numOr(r.maxScore, 0))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {numOr(r.maxMarks, numOr(r.maxScore, 0)) > 0
                        ? ((numOr(r.marks, numOr(r.score, 0)) / numOr(r.maxMarks, numOr(r.maxScore, 0))) * 100).toFixed(0)
                        : 0}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => downloadPDF(r._id, r.studentName)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      📥 PDF
                    </button>
                    <button
                      onClick={() => deleteResult(r._id)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
