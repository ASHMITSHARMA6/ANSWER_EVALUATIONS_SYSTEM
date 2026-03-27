import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const MaterialLibrary = () => {
  const [materials, setMaterials] = useState([]);
  const [references, setReferences] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [testNameMap, setTestNameMap] = useState({});

  const referencedIds = useMemo(() => new Set(references.map((r) => String(r.canonicalMaterialId))), [references]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/material-library');
      setMaterials(response.data.materials || []);
      const testsResponse = await axiosInstance.get('/tests');
      const tests = testsResponse.data?.tests || [];
      const map = tests.reduce((acc, t) => {
        acc[t._id] = t.name;
        return acc;
      }, {});
      setTestNameMap(map);
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to load material library');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const resolveTestName = (material) => {
    if (material.sourceTestName) return material.sourceTestName;
    const match = String(material.title || '').match(/([0-9a-fA-F]{24})/);
    if (match && testNameMap[match[1]]) return testNameMap[match[1]];
    return '';
  };

  const fetchReferences = async (testId) => {
    if (!testId) {
      setReferences([]);
      setSelectedMaterialIds([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/material-library/references?testId=${testId}`);
      setReferences(response.data.references || []);
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to load material references');
      setIsError(true);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    fetchReferences(selectedTestId);
  }, [selectedTestId]);

  const handleReference = async (materialIds) => {
    if (!selectedTestId) {
      setMessage('Please select a test first.');
      setIsError(true);
      return;
    }
    if (!materialIds || materialIds.length === 0) {
      setMessage('Please select a material to reference.');
      setIsError(true);
      return;
    }

    setMessage('');
    setIsError(false);
    try {
      for (const materialId of materialIds) {
        // eslint-disable-next-line no-await-in-loop
        await axiosInstance.post('/material-library/reference', {
          testId: selectedTestId,
          canonicalMaterialId: materialId
        });
      }
      setMessage('Selected materials referenced successfully');
      setIsError(false);
      await fetchReferences(selectedTestId);
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to reference material');
      setIsError(true);
    }
  };

  return (
    <div className="page">
      <h1>Material Library</h1>
      <p className="page-desc">
        Reuse canonical study materials across test environments. Select a test and reference the material you want to reuse.
      </p>

      <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => handleReference(selectedMaterialIds)}
          disabled={selectedMaterialIds.length === 0 || !selectedTestId}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: selectedMaterialIds.length === 0 || !selectedTestId ? '#95a5a6' : '#3498db',
            color: '#fff',
            cursor: selectedMaterialIds.length === 0 || !selectedTestId ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔗 Reference Selected Materials
        </button>
        {selectedMaterialIds.length > 0 && (
          <span style={{ fontSize: '12px', color: '#666' }}>
            Selected: {selectedMaterialIds.length}
          </span>
        )}
      </div>

      <div className="form-card" style={{ marginTop: '20px' }}>
        <h2 style={{ marginTop: 0 }}>📚 Canonical Materials</h2>
        {loading ? (
          <p style={{ color: '#666' }}>Loading library...</p>
        ) : materials.length === 0 ? (
          <p style={{ color: '#666' }}>No canonical materials yet. Upload study material to auto-add items here.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {materials.map((m) => {
              const isReferenced = referencedIds.has(String(m.id));
              const isSelected = selectedMaterialIds.includes(String(m.id));
              return (
                <div key={m.id} style={{
                  border: '1px solid #dfe6e9',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: isSelected ? '#f3f8ff' : '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        name="selected-material"
                        checked={isSelected}
                        onChange={(e) => {
                          const id = String(m.id);
                          if (e.target.checked) {
                            setSelectedMaterialIds((prev) => [...prev, id]);
                          } else {
                            setSelectedMaterialIds((prev) => prev.filter((item) => item !== id));
                          }
                        }}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      <div>
                        <h3 style={{ margin: '0 0 6px 0' }}>
                          {resolveTestName(m) ? `Material for ${resolveTestName(m)}` : (m.title || 'Canonical Material')}
                        </h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                          {m.contentLength || 0} characters • {m.preview ? `${m.preview}...` : 'No preview'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const id = String(m.id);
                        setSelectedMaterialIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                        handleReference([id]);
                      }}
                      disabled={isReferenced || !selectedTestId}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isReferenced ? '#95a5a6' : '#3498db',
                        color: '#fff',
                        cursor: isReferenced || !selectedTestId ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {isReferenced ? '✅ Referenced' : '🔗 Reference to test'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default MaterialLibrary;
