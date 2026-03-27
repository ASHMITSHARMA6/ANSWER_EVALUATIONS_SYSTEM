import React, { useState, useRef, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import TestSelector from './TestSelector';

const QuestionGenerator = () => {
  const [questions, setQuestions] = useState([]);
  const [questionPairs, setQuestionPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(5);
  const [prompt, setPrompt] = useState(''); // Custom prompt/query
  const [chapterName, setChapterName] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [referencedMaterials, setReferencedMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [testNameMap, setTestNameMap] = useState({});
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sessionId, setSessionId] = useState(null); // Track question set session
  const [generationCount, setGenerationCount] = useState(0); // Track how many times generated
  const [paperFile, setPaperFile] = useState(null);
  const [paperText, setPaperText] = useState('');
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperMaxMarks, setPaperMaxMarks] = useState(10);
  const [paperInfo, setPaperInfo] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(localStorage.getItem('selectedTestId') || '');
  const questionsContainerRef = useRef(null);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedTestId) {
        setChapters([]);
        setChapterName('');
        setChapterNumber('');
        setSelectedChapters([]);
        setReferencedMaterials([]);
        setSelectedMaterialId('');
        return;
      }
      setChaptersLoading(true);
      try {
        const refsRes = await axiosInstance.get(`/material-library/references?testId=${selectedTestId}`);
        const refs = refsRes.data.references || [];
        const testsRes = await axiosInstance.get('/tests');
        const tests = testsRes.data?.tests || [];
        const map = tests.reduce((acc, t) => {
          acc[t._id] = t.name;
          return acc;
        }, {});
        setTestNameMap(map);
        setReferencedMaterials(refs);
        const defaultMaterialId = refs[0]?.id || '';
        setSelectedMaterialId(defaultMaterialId);

        const chaptersRes = await axiosInstance.get(`/material-library/chapters?testId=${selectedTestId}${defaultMaterialId ? `&materialId=${defaultMaterialId}` : ''}`);
        setChapters(chaptersRes.data.chapters || []);
        setSelectedChapters([]);
      } catch (err) {
        setChapters([]);
        setError(err?.response?.data?.error || 'Failed to load chapters');
      } finally {
        setChaptersLoading(false);
      }
    };

    fetchChapters();
  }, [selectedTestId]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      if (!selectedTestId) {
        setError('Please select a test first.');
        setLoading(false);
        return;
      }
      const res = await axiosInstance.post('/generate-questions', { 
        numQuestions: count,
        customPrompt: prompt, // Send custom prompt to backend
        chapterName: chapterName.trim() || undefined,
        chapterNumber: chapterNumber.trim() || undefined,
        chapterSelections: selectedChapters.map((chapter) => ({
          number: chapter.number || '',
          name: chapter.name || '',
          title: chapter.title || ''
        })),
        materialId: selectedMaterialId || undefined,
        sessionId: sessionId || undefined, // Pass previous session ID to avoid repetition
        testId: selectedTestId
      });
      const responseQuestions = res.data.questions || [];
      const responseModelAnswers = res.data.modelAnswers || [];
      const responsePairs = res.data.questionPairs || responseQuestions.map((q, i) => ({
        question: q,
        modelAnswer: responseModelAnswers[i] || ''
      }));

      setQuestionPairs(responsePairs);
      setQuestions(responseQuestions);
      // Store the question set ID for next generation
      setSessionId(res.data.questionSetId);
      setGenerationCount(generationCount + 1);
    } catch (err) {
      setError(err?.response?.data?.error || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionPaperUpload = async () => {
    setPaperLoading(true);
    setError('');
    setPaperInfo(null);
    try {
      if (!selectedTestId) {
        setError('Please select a test first.');
        setPaperLoading(false);
        return;
      }

      if (!paperFile && !paperText.trim()) {
        setError('Upload a PDF question paper or paste question text.');
        setPaperLoading(false);
        return;
      }

      let res;
      if (paperFile) {
        const formData = new FormData();
        formData.append('file', paperFile);
        formData.append('testId', selectedTestId);
        formData.append('maxMarks', String(paperMaxMarks));
        res = await axiosInstance.post('/question-paper', formData);
      } else {
        res = await axiosInstance.post('/question-paper', {
          testId: selectedTestId,
          questionPaper: paperText.trim(),
          maxMarks: paperMaxMarks
        });
      }

      const responseQuestions = res.data.questions || [];
      const responseModelAnswers = res.data.modelAnswers || [];
      const responsePairs = res.data.questionPairs || responseQuestions.map((q, i) => ({
        question: q,
        modelAnswer: responseModelAnswers[i] || ''
      }));

      setQuestionPairs(responsePairs);
      setQuestions(responseQuestions);
      setSessionId(res.data.questionSetId || null);
      setGenerationCount(0);
      setPaperInfo({
        extractedBy: res.data.extractedBy,
        totalQuestions: res.data.totalQuestions
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Question paper processing failed.');
    } finally {
      setPaperLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!questionsContainerRef.current) return;
    
    setDownloadingPDF(true);
    try {
      // Capture the questions container as canvas
      const canvas = await html2canvas(questionsContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image to PDF
      const pageData = canvas.toDataURL('image/png');
      pdf.addImage(pageData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add pages if content exceeds one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(pageData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      const fileName = `question-paper-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF download failed:', err);
      setError('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div style={{
      maxWidth: 700,
      margin: '2rem auto',
      padding: '2rem',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ color: '#185a9d', marginBottom: 24 }}>Generate Question Paper</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Generate deeply relevant and specific questions from your uploaded study material. Each click generates NEW questions, avoiding repetition.</p>

  <TestSelector onChange={setSelectedTestId} allowCreate={false} />

      <div style={{
        marginBottom: 24,
        padding: '16px',
        border: '1px solid #e0e0e0',
        borderRadius: '10px',
        background: '#fafafa'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 10, color: '#185a9d' }}>📄 Upload Question Paper (AI Model Answers)</h3>
        <p style={{ fontSize: '12px', color: '#777', marginTop: 0 }}>
          Upload a PDF or paste question paper text. The AI will extract questions and generate model answers using your study material.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, color: '#333' }}>Question paper PDF (optional)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
            style={{ display: 'block', marginTop: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, color: '#333' }}>Or paste question paper text</label>
          <textarea
            value={paperText}
            onChange={(e) => setPaperText(e.target.value)}
            placeholder="Paste questions here (e.g., 1. Explain normalization...)"
            style={{
              width: '100%',
              padding: '10px',
              marginTop: 8,
              border: '1px solid #bdbdbd',
              borderRadius: '6px',
              fontSize: 14,
              fontFamily: 'inherit',
              minHeight: '90px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 500, color: '#333' }}>Default marks per question</label>
          <input
            type="number"
            min={1}
            max={100}
            value={paperMaxMarks}
            onChange={(e) => setPaperMaxMarks(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: 8,
              border: '1px solid #bdbdbd',
              borderRadius: '6px',
              fontSize: 16
            }}
          />
        </div>

        <button
          onClick={handleQuestionPaperUpload}
          disabled={paperLoading}
          style={{
            background: '#185a9d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 18px',
            fontSize: 15,
            fontWeight: 600,
            cursor: paperLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {paperLoading ? 'Processing Question Paper...' : 'Extract Questions + Generate Model Answers'}
        </button>

        {paperInfo && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#5f6b7a' }}>
            Extracted {paperInfo.totalQuestions || 0} questions ({paperInfo.extractedBy === 'ai' ? 'AI extraction' : 'pattern detection'}).
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, color: '#333' }}>Number of questions to generate:</label>
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: 8,
            border: '1px solid #bdbdbd',
            borderRadius: '6px',
            fontSize: 16
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, color: '#333' }}>📝 Custom Prompt (Optional)</label>
        <p style={{ fontSize: '12px', color: '#999', margin: '5px 0' }}>
          Describe what kind of questions you want. Example: "Generate tricky questions about database concepts" or "Create beginner-friendly multiple choice questions"
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Generate questions about normalization, focusing on 3NF and BCNF concepts... (Leave empty for general questions)"
          style={{
            width: '100%',
            padding: '12px',
            marginTop: 8,
            border: '1px solid #bdbdbd',
            borderRadius: '6px',
            fontSize: 14,
            fontFamily: 'inherit',
            minHeight: '80px',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, color: '#333' }}>📚 Source Material (Referenced)</label>
        <p style={{ fontSize: '12px', color: '#999', margin: '5px 0' }}>
          Chapters are extracted from the referenced material you select.
        </p>
        <select
          value={selectedMaterialId}
          onChange={async (e) => {
            const nextId = e.target.value;
            setSelectedMaterialId(nextId);
            setSelectedChapters([]);
            if (!selectedTestId) return;
            setChaptersLoading(true);
            try {
              const chaptersRes = await axiosInstance.get(`/material-library/chapters?testId=${selectedTestId}${nextId ? `&materialId=${nextId}` : ''}`);
              setChapters(chaptersRes.data.chapters || []);
            } catch (err) {
              setChapters([]);
              setError(err?.response?.data?.error || 'Failed to load chapters');
            } finally {
              setChaptersLoading(false);
            }
          }}
          disabled={chaptersLoading || referencedMaterials.length === 0}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #bdbdbd',
            borderRadius: '6px',
            fontSize: 14
          }}
        >
          {referencedMaterials.length === 0 ? (
            <option value="">No referenced materials for this test</option>
          ) : (
            referencedMaterials.map((ref) => {
              const match = String(ref.canonicalTitle || '').match(/([0-9a-fA-F]{24})/);
              const testName = match ? testNameMap[match[1]] : '';
              return (
                <option key={ref.id} value={ref.id}>
                  {testName ? `Material for ${testName}` : (ref.canonicalTitle || ref.id)}
                </option>
              );
            })
          )}
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 500, color: '#333' }}>📚 Chapter Filter (Optional)</label>
        <p style={{ fontSize: '12px', color: '#999', margin: '5px 0' }}>
          Select one or more chapters detected from your material. Leave empty to use the full material.
        </p>
        <div style={{
          border: '1px solid #bdbdbd',
          borderRadius: '6px',
          padding: '10px',
          background: '#fff'
        }}>
          {chapters.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#999' }}>No chapter headings detected in this material.</div>
          ) : (
            chapters.map((chapter, index) => {
              const key = `${chapter.number || ''}::${chapter.name || ''}::${index}`;
              const isChecked = selectedChapters.some((item) => item.number === chapter.number && item.name === chapter.name);
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      setChapterNumber('');
                      setChapterName('');
                      if (e.target.checked) {
                        setSelectedChapters((prev) => [...prev, chapter]);
                      } else {
                        setSelectedChapters((prev) => prev.filter((item) => !(item.number === chapter.number && item.name === chapter.name)));
                      }
                    }}
                  />
                  <span>{chapter.title || `Chapter ${chapter.number || index + 1}`}</span>
                </label>
              );
            })
          )}
        </div>
        {chaptersLoading && (
          <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>Loading chapters...</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          style={{
            flex: 1,
            background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Generating Questions...' : 'Generate Questions'}
        </button>
        
        {generationCount > 0 && (
          <button 
            onClick={() => {
              setQuestions([]);
              setQuestionPairs([]);
              setSessionId(null);
              setGenerationCount(0);
              setError('');
            }}
            style={{
              background: '#ff6f00',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🔄 Reset Session
          </button>
        )}
      </div>

      {generationCount > 0 && (
        <div style={{
          background: '#e3f2fd',
          color: '#1976d2',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ✨ Session active: {generationCount} generation{generationCount !== 1 ? 's' : ''} | System remembers past questions to avoid repetition
        </div>
      )}

      {error && <div style={{ color: '#e53935', marginTop: 12, padding: 12, background: '#ffebee', borderRadius: 6 }}>{error}</div>}

      {questions.length > 0 && (
        <div>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginTop: 24,
            marginBottom: 24
          }}>
            <button
              onClick={downloadPDF}
              disabled={downloadingPDF}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                opacity: downloadingPDF ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              📥 {downloadingPDF ? 'Downloading...' : 'Download as PDF'}
            </button>
          </div>

          <div 
            ref={questionsContainerRef}
            style={{
              padding: '24px',
              background: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#185a9d', marginTop: 0, marginBottom: 0 }}>Generated Questions (Set #{generationCount})</h3>
              <span style={{ background: '#2575fc', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                {questions.length} questions
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ fontWeight: 600, color: '#185a9d' }}>Question</div>
              <div style={{ fontWeight: 600, color: '#185a9d' }}>Model Answer (AI)</div>
              {questionPairs.map((pair, i) => (
                <React.Fragment key={i}>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e0e0e0' }}>
                    <strong>Q{i + 1}.</strong> {pair.question}
                  </div>
                  <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #e0e0e0' }}>
                    {pair.modelAnswer || 'Not available'}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;
