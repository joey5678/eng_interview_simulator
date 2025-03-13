import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>AI 英语助手</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              面试模拟
            </Link>
          </li>
          <li>
            <Link 
              to="/speaking-practice" 
              className={location.pathname === '/speaking-practice' ? 'active' : ''}
            >
              口语练习
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;