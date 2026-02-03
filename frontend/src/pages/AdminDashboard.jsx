import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, ArrowLeft, Pencil, FilePlus2 } from 'lucide-react';
import {
  clearAdminToken,
  createModulo,
  createDepartamento,
  createTreinamento,
  deleteModulo,
  deleteTreinamento,
  fetchDepartamentos,
  fetchModulos,
  fetchTreinamentos,
  updateModulo,
  updateTreinamento,
} from '../services/api.js';

const AdminDashboard = () => {
  const [departamentos, setDepartamentos] = useState([]);
  const [treinamentos, setTreinamentos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [status, setStatus] = useState('');

  const [view, setView] = useState('list');
  const [selecionado, setSelecionado] = useState(null);
  const [formTreinamento, setFormTreinamento] = useState({
    id: null,
    codigo: '',
    nome: '',
    responsavel: '',
    ultima_atualizacao: '',
    departamento: '',
  });
  const [showModuloModal, setShowModuloModal] = useState(false);
  const [moduloModalMode, setModuloModalMode] = useState('create');
  const [formModulo, setFormModulo] = useState({
    titulo: '',
    descricao: '',
    video_iframe: '',
  });

  const [filters, setFilters] = useState({
    codigo: '',
    nome: '',
    responsavel: '',
    ultima_atualizacao: '',
    departamento: '',
  });
  const [sort, setSort] = useState({ key: 'nome', direction: 'asc' });

  const carregarTudo = async () => {
    try {
      const [deps, trs, mods] = await Promise.all([
        fetchDepartamentos(),
        fetchTreinamentos(),
        fetchModulos(),
      ]);
      setDepartamentos(deps);
      setTreinamentos(trs);
      setModulos(mods);
    } catch (error) {
      setStatus('Falha ao carregar dados. Verifique o login.');
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    window.location.href = '/admin/login';
  };

  const departamentosFixos = [
    'Contabil',
    'Consultoria',
    'Departamento Pessoal',
    'Empresarial',
    'Fiscal',
    'TI',
    'Geral',
  ];

  const departamentosOptions = useMemo(() => {
    return departamentosFixos.map((nome) => ({ value: nome, label: nome }));
  }, []);

  const departamentoPorNome = useMemo(() => {
    const map = new Map();
    departamentos.forEach((dep) => {
      if (dep.nome) {
        map.set(dep.nome.toLowerCase(), dep);
      }
    });
    return map;
  }, [departamentos]);

  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const treinamentosFiltrados = useMemo(() => {
    const filtrados = treinamentos.filter((tr) => {
      const depNome = departamentos.find((dep) => dep.id === tr.departamento)?.nome || '';
      return (
        tr.codigo?.toLowerCase().includes(filters.codigo.toLowerCase()) &&
        tr.nome?.toLowerCase().includes(filters.nome.toLowerCase()) &&
        tr.responsavel?.toLowerCase().includes(filters.responsavel.toLowerCase()) &&
        (tr.ultima_atualizacao || '').toString().includes(filters.ultima_atualizacao) &&
        depNome.toLowerCase().includes(filters.departamento.toLowerCase())
      );
    });

    const sorted = [...filtrados].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      const depA = departamentos.find((dep) => dep.id === a.departamento)?.nome || '';
      const depB = departamentos.find((dep) => dep.id === b.departamento)?.nome || '';
      const valueA = sort.key === 'departamento' ? depA : a[sort.key] || '';
      const valueB = sort.key === 'departamento' ? depB : b[sort.key] || '';
      return valueA.toString().localeCompare(valueB.toString()) * direction;
    });

    return sorted;
  }, [departamentos, filters, sort, treinamentos]);

  const abrirNovo = () => {
    const primeiroDepartamento = departamentosOptions[0];
    setFormTreinamento({
      id: null,
      codigo: '',
      nome: '',
      responsavel: '',
      ultima_atualizacao: '',
      departamento: primeiroDepartamento?.value || '',
    });
    setSelecionado(null);
    setView('detail');
  };

  const abrirEdicao = (treinamento) => {
    setFormTreinamento({
      id: treinamento.id,
      codigo: treinamento.codigo || '',
      nome: treinamento.nome || '',
      responsavel: treinamento.responsavel || '',
      ultima_atualizacao: treinamento.ultima_atualizacao || '',
      departamento:
        departamentos.find((dep) => dep.id === treinamento.departamento)?.nome ||
        formTreinamento.departamento ||
        '',
    });
    setSelecionado(treinamento);
    setView('detail');
  };

  const salvarTreinamento = async () => {
    if (!formTreinamento.nome || !formTreinamento.departamento) return;
    let departamentoId = Number(formTreinamento.departamento);
    if (Number.isNaN(departamentoId)) {
      const nome = formTreinamento.departamento.toString().trim();
      const existente = departamentoPorNome.get(nome.toLowerCase());
      if (existente) {
        departamentoId = existente.id;
      } else {
        const criado = await createDepartamento({ nome });
        departamentoId = criado.id;
      }
    }
    const payload = {
      ...formTreinamento,
      departamento: departamentoId,
    };
    if (formTreinamento.id) {
      await updateTreinamento(formTreinamento.id, payload);
    } else {
      await createTreinamento(payload);
    }
    await carregarTudo();
    setView('list');
  };

  const excluirTreinamento = async (id) => {
    await deleteTreinamento(id);
    await carregarTudo();
  };

  const modulosDoTreinamento = useMemo(() => {
    if (!formTreinamento.id) return [];
    return modulos.filter((mod) => mod.treinamento === formTreinamento.id);
  }, [formTreinamento.id, modulos]);

  const abrirModalModulo = () => {
    setFormModulo({ titulo: '', descricao: '', video_iframe: '' });
    setModuloModalMode('create');
    setShowModuloModal(true);
  };

  const abrirEditarModulo = (modulo) => {
    setFormModulo({
      id: modulo.id,
      titulo: modulo.titulo || '',
      descricao: modulo.descricao || '',
      video_iframe: modulo.video_iframe || '',
    });
    setModuloModalMode('edit');
    setShowModuloModal(true);
  };

  const salvarModulo = async () => {
    if (!formTreinamento.id) return;
    if (!formModulo.titulo) return;
    if (moduloModalMode === 'edit' && formModulo.id) {
      await updateModulo(formModulo.id, {
        titulo: formModulo.titulo,
        descricao: formModulo.descricao,
        video_iframe: formModulo.video_iframe,
        treinamento: formTreinamento.id,
      });
    } else {
      await createModulo({
        titulo: formModulo.titulo,
        descricao: formModulo.descricao,
        video_iframe: formModulo.video_iframe,
        treinamento: formTreinamento.id,
      });
    }
    await carregarTudo();
    setShowModuloModal(false);
  };

  return (
    <div className="page page--admin">
      <div className="content">
        <div className="content__header">
          <div>
            <h1 className="content__title">Cadastro de treinamentos</h1>
            <p className="content__meta" />
          </div>
          <div />
        </div>
        {status && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{status}</div>}

        {view === 'list' ? (
          <>
            <div className="section-title" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)' }}>
                {treinamentosFiltrados.length} treinamento(s)
              </div>
              <button
                type="button"
                className="icon-button icon-button--primary"
                onClick={abrirNovo}
                title="Novo treinamento"
                aria-label="Novo treinamento"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="table-filters">
              <input
                type="text"
                placeholder="Filtrar codigo"
                value={filters.codigo}
                onChange={(event) => setFilters({ ...filters, codigo: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar nome"
                value={filters.nome}
                onChange={(event) => setFilters({ ...filters, nome: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar responsavel"
                value={filters.responsavel}
                onChange={(event) => setFilters({ ...filters, responsavel: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar data"
                value={filters.ultima_atualizacao}
                onChange={(event) => setFilters({ ...filters, ultima_atualizacao: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar departamento"
                value={filters.departamento}
                onChange={(event) => setFilters({ ...filters, departamento: event.target.value })}
              />
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('codigo')}>Codigo</th>
                    <th onClick={() => handleSort('nome')}>Nome</th>
                    <th onClick={() => handleSort('responsavel')}>Responsavel</th>
                    <th onClick={() => handleSort('ultima_atualizacao')}>Ultima atualizacao</th>
                    <th onClick={() => handleSort('departamento')}>Departamento</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {treinamentosFiltrados.map((tr) => (
                    <tr key={tr.id}>
                      <td>{tr.codigo}</td>
                      <td>{tr.nome}</td>
                      <td>{tr.responsavel}</td>
                      <td>{tr.ultima_atualizacao}</td>
                      <td>{departamentos.find((dep) => dep.id === tr.departamento)?.nome || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button icon-button--ghost"
                          onClick={() => abrirEdicao(tr)}
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          onClick={() => excluirTreinamento(tr.id)}
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {treinamentosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum treinamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="icon-button icon-button--ghost"
              onClick={() => setView('list')}
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="section-title">Dados do treinamento</div>
            <div className="form-grid">
              <label>
                Codigo
                <input
                  type="text"
                  value={formTreinamento.codigo}
                  onChange={(event) => setFormTreinamento({ ...formTreinamento, codigo: event.target.value })}
                />
              </label>
              <label>
                Nome
                <input
                  type="text"
                  value={formTreinamento.nome}
                  onChange={(event) => setFormTreinamento({ ...formTreinamento, nome: event.target.value })}
                />
              </label>
              <label>
                Responsavel
                <input
                  type="text"
                  value={formTreinamento.responsavel}
                  onChange={(event) => setFormTreinamento({ ...formTreinamento, responsavel: event.target.value })}
                />
              </label>
              <label>
                Ultima atualizacao
                <input
                  type="date"
                  value={formTreinamento.ultima_atualizacao || ''}
                  onChange={(event) =>
                    setFormTreinamento({ ...formTreinamento, ultima_atualizacao: event.target.value })
                  }
                />
              </label>
              <label>
                Departamento
                <select
                  value={formTreinamento.departamento}
                  onChange={(event) =>
                    setFormTreinamento({ ...formTreinamento, departamento: event.target.value })
                  }
                >
                  <option value="">Selecione o departamento</option>
                  {departamentosOptions.map((dep) => (
                    <option key={dep.label} value={dep.value}>
                      {dep.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="icon-button icon-button--primary"
                onClick={salvarTreinamento}
                title="Salvar"
                aria-label="Salvar"
              >
                <Save size={18} />
              </button>
              {formTreinamento.id && (
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => excluirTreinamento(formTreinamento.id)}
                  title="Excluir"
                  aria-label="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="section-title">Modulos do treinamento</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ color: 'var(--text-muted)' }}>{modulosDoTreinamento.length} modulo(s)</div>
              <button
                type="button"
                className="icon-button icon-button--primary"
                onClick={abrirModalModulo}
                disabled={!formTreinamento.id}
                title="Inserir modulo"
                aria-label="Inserir modulo"
              >
                <FilePlus2 size={18} />
              </button>
            </div>
            <div className="module-list">
              {modulosDoTreinamento.map((mod) => (
                <div key={mod.id} className="module-card">
                  <div>
                    <strong>{mod.titulo}</strong>
                    <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{mod.descricao}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="icon-button icon-button--ghost module-icon"
                      onClick={() => abrirEditarModulo(mod)}
                      title="Editar"
                      aria-label="Editar"
                    >
                      <Pencil size={30} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger module-icon"
                      onClick={() => deleteModulo(mod.id).then(carregarTudo)}
                      title="Excluir"
                      aria-label="Excluir"
                    >
                      <Trash2 size={30} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
              {modulosDoTreinamento.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>Nenhum modulo cadastrado.</div>
              )}
            </div>
          </>
        )}

        {showModuloModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>{moduloModalMode === 'edit' ? 'Editar modulo' : 'Novo modulo'}</h2>
              <div className="form-grid">
                <label>
                  Titulo
                  <input
                    type="text"
                    value={formModulo.titulo}
                    onChange={(event) => setFormModulo({ ...formModulo, titulo: event.target.value })}
                  />
                </label>
                <label>
                  Descricao
                  <textarea
                    rows={4}
                    value={formModulo.descricao}
                    onChange={(event) => setFormModulo({ ...formModulo, descricao: event.target.value })}
                  />
                </label>
                <label>
                  Link iframe
                  <input
                    type="text"
                    value={formModulo.video_iframe}
                    onChange={(event) => setFormModulo({ ...formModulo, video_iframe: event.target.value })}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="icon-button icon-button--primary"
                  onClick={salvarModulo}
                  title="Salvar"
                  aria-label="Salvar"
                >
                  <Save size={18} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--ghost"
                  onClick={() => setShowModuloModal(false)}
                  title="Voltar"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
