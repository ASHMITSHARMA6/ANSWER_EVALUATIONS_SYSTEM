import React, { useState, useEffect } from 'react';
import axios from '../api/axiosInstance';
import './MarkingScheme.css';

const MarkingScheme = () => {
  const [schemes, setSchemes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [selectedSchemeForPdf, setSelectedSchemeForPdf] = useState(null);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'pdf'

  const [formData, setFormData] = useState({
    questionText: '',
    description: 'Standard marking scheme',
    questions: [], // Array of questions with marks
    keyConcepts: [],
    markingLevels: [],
    commonMistakes: [],
    bonusMarks: []
  });

  const [newQuestion, setNewQuestion] = useState({
    text: '',
    marks: 10
  });

  const [newConcept, setNewConcept] = useState({
    concept: '',
    marks: 1,
    description: '',
    isRequired: false
  });

  const [newMistake, setNewMistake] = useState({
    mistake: '',
    marksDeduction: 0,
    explanation: ''
  });

  // Fetch all marking schemes
  useEffect(() => {
    console.log('MarkingScheme component loaded with PDF feature');
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/marking-schemes');
      setSchemes(response.data.schemes || []);
    } catch (error) {
      console.error('Error fetching marking schemes:', error);
      alert('Failed to load marking schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) {
      alert('Please enter a question');
      return;
    }
    if (newQuestion.marks < 1) {
      alert('Marks must be at least 1');
      return;
    }
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...newQuestion }]
    });
    setNewQuestion({
      text: '',
      marks: 10
    });
  };

  const handleRemoveQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const handleAddConcept = () => {
    if (!newConcept.concept.trim()) {
      alert('Please enter a concept');
      return;
    }
    setFormData({
      ...formData,
      keyConcepts: [...formData.keyConcepts, newConcept]
    });
    setNewConcept({
      concept: '',
      marks: 1,
      description: '',
      isRequired: false
    });
  };

  const handleRemoveConcept = (index) => {
    setFormData({
      ...formData,
      keyConcepts: formData.keyConcepts.filter((_, i) => i !== index)
    });
  };

  const handleAddMistake = () => {
    if (!newMistake.mistake.trim()) {
      alert('Please enter a mistake description');
      return;
    }
    setFormData({
      ...formData,
      commonMistakes: [...formData.commonMistakes, newMistake]
    });
    setNewMistake({
      mistake: '',
      marksDeduction: 0,
      explanation: ''
    });
  };

  const handleRemoveMistake = (index) => {
    setFormData({
      ...formData,
      commonMistakes: formData.commonMistakes.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.questionText.trim()) {
      alert('Please enter a scheme title');
      return;
    }

    try {
      setLoading(true);
      const endpoint = editingId ? `/marking-schemes/${editingId}` : '/marking-schemes';
      const method = editingId ? 'put' : 'post';

      const response = await axios[method](endpoint, formData);
      
      alert(response.data.message || 'Marking scheme saved successfully');
      
      fetchSchemes();
      resetForm();
    } catch (error) {
      console.error('Error saving marking scheme:', error);
      alert(error.response?.data?.error || 'Failed to save marking scheme');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scheme) => {
    const safeQuestions = Array.isArray(scheme.questions) ? scheme.questions : [];
    const safeKeyConcepts = Array.isArray(scheme.keyConcepts) ? scheme.keyConcepts : [];
    const safeMarkingLevels = Array.isArray(scheme.markingLevels) ? scheme.markingLevels : [];
    const safeCommonMistakes = Array.isArray(scheme.commonMistakes) ? scheme.commonMistakes : [];
    const safeBonusMarks = Array.isArray(scheme.bonusMarks) ? scheme.bonusMarks : [];

    setFormData({
      questionText: scheme.questionText || '',
      description: scheme.description || 'Standard marking scheme',
      questions: safeQuestions,
      keyConcepts: safeKeyConcepts,
      markingLevels: safeMarkingLevels,
      commonMistakes: safeCommonMistakes,
      bonusMarks: safeBonusMarks
    });
    setEditingId(scheme._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this marking scheme?')) {
      try {
        setLoading(true);
        await axios.delete(`/marking-schemes/${id}`);
        alert('Marking scheme deleted');
        fetchSchemes();
      } catch (error) {
        console.error('Error deleting marking scheme:', error);
        alert('Failed to delete marking scheme');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      questionText: '',
      description: 'Standard marking scheme',
      questions: [],
      keyConcepts: [],
      markingLevels: [],
      commonMistakes: [],
      bonusMarks: []
    });
    setNewQuestion({ text: '', marks: 10 });
    setNewConcept({ concept: '', marks: 1, description: '', isRequired: false });
    setNewMistake({ mistake: '', marksDeduction: 0, explanation: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handlePdfUpload = async (schemeId) => {
    if (!pdfFile) {
      alert('Please select a PDF file');
      return;
    }

    try {
      setPdfUploading(true);
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      console.log('[MarkingScheme] Uploading PDF:', pdfFile.name, 'Size:', pdfFile.size);

      const response = await axios.post(
        `/marking-schemes/${schemeId}/upload-pdf`,
        formData
        // Do NOT set Content-Type header - let axios/browser set it with proper boundary
      );

      console.log('[MarkingScheme] Upload response:', response.data);
      alert('PDF uploaded and processed successfully!');
      setPdfFile(null);
      setSelectedSchemeForPdf(null);
      fetchSchemes(); // Refresh the list
    } catch (error) {
      console.error('[MarkingScheme] Error uploading PDF:', error);
      console.error('[MarkingScheme] Error response:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to upload PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <div className="marking-scheme-container">
      <div className="scheme-header">
        <h2>📋 Marking Schemes</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ New Marking Scheme'}
        </button>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="scheme-form-container">
          <form onSubmit={handleSubmit} className="marking-form">
            <h3>{editingId ? 'Edit' : 'Create'} Marking Scheme</h3>

            {/* Tabs */}
            <div className="tabs-container">
              <button
                className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                ✍️ Manual Entry
              </button>
              <button
                className={`tab-button ${activeTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveTab('pdf')}
              >
                📄 Upload PDF
              </button>
            </div>

            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
              <>
                {/* Scheme Title */}
                <div className="form-group">
                  <label>Marking Scheme Title *</label>
                  <input
                    type="text"
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    placeholder="e.g., Unit Test 1, Mid-term Exam, etc."
                    required
                  />
                </div>

                {/* Questions & Marks Adder */}
                <div className="form-section">
                  <h4>📋 Add Questions & Assign Marks (Optional)</h4>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Question</label>
                      <textarea
                        value={newQuestion.text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                        placeholder="Enter a question"
                        rows="3"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginLeft: '10px' }}>
                      <label>Marks</label>
                      <input
                        type="number"
                        value={newQuestion.marks}
                        onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })}
                        min="1"
                        max="100"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddQuestion}
                        className="btn-small"
                        style={{ marginTop: '10px', width: '100%' }}
                      >
                        ➕ Add Question
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  {formData.questions.length > 0 && (
                    <div className="questions-list" style={{ marginTop: '20px' }}>
                      <h5>📌 Questions Added ({formData.questions.length})</h5>
                      {formData.questions.map((question, idx) => (
                        <div key={idx} className="question-item" style={{
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{ flex: 1 }}>
                            <strong>Q{idx + 1}:</strong> {question.text}
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                              Marks: <strong>{question.marks}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="btn-remove"
                            style={{ marginLeft: '10px' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div style={{
                        backgroundColor: '#e7f3ff',
                        padding: '10px',
                        borderRadius: '4px',
                        marginTop: '10px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#0c5460'
                      }}>
                        Total Marks: {formData.questions.reduce((sum, q) => sum + q.marks, 0)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Standard marking scheme"
                  />
                </div>

            {/* Key Concepts */}
            <div className="form-section">
              <h4>Key Concepts</h4>
              <div className="concept-input-group">
                <input
                  type="text"
                  value={newConcept.concept}
                  onChange={(e) => setNewConcept({ ...newConcept, concept: e.target.value })}
                  placeholder="Concept name"
                />
                <input
                  type="number"
                  value={newConcept.marks}
                  onChange={(e) => setNewConcept({ ...newConcept, marks: parseInt(e.target.value) })}
                  placeholder="Marks"
                  min="0"
                  style={{ width: '80px' }}
                />
                <input
                  type="text"
                  value={newConcept.description}
                  onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                  placeholder="Description (optional)"
                />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={newConcept.isRequired}
                    onChange={(e) => setNewConcept({ ...newConcept, isRequired: e.target.checked })}
                  />
                  Required
                </label>
                <button type="button" onClick={handleAddConcept} className="btn-small">
                  Add
                </button>
              </div>

              {formData.keyConcepts.length > 0 && (
                <div className="concepts-list">
                  {formData.keyConcepts.map((concept, idx) => (
                    <div key={idx} className="concept-item">
                      <span>{concept.concept} ({concept.marks}m)</span>
                      {concept.isRequired && <span className="badge">Required</span>}
                      {concept.description && <span className="desc">{concept.description}</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveConcept(idx)}
                        className="btn-remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Common Mistakes */}
            <div className="form-section">
              <h4>Common Mistakes</h4>
              <div className="mistake-input-group">
                <input
                  type="text"
                  value={newMistake.mistake}
                  onChange={(e) => setNewMistake({ ...newMistake, mistake: e.target.value })}
                  placeholder="Mistake description"
                />
                <input
                  type="number"
                  value={newMistake.marksDeduction}
                  onChange={(e) => setNewMistake({ ...newMistake, marksDeduction: parseInt(e.target.value) })}
                  placeholder="Deduction"
                  min="0"
                  style={{ width: '100px' }}
                />
                <input
                  type="text"
                  value={newMistake.explanation}
                  onChange={(e) => setNewMistake({ ...newMistake, explanation: e.target.value })}
                  placeholder="Explanation (optional)"
                />
                <button type="button" onClick={handleAddMistake} className="btn-small">
                  Add
                </button>
              </div>

              {formData.commonMistakes.length > 0 && (
                <div className="mistakes-list">
                  {formData.commonMistakes.map((mistake, idx) => (
                    <div key={idx} className="mistake-item">
                      <span>{mistake.mistake}</span>
                      {mistake.marksDeduction > 0 && (
                        <span className="deduction">-{mistake.marksDeduction}m</span>
                      )}
                      {mistake.explanation && <span className="desc">{mistake.explanation}</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveMistake(idx)}
                        className="btn-remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '💾 Saving...' : '💾 Save Marking Scheme'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
              </>
            )}

            {/* PDF Upload Tab */}
            {activeTab === 'pdf' && (
              <>
                <div className="pdf-tab-container">
                  <div className="pdf-info-section">
                    <h4>📄 Upload PDF Marking Scheme</h4>
                    <p>Upload a PDF file containing your marking scheme. The system will extract the text and use it for evaluation.</p>
                  </div>

                  <div className="form-group">
                    <label>PDF File *</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="pdf-file-input-large"
                      required
                    />
                    {pdfFile && (
                      <div className="pdf-file-info">
                        <span>✓ Selected: {pdfFile.name}</span>
                        <span className="file-size">({(pdfFile.size / 1024).toFixed(2)} KB)</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add notes about this marking scheme"
                      rows="2"
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!pdfFile) {
                          alert('Please select a PDF file');
                          return;
                        }

                        try {
                          setPdfUploading(true);
                          
                          // First, save the scheme with minimal data
                          const schemeToUpload = { 
                            ...formData, 
                            questionText: `Marking Scheme - ${pdfFile.name}`
                          };

                          let schemeId = editingId;
                          if (!editingId) {
                            const response = await axios.post('/marking-schemes', schemeToUpload);
                            schemeId = response.data.scheme._id;
                          }

                          // Then upload the PDF
                          const uploadFormData = new FormData();
                          uploadFormData.append('pdf', pdfFile);
                          
                          await axios.post(
                            `/marking-schemes/${schemeId}/upload-pdf`,
                            uploadFormData,
                            { headers: { 'Content-Type': 'multipart/form-data' } }
                          );

                          alert('✅ Marking scheme and PDF uploaded successfully!');
                          resetForm();
                          fetchSchemes();
                        } catch (error) {
                          console.error('Error:', error);
                          alert(error.response?.data?.error || 'Failed to upload scheme');
                        } finally {
                          setPdfUploading(false);
                        }
                      }}
                      className="btn-primary"
                      disabled={pdfUploading || !pdfFile}
                    >
                      {pdfUploading ? '⏳ Processing...' : '⬆ Upload Scheme & PDF'}
                    </button>
                    <button type="button" onClick={resetForm} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Schemes List */}
      <div className="schemes-list">
        {loading && !showForm && <p className="loading">Loading schemes...</p>}
        
        {!loading && schemes.length === 0 && !showForm && (
          <div className="empty-state">
            <p>No marking schemes yet</p>
            <p className="hint">Create one to define detailed marking criteria for your questions</p>
          </div>
        )}

        {schemes.map((scheme) => (
          <div key={scheme._id} className="scheme-card">
            <div className="scheme-header-card">
              <h3>{scheme.questionText.substring(0, 60)}...</h3>
              <span className="scheme-marks">{scheme.maxMarks} marks</span>
            </div>

            {scheme.description && (
              <p className="scheme-description">{scheme.description}</p>
            )}

            {scheme.keyConcepts && scheme.keyConcepts.length > 0 && (
              <div className="scheme-section">
                <strong>Key Concepts ({scheme.keyConcepts.reduce((sum, c) => sum + c.marks, 0)}m):</strong>
                <ul>
                  {scheme.keyConcepts.map((concept, idx) => (
                    <li key={idx}>
                      {concept.concept} ({concept.marks}m)
                      {concept.isRequired && ' [Required]'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scheme.commonMistakes && scheme.commonMistakes.length > 0 && (
              <div className="scheme-section">
                <strong>Common Mistakes:</strong>
                <ul>
                  {scheme.commonMistakes.map((mistake, idx) => (
                    <li key={idx}>
                      {mistake.mistake}
                      {mistake.marksDeduction > 0 && ` (-${mistake.marksDeduction}m)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="scheme-actions">
              <button 
                className="btn-edit"
                onClick={() => handleEdit(scheme)}
              >
                ✎ Edit
              </button>
              <button 
                className="btn-delete"
                onClick={() => handleDelete(scheme._id)}
              >
                🗑 Delete
              </button>
              <button
                className="btn-pdf"
                onClick={() => setSelectedSchemeForPdf(
                  selectedSchemeForPdf === scheme._id ? null : scheme._id
                )}
              >
                📄 {scheme.pdfMarkingScheme ? '✓ PDF' : 'Add PDF'}
              </button>
              <button
                className="btn-view"
                onClick={() => {
                  alert('Full Rubric:\n\n' + (scheme.rubric || 'No rubric generated'));
                }}
              >
                👁 View Rubric
              </button>
            </div>

            <small className="scheme-timestamp">
              Updated: {new Date(scheme.updatedAt).toLocaleDateString()}
            </small>

            {/* PDF Upload Section */}
            {selectedSchemeForPdf === scheme._id && (
              <div className="pdf-upload-section">
                <h5>📄 Upload Marking Scheme PDF</h5>
                <p className="pdf-hint">Upload a PDF containing the marking scheme. The text will be extracted and used for evaluation.</p>
                
                <div className="pdf-input-group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    disabled={pdfUploading}
                  />
                  <button
                    className="btn-upload-pdf"
                    onClick={() => handlePdfUpload(scheme._id)}
                    disabled={!pdfFile || pdfUploading}
                  >
                    {pdfUploading ? '⏳ Uploading...' : '⬆ Upload PDF'}
                  </button>
                  <button
                    className="btn-cancel-pdf"
                    onClick={() => {
                      setSelectedSchemeForPdf(null);
                      setPdfFile(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {scheme.pdfMarkingScheme && (
                  <div className="pdf-info">
                    <p className="pdf-uploaded">✓ PDF Uploaded: {scheme.pdfMarkingScheme.fileName}</p>
                    <p className="pdf-date">Uploaded on: {new Date(scheme.pdfMarkingScheme.uploadedAt).toLocaleDateString()}</p>
                    <p className="pdf-size">File size: {(scheme.pdfMarkingScheme.fileSize / 1024).toFixed(2)} KB</p>
                    <details className="pdf-preview">
                      <summary>Preview Extracted Text</summary>
                      <p>{scheme.pdfMarkingScheme.extractedText?.substring(0, 300)}...</p>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkingScheme;
