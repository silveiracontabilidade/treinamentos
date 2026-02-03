import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import TrainingExplorer from './pages/TrainingExplorer.jsx';
import TrainingLogin from './pages/TrainingLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import {
  fetchCatalogo,
  iniciarTreinamento,
  concluirModulo,
  loginEmail,
  clearAdminToken,
  loginColaborador,
  setUserToken,
  clearUserToken,
  fetchMeuProgresso,
} from './services/api.js';

const AppShell = () => {
  const location = useLocation();
  const [departamentos, setDepartamentos] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState(localStorage.getItem('treinamentos_email') || '');
  const [userToken, setUserTokenState] = useState(localStorage.getItem('user_token') || '');
  const [progresso, setProgresso] = useState({});
  const [treinamentoStatus, setTreinamentoStatus] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState('');

  useEffect(() => {
    const carregarCatalogo = async () => {
      try {
        const data = await fetchCatalogo();
        if (Array.isArray(data)) {
          setDepartamentos(data);
        }
        setErroCatalogo('');
      } catch (error) {
        setDepartamentos([]);
        setErroCatalogo('Falha ao acessar os treinamentos. Verifique o acesso.');
      } finally {
        setCarregando(false);
      }
    };

    if (userToken) {
      carregarCatalogo();
    } else {
      setDepartamentos([]);
      setErroCatalogo('');
      setCarregando(false);
    }
  }, [userToken]);

  useEffect(() => {
    const carregarProgresso = async () => {
      try {
        const data = await fetchMeuProgresso();
        const mapaProgresso = {};
        (data.modulos || []).forEach((item) => {
          mapaProgresso[item.modulo_id] = item.concluido;
        });
        setProgresso(mapaProgresso);
        const statusMap = {};
        (data.matriculas || []).forEach((m) => {
          statusMap[m.treinamento_id] = {
            status: m.status,
            iniciadoEm: m.iniciado_em,
            concluidoEm: m.concluido_em,
            percentual: m.percentual_conclusao,
          };
        });
        setTreinamentoStatus(statusMap);
      } catch (error) {
        console.error('Falha ao carregar progresso.', error);
      }
    };

    if (localStorage.getItem('user_token')) {
      carregarProgresso();
    }
  }, []);

  const handleSalvarEmail = async (email, senha) => {
    try {
      const data = await loginColaborador(email, senha);
      if (!data?.access) {
        return false;
      }
      setUserToken(data.access);
      setUserTokenState(data.access);
      setUsuarioEmail(email);
      localStorage.setItem('treinamentos_email', email);
      try {
        const progressoData = await fetchMeuProgresso();
        const mapaProgresso = {};
        (progressoData.modulos || []).forEach((item) => {
          mapaProgresso[item.modulo_id] = item.concluido;
        });
        setProgresso(mapaProgresso);
        const statusMap = {};
        (progressoData.matriculas || []).forEach((m) => {
          statusMap[m.treinamento_id] = {
            status: m.status,
            iniciadoEm: m.iniciado_em,
            concluidoEm: m.concluido_em,
            percentual: m.percentual_conclusao,
          };
        });
        setTreinamentoStatus(statusMap);
      } catch (error) {
        console.error('Falha ao carregar progresso.', error);
      }
      return true;
    } catch (error) {
      console.error('Falha ao autenticar colaborador.', error);
      return false;
    }
  };

  const handleIniciar = async (treinamentoId) => {
    setTreinamentoStatus((prev) => ({
      ...prev,
      [treinamentoId]: {
        status: 'em_andamento',
        iniciadoEm: new Date().toISOString(),
      },
    }));
    try {
      await iniciarTreinamento(usuarioEmail, treinamentoId);
    } catch (error) {
      console.error('Falha ao iniciar treinamento.', error);
    }
  };

  const handleToggleModulo = async (treinamentoId, moduloId) => {
    setProgresso((prev) => {
      const atual = prev[moduloId] || false;
      return { ...prev, [moduloId]: !atual };
    });

    setTreinamentoStatus((prev) => {
      const statusAtual = prev[treinamentoId] || { status: 'nao_iniciado' };
      if (statusAtual.status === 'nao_iniciado') {
        return { ...prev, [treinamentoId]: { ...statusAtual, status: 'em_andamento' } };
      }
      return prev;
    });

    try {
      const concluido = !progresso[moduloId];
      await concluirModulo(usuarioEmail, moduloId, concluido);
    } catch (error) {
      console.error('Falha ao atualizar modulo.', error);
    }
  };

  const meusTreinamentos = useMemo(() => {
    const lista = [];
    departamentos.forEach((dep) => {
      dep.treinamentos.forEach((tr) => {
        const modulos = tr.modulos || [];
        const total = modulos.length;
        const concluidos = modulos.filter((mod) => progresso[mod.id]).length;
        const percentual = total ? Math.round((concluidos / total) * 100) : 0;
        let status = 'nao_iniciado';
        if (percentual === 100) status = 'concluido';
        else if (percentual > 0 || treinamentoStatus[tr.id]?.status === 'em_andamento') {
          status = 'em_andamento';
        }

        lista.push({
          id: tr.id,
          nome: tr.nome,
          status,
          percentual,
        });
      });
    });
    return lista;
  }, [departamentos, progresso, treinamentoStatus]);

  const perfil = localStorage.getItem('admin_token') ? 'Admin' : 'Colaborador';

  const handleAdminLogout = () => {
    clearAdminToken();
    window.location.href = '/admin/login';
  };

  const handleUserLogout = () => {
    clearUserToken();
    localStorage.removeItem('treinamentos_email');
    setUsuarioEmail('');
    setUserTokenState('');
  };

  const bloqueiaTreinamentos = !localStorage.getItem('user_token') && location.pathname === '/';

  return (
    <div className="app-shell">
      {location.pathname !== '/login' && (
        <Header
          usuarioEmail={usuarioEmail}
          meusTreinamentos={meusTreinamentos}
          perfil={perfil}
          onAdminLogout={handleAdminLogout}
          onUserLogout={handleUserLogout}
        />
      )}
      <Routes>
        <Route path="/login" element={<TrainingLogin onLogin={handleSalvarEmail} />} />
        <Route
          path="/"
          element={
            bloqueiaTreinamentos ? (
              <Navigate to="/login" replace />
            ) : (
              <TrainingExplorer
                departamentos={departamentos}
                carregando={carregando}
                erroCatalogo={erroCatalogo}
                progresso={progresso}
                treinamentoStatus={treinamentoStatus}
                onIniciar={handleIniciar}
                onToggleModulo={handleToggleModulo}
                meusTreinamentos={meusTreinamentos}
              />
            )
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          }
        />
      </Routes>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AppShell />
  </BrowserRouter>
);

export default App;
