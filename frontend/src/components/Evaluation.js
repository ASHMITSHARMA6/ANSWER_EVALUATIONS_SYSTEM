import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const Evaluation = () => {
  const [result, setResult] = useState(null);
  const [maxMarks, setMaxMarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
    const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const [latestResults, setLatestResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [batchGroups, setBatchGroups] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchResults, setBatchResults] = useState([]);

  const toNumberOr = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const pickScore = (item) => toNumberOr(item?.marks ?? item?.score, 0);
  const pickMax = (item) => toNumberOr(item?.maxMarks ?? item?.maxScore, 0);

  const loadLatestResults = async (testId) => {
    if (!testId) {
      setLatestResults([]);
      return;
    }
    setResultsLoading(true);
    setResultsError('');
    try {
      const res = await axiosInstance.get(`/results?testId=${testId}`);
      setLatestResults(res.data?.results || []);
    } catch (err) {
      setResultsError(err?.response?.data?.error || 'Failed to load results');
      setLatestResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const loadBatchGroups = useCallback(async (testId) => {
    if (!testId) {
      setBatchGroups([]);
      setSelectedBatchId('');
      setBatchResults([]);
      return;
    }
    setBatchLoading(true);
    setBatchError('');
    try {
      const res = await axiosInstance.get(`/results?groupByBatch=true&testId=${testId}`);
      const groups = res.data?.results || [];
      setBatchGroups(groups);
      setSelectedBatchId((current) => (current || (groups[0]?.batchId || '')));
    } catch (err) {
      setBatchError(err?.response?.data?.error || 'Failed to load batch summaries');
      setBatchGroups([]);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  const loadBatchDetails = async (batchId, testId) => {
    if (!batchId || !testId) {
      setBatchResults([]);
      return;
    }
    setBatchLoading(true);
    setBatchError('');
    try {
      const res = await axiosInstance.get(`/results/batch/${batchId}?testId=${testId}`);
      setBatchResults(res.data?.results || []);
    } catch (err) {
      setBatchError(err?.response?.data?.error || 'Failed to load batch details');
      setBatchResults([]);
    } finally {
      setBatchLoading(false);
    }
  };

  useEffect(() => {
    loadLatestResults(selectedTestId);
    loadBatchGroups(selectedTestId);
  }, [selectedTestId, loadBatchGroups]);

  useEffect(() => {
    if (selectedBatchId && selectedTestId) {
      loadBatchDetails(selectedBatchId, selectedTestId);
    } else {
      setBatchResults([]);
    }
  }, [selectedBatchId, selectedTestId]);

  const handleEvaluate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      if (!selectedTestId) {
        setError('Please select a test first.');
        setLoading(false);
        return;
      }
      const body = maxMarks !== '' ? { maxScore: Number(maxMarks), maxMarks: Number(maxMarks), testId: selectedTestId } : { testId: selectedTestId };

      // 1) Try batch evaluation first (auto-detects latest uploaded batch when batchId is omitted)
      try {
        const batchRes = await axiosInstance.post('/batch-upload-answers/evaluate', body);
        if (batchRes?.data?.success && Number(batchRes?.data?.summary?.totalFiles || 0) > 0) {
          setResult({
            mode: 'batch',
            ...batchRes.data
          });
          await loadLatestResults(selectedTestId);
          await loadBatchGroups(selectedTestId);
          if (batchRes.data.batchId) {
            setSelectedBatchId(batchRes.data.batchId);
          }
          return;
        }
      } catch (batchErr) {
        const batchErrorText = String(batchErr?.response?.data?.error || '').toLowerCase();
        const canFallbackToSingle =
          batchErrorText.includes('no uploaded batch answers found') ||
          batchErrorText.includes('no uploaded answers found for this batch');

        if (!canFallbackToSingle) {
          throw batchErr;
        }
      }

      // 2) Fallback to single latest student evaluation
      const singleRes = await axiosInstance.post('/evaluate-answer', body);
      setResult({ mode: 'single', ...singleRes.data });
      await loadLatestResults(selectedTestId);
      await loadBatchGroups(selectedTestId);
    } catch (err) {
      setError(err?.response?.data?.error || 'Evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>AI Evaluation</h1>
      <p className="page-desc">
        Compares the <strong>last uploaded model answer</strong> with the <strong>last uploaded student answer</strong>.
        Use &quot;Model Answer&quot; and &quot;Student Answer&quot; first. Override max marks below if needed.
      </p>
  <TestSelector onChange={setSelectedTestId} allowCreate={false} />
      <div className="form-card">
        <div className="form-group form-group-sm">
          <label>Max marks override (optional)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            placeholder="Leave blank to use model answer's max marks"
          />
        </div>
        <button type="button" className="btn-primary" onClick={handleEvaluate} disabled={loading}>
          {loading ? 'Evaluating...' : 'Evaluate'}
        </button>
        {error && <div className="form-error">{error}</div>}
        {result && (
          <div className="eval-result">
            <h3>Result</h3>
            {result.mode === 'batch' ? (
              <>
                <p><strong>Batch Processed:</strong> {result.summary?.processedFiles || 0} / {result.summary?.totalFiles || 0}</p>
                <p><strong>Average Score:</strong> {result.summary?.averageScore || 0}</p>
                <p><strong>Batch ID:</strong> {result.batchId}</p>
                <p className="eval-hint">Saved to Results → Batch Results panel.</p>
              </>
            ) : (
              <>
                <p><strong>Marks:</strong> {result.marks} / {result.maxMarks}</p>
                <p className="eval-hint">Saved to Results. You can run more evaluations with new model/student uploads.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="form-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Latest Evaluations</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadLatestResults(selectedTestId)}
            disabled={resultsLoading}
          >
            {resultsLoading ? 'Refreshing...' : 'Refresh Results'}
          </button>
        </div>
        {resultsError && <div className="form-error">{resultsError}</div>}
        {latestResults.length === 0 && !resultsLoading && !resultsError && (
          <p className="eval-hint">No evaluations yet for this test. Run batch evaluation or single evaluation.</p>
        )}
        {latestResults.length > 0 && (
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            {latestResults.slice(0, 10).map((item) => (
              <div key={item._id} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '10px',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.studentName || 'Student'}</strong>
                  <span style={{ fontWeight: 600 }}>
                    {pickScore(item)}/{pickMax(item)}
                  </span>
                </div>
                {item.batchId && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Batch: {item.batchName || item.batchId}
                  </div>
                )}
                {item.feedback && (
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
                    {item.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Batch Evaluations</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadBatchGroups(selectedTestId)}
            disabled={batchLoading}
          >
            {batchLoading ? 'Refreshing...' : 'Refresh Batches'}
          </button>
        </div>

        {batchError && <div className="form-error">{batchError}</div>}

        {batchGroups.length === 0 && !batchLoading && !batchError && (
          <p className="eval-hint">No batch evaluation found for this test yet.</p>
        )}

        {batchGroups.length > 0 && (
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            {batchGroups.map((batch) => (
              <button
                key={batch.batchId}
                type="button"
                onClick={() => setSelectedBatchId(batch.batchId)}
                style={{
                  textAlign: 'left',
                  border: selectedBatchId === batch.batchId ? '2px solid #2563eb' : '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '10px',
                  background: selectedBatchId === batch.batchId ? '#eff6ff' : '#fafafa',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{batch.batchName || batch.batchId}</strong>
                  <span style={{ fontWeight: 600 }}>{Math.round(toNumberOr(batch.averageScore, 0))}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Students: {toNumberOr(batch.totalStudents, 0)} • Range: {toNumberOr(batch.lowestScore, 0)}-{toNumberOr(batch.highestScore, 0)}
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedBatchId && batchResults.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Batch Details ({selectedBatchId})</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {batchResults.map((item) => (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '10px',
                    background: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{item.studentName || 'Student'}</strong>
                    <span style={{ fontWeight: 600 }}>{pickScore(item)}/{pickMax(item)}</span>
                  </div>
                  {item.feedback && (
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>
                      {item.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluation;
