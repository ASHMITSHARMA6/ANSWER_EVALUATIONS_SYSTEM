import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ onLogout }) => {
  const loc = useLocation();
  const isActive = (p) => (loc.pathname === p ? 'nav-link active' : 'nav-link');

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="nav-brand">TES</Link>
        <div className="nav-links">
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
          <Link to="/upload-material" className={isActive('/upload-material')}>Material</Link>
          <Link to="/material-library" className={isActive('/material-library')}>Material Library</Link>
          <Link to="/generate-questions" className={isActive('/generate-questions')}>Questions</Link>
          <Link to="/upload-model-answer" className={isActive('/upload-model-answer')}>Model Answer</Link>
          <Link to="/upload-student-answer" className={isActive('/upload-student-answer')}>Student Answer</Link>
          <Link to="/batch-upload-answers" className={isActive('/batch-upload-answers')}>Batch Upload</Link>
          <Link to="/marking-schemes" className={isActive('/marking-schemes')}>Marking Schemes</Link>
          <Link to="/evaluate" className={isActive('/evaluate')}>Evaluate</Link>
          <Link to="/results" className={isActive('/results')}>Results</Link>
        </div>
        <button type="button" className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
