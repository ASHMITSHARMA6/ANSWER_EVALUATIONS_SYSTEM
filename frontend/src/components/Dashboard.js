import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import TestSelector from './TestSelector';

const Dashboard = () => {
  const [vectorStats, setVectorStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get('/debug/vector-db-stats');
        console.log('[Dashboard] Vector DB stats response:', response.data);
        setVectorStats(response.data);
      } catch (err) {
        console.error('[Dashboard] Failed to fetch vector DB stats:', err);
        // Set dummy data so dashboard doesn't crash
        setVectorStats({
          material: { size: 0, dimension: 384 },
          answers: { size: 0, dimension: 384 },
          dataFile: 'vector_db.json',
          fileExists: false
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Upload Study Material', path: '/upload-material', desc: 'Add text content for question generation' },
    { title: 'Material Library', path: '/material-library', desc: 'Reuse canonical materials across test environments' },
    { title: 'Generate Question Paper', path: '/generate-questions', desc: 'AI-generated questions from your material' },
    { title: 'Upload Model Answer', path: '/upload-model-answer', desc: 'Ideal answer and max marks per question' },
    { title: 'Upload Student Answer', path: '/upload-student-answer', desc: 'Paste student answer text' },
    { title: 'AI Evaluation', path: '/evaluate', desc: 'Compare and score using last model + student answer' },
    { title: 'View Results', path: '/results', desc: 'All evaluation results' },
  ];

  return (
    <div className="page dashboard-page">
      <h1>Teacher Dashboard</h1>
      <p className="page-desc">Choose a task to get started.</p>

      <TestSelector allowCreate={true} />

      {/* Vector DB Status Panel */}
      <div style={{
        backgroundColor: '#f0f4f8',
        border: '2px solid #2c3e50',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#2c3e50', fontSize: '18px' }}>🗄️ Vector Database Status</h2>
        
        {loading ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Loading database statistics...</p>
        ) : vectorStats && vectorStats.material && vectorStats.answers ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Material Embeddings */}
            <div style={{
              backgroundColor: '#e8f4f8',
              padding: '15px',
              borderRadius: '6px',
              borderLeft: '4px solid #3498db'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2980b9', fontSize: '16px' }}>📚 Study Materials</h3>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <div><strong>Stored:</strong> {vectorStats.material?.size || 0} chunks</div>
                <div><strong>Embedding Dimension:</strong> {vectorStats.material?.dimension || 384} (Hugging Face)</div>
                <div><strong>Status:</strong> <span style={{
                  color: (vectorStats.material?.size || 0) > 0 ? '#27ae60' : '#e67e22',
                  fontWeight: 'bold'
                }}>
                  {(vectorStats.material?.size || 0) > 0 ? '✅ Ready' : '⏳ Awaiting upload'}
                </span></div>
              </div>
            </div>

            {/* Answer Embeddings */}
            <div style={{
              backgroundColor: '#f0f8e8',
              padding: '15px',
              borderRadius: '6px',
              borderLeft: '4px solid #27ae60'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#229954', fontSize: '16px' }}>✍️ Student Answers</h3>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <div><strong>Stored:</strong> {vectorStats.answers?.size || 0} answers</div>
                <div><strong>Embedding Dimension:</strong> {vectorStats.answers?.dimension || 384} (Hugging Face)</div>
                <div><strong>Status:</strong> <span style={{
                  color: (vectorStats.answers?.size || 0) > 0 ? '#27ae60' : '#95a5a6',
                  fontWeight: 'bold'
                }}>
                  {(vectorStats.answers?.size || 0) > 0 ? '✅ Indexed' : '⏳ No answers yet'}
                </span></div>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#f39c12' }}>⚠️ Vector database statistics unavailable (may be initializing)</p>
        )}

        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: '#ecf0f1',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#555'
        }}>
          <strong>How it works:</strong> Each study material and answer is converted to a 384-dimensional vector using Hugging Face embeddings. These vectors are stored for semantic search and AI evaluation.
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map((c) => (
          <Link to={c.path} key={c.path} className="dashboard-card">
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
