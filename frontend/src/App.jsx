import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import RequireUser from './components/RequireUser.jsx';
import TrainingExplorer from './pages/TrainingExplorer.jsx';
import TrainingLogin from './pages/TrainingLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminFormularios from './pages/AdminFormularios.jsx';
import {
  fetchCatalogo,
  iniciarTreinamento,
  concluirModulo,
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
  const [matriculas, setMatriculas] = useState([]);
  const [colaboradorDepartamentoId, setColaboradorDepartamentoId] = useState(null);
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
        setMatriculas(data.matriculas || []);
        setColaboradorDepartamentoId(data.colaborador?.departamento_id || null);
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
        setMatriculas(progressoData.matriculas || []);
        setColaboradorDepartamentoId(progressoData.colaborador?.departamento_id || null);
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
    setMatriculas((prev) => {
      const existente = prev.find((m) => m.treinamento_id === treinamentoId);
      if (existente) {
        return prev.map((m) =>
          m.treinamento_id === treinamentoId
            ? { ...m, status: 'em_andamento', iniciado_em: m.iniciado_em || new Date().toISOString() }
            : m
        );
      }
      return [
        ...prev,
        {
          treinamento_id: treinamentoId,
          status: 'em_andamento',
          percentual_conclusao: 0,
          iniciado_em: new Date().toISOString(),
          concluido_em: null,
        },
      ];
    });
    try {
      await iniciarTreinamento(usuarioEmail, treinamentoId);
    } catch (error) {
      console.error('Falha ao iniciar treinamento.', error);
    }
  };

  const handleEficaciaRespondida = (matricula) => {
    if (!matricula) return;
    setTreinamentoStatus((prev) => ({
      ...prev,
      [matricula.treinamento]: {
        status: matricula.status,
        iniciadoEm: matricula.iniciado_em,
        concluidoEm: matricula.concluido_em,
        percentual: matricula.percentual_conclusao,
      },
    }));
    setMatriculas((prev) => {
      const existe = prev.find((m) => m.treinamento_id === matricula.treinamento);
      if (existe) {
        return prev.map((m) =>
          m.treinamento_id === matricula.treinamento
            ? {
                ...m,
                status: matricula.status,
                percentual_conclusao: matricula.percentual_conclusao,
                iniciado_em: matricula.iniciado_em,
                concluido_em: matricula.concluido_em,
              }
            : m
        );
      }
      return [
        ...prev,
        {
          treinamento_id: matricula.treinamento,
          status: matricula.status,
          percentual_conclusao: matricula.percentual_conclusao,
          iniciado_em: matricula.iniciado_em,
          concluido_em: matricula.concluido_em,
        },
      ];
    });
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
      const data = await concluirModulo(usuarioEmail, moduloId, concluido);
      if (data?.matricula) {
        setTreinamentoStatus((prev) => ({
          ...prev,
          [data.matricula.treinamento]: {
            status: data.matricula.status,
            iniciadoEm: data.matricula.iniciado_em,
            concluidoEm: data.matricula.concluido_em,
            percentual: data.matricula.percentual_conclusao,
          },
        }));
        setMatriculas((prev) => {
          const existe = prev.find((m) => m.treinamento_id === data.matricula.treinamento);
          if (existe) {
            return prev.map((m) =>
              m.treinamento_id === data.matricula.treinamento
                ? {
                    ...m,
                    status: data.matricula.status,
                    percentual_conclusao: data.matricula.percentual_conclusao,
                    iniciado_em: data.matricula.iniciado_em,
                    concluido_em: data.matricula.concluido_em,
                  }
                : m
            );
          }
          return [
            ...prev,
            {
              treinamento_id: data.matricula.treinamento,
              status: data.matricula.status,
              percentual_conclusao: data.matricula.percentual_conclusao,
              iniciado_em: data.matricula.iniciado_em,
              concluido_em: data.matricula.concluido_em,
            },
          ];
        });
      }
    } catch (error) {
      console.error('Falha ao atualizar modulo.', error);
    }
  };

  const meusTreinamentos = useMemo(() => {
    const lista = new Map();
    departamentos.forEach((dep) => {
      dep.treinamentos.forEach((tr) => {
        if (lista.has(tr.id)) return;
        const modulos = tr.modulos || [];
        const total = modulos.length;
        const concluidos = modulos.filter((mod) => progresso[mod.id]).length;
        const percentual = total ? Math.round((concluidos / total) * 100) : 0;
        let status = 'nao_iniciado';
        const statusApi = treinamentoStatus[tr.id]?.status;
        if (statusApi === 'aguardando_eficacia') {
          status = 'aguardando_eficacia';
        } else if (statusApi === 'concluido' || percentual === 100) {
          status = 'concluido';
        } else if (percentual > 0 || statusApi === 'em_andamento') {
          status = 'em_andamento';
        }

        lista.set(tr.id, {
          id: tr.id,
          nome: tr.nome,
          status,
          percentual,
        });
      });
    });
    return Array.from(lista.values());
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
            <RequireUser>
              <TrainingExplorer
                departamentos={departamentos}
                carregando={carregando}
                erroCatalogo={erroCatalogo}
                progresso={progresso}
                treinamentoStatus={treinamentoStatus}
                matriculas={matriculas}
                colaboradorDepartamentoId={colaboradorDepartamentoId}
                onEficaciaRespondida={handleEficaciaRespondida}
                onIniciar={handleIniciar}
                onToggleModulo={handleToggleModulo}
                meusTreinamentos={meusTreinamentos}
              />
            </RequireUser>
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
        <Route
          path="/admin/formularios"
          element={
            <RequireAdmin>
              <AdminFormularios />
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
