import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UploadMaterial from './components/UploadMaterial';
import MaterialLibrary from './components/MaterialLibrary';
import QuestionGenerator from './components/QuestionGenerator';
import UploadModelAnswer from './components/UploadModelAnswer';
import UploadStudentAnswer from './components/UploadStudentAnswer';
import BatchUploadAnswers from './components/BatchUploadAnswers';
import Evaluation from './components/Evaluation';
import ResultsView from './components/ResultsView';
import MarkingScheme from './components/MarkingScheme';
import OCRUploadHandwritten from './components/OCRUploadHandwritten';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogin = (t) => {
    setToken(t);
    localStorage.setItem('token', t);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    const onLogout = () => setToken(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <main className="app-main">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload-material" element={<UploadMaterial />} />
          <Route path="/material-library" element={<MaterialLibrary />} />
          <Route path="/generate-questions" element={<QuestionGenerator />} />
          <Route path="/upload-model-answer" element={<UploadModelAnswer />} />
          <Route path="/upload-student-answer" element={<UploadStudentAnswer />} />
          <Route path="/batch-upload-answers" element={<BatchUploadAnswers />} />
          <Route path="/ocr-handwritten" element={<OCRUploadHandwritten />} />
          <Route path="/marking-schemes" element={<MarkingScheme />} />
          <Route path="/evaluate" element={<Evaluation />} />
          <Route path="/results" element={<ResultsView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
