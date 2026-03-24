import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserToken } from '../services/api.js';

const RequireUser = ({ children }) => {
  const token = getUserToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default RequireUser;
