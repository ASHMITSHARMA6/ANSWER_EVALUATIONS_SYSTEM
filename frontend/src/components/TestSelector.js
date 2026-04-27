import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const TestSelector = ({ onChange, allowCreate = false }) => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const [newTestName, setNewTestName] = useState('');
  const [newTestDescription, setNewTestDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get('/tests');
      const list = res.data?.tests || [];
      setTests(list);

      if (!selectedTestId && list.length > 0) {
        const defaultId = list[0]._id;
        setSelectedTestId(defaultId);
        localStorage.setItem('selectedTestId', defaultId);
        localStorage.setItem('selectedTestName', list[0].name || '');
        window.dispatchEvent(new Event('selected-test-updated'));
        if (onChange) onChange(defaultId);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedTestId(id);
    const selected = tests.find((t) => t._id === id);
    localStorage.setItem('selectedTestId', id || '');
    localStorage.setItem('selectedTestName', selected?.name || '');
    window.dispatchEvent(new Event('selected-test-updated'));
    if (onChange) onChange(id);
  };

  const handleCreate = async () => {
    if (!newTestName.trim()) {
      setError('Test name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.post('/tests', {
        name: newTestName.trim(),
        description: newTestDescription.trim(),
      });
      const created = res.data?.test;
      if (created) {
        const nextList = [created, ...tests];
        setTests(nextList);
        setSelectedTestId(created._id);
        localStorage.setItem('selectedTestId', created._id);
        localStorage.setItem('selectedTestName', created.name || '');
        window.dispatchEvent(new Event('selected-test-updated'));
        setNewTestName('');
        setNewTestDescription('');
        if (onChange) onChange(created._id);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#f8fbff',
      border: '1px solid #dce7f5',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, color: '#185a9d' }}>🧪 Select Test</h3>
      <p style={{ marginTop: 0, color: '#5f6b7a', fontSize: '13px' }}>
        Choose the test environment you want to work in. Each test keeps its own material, model answers, and student answers.
      </p>

      {error && <div style={{ color: '#c0392b', marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={selectedTestId}
          onChange={handleSelect}
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccd7e4', minWidth: 220 }}
        >
          <option value="">Select a test...</option>
          {tests.map((test) => (
            <option key={test._id} value={test._id}>
              {test.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchTests}
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccd7e4', background: '#fff', cursor: 'pointer' }}
        >
          🔄 Refresh
        </button>
      </div>

      {allowCreate && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Create new test</div>
          <input
            type="text"
            value={newTestName}
            onChange={(e) => setNewTestName(e.target.value)}
            placeholder="Test name (e.g., Unit 3 Midterm)"
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccd7e4', marginBottom: 8 }}
          />
          <input
            type="text"
            value={newTestDescription}
            onChange={(e) => setNewTestDescription(e.target.value)}
            placeholder="Optional description"
            style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccd7e4', marginBottom: 8 }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#2575fc', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            ➕ Create Test
          </button>
        </div>
      )}
    </div>
  );
};

export default TestSelector;
