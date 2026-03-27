import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const Evaluation = () => {
  const [result, setResult] = useState(null);
  const [maxMarks, setMaxMarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
    const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');

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
      const body = maxMarks !== '' ? { maxMarks: Number(maxMarks), testId: selectedTestId } : { testId: selectedTestId };
      const res = await axiosInstance.post('/evaluate-answer', body);
      setResult(res.data);
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
            <p><strong>Marks:</strong> {result.marks} / {result.maxMarks}</p>
            <p className="eval-hint">Saved to Results. You can run more evaluations with new model/student uploads.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluation;
