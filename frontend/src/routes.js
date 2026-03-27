import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import UploadMaterial from './components/UploadMaterial';
import QuestionGenerator from './components/QuestionGenerator';
import UploadModelAnswer from './components/UploadModelAnswer';
import UploadStudentAnswer from './components/UploadStudentAnswer';
import Evaluation from './components/Evaluation';
import ResultsView from './components/ResultsView';
import BatchUploadAnswers from './components/BatchUploadAnswers';
import MarkingScheme from './components/MarkingScheme';

const AppRoutes = () => (
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/upload-material" element={<UploadMaterial />} />
    <Route path="/generate-questions" element={<QuestionGenerator />} />
    <Route path="/upload-model-answer" element={<UploadModelAnswer />} />
    <Route path="/upload-student-answer" element={<UploadStudentAnswer />} />
    <Route path="/batch-upload-answers" element={<BatchUploadAnswers />} />
    <Route path="/marking-schemes" element={<MarkingScheme />} />
    <Route path="/evaluate" element={<Evaluation />} />
    <Route path="/results" element={<ResultsView />} />
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
);

export default AppRoutes;
