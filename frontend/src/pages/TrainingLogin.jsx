import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import './TrainingLogin.css';

const TrainingLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith('@silveiracontabilidade.com.br')) {
      setErro('Use um e-mail @silveiracontabilidade.com.br');
      return;
    }
    setErro('');
    const ok = await onLogin(normalized, senha);
    if (ok) {
      navigate('/');
    } else {
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
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@silveiracontabilidade.com.br"
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

export default TrainingLogin;
