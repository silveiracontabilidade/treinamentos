import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminToken } from '../services/api.js';

const RequireAdmin = ({ children }) => {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

export default RequireAdmin;
