import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, setAdminToken } from '../services/api.js';
import logo from '../assets/images/logo.png';
import './AdminLogin.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('admin');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro('');
    try {
      const data = await loginAdmin(username, senha);
      setAdminToken(data.access);
      navigate('/admin');
    } catch (error) {
      setErro('Usuario ou senha invalidos.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>SILVEIRA TREINAMENTOS</h2>
        {erro && <p className="erro">{erro}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Usuario"
            required
          />
          <input
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="Senha"
            required
          />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
