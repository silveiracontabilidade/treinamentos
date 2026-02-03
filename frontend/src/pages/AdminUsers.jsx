import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import {
  fetchUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetUsuarioSenha,
  fetchUsuarioTreinamentos,
} from '../services/api.js';

const AdminUsers = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_staff: '',
  });
  const [sort, setSort] = useState({ key: 'email', direction: 'asc' });
  const [view, setView] = useState('list');
  const [treinamentos, setTreinamentos] = useState([]);
  const [treinoFilters, setTreinoFilters] = useState({
    nome: '',
    iniciado_em: '',
    status: '',
    concluido_em: '',
  });
  const [treinoSort, setTreinoSort] = useState({ key: 'nome', direction: 'asc' });
  const [form, setForm] = useState({
    id: null,
    email: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_active: true,
  });

  const carregar = async () => {
    try {
      const data = await fetchUsuarios();
      setUsuarios(data);
    } catch (error) {
      setStatus('Falha ao carregar usuarios.');
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const usuariosFiltrados = useMemo(() => {
    const filtrados = usuarios.filter((u) => {
      const role = u.is_staff ? 'Admin' : 'Colaborador';
      return (
        (u.username || '').toLowerCase().includes(filters.username.toLowerCase()) &&
        (u.email || '').toLowerCase().includes(filters.email.toLowerCase()) &&
        (u.first_name || '').toLowerCase().includes(filters.first_name.toLowerCase()) &&
        (u.last_name || '').toLowerCase().includes(filters.last_name.toLowerCase()) &&
        role.toLowerCase().includes(filters.is_staff.toLowerCase())
      );
    });

    return [...filtrados].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      const valueA = (a[sort.key] || '').toString();
      const valueB = (b[sort.key] || '').toString();
      return valueA.localeCompare(valueB) * direction;
    });
  }, [usuarios, filters, sort]);

  const abrirNovo = () => {
    setForm({ id: null, email: '', first_name: '', last_name: '', is_staff: false, is_active: true });
    setView('form');
  };

  const abrirEdicao = async (usuario) => {
    setForm({
      id: usuario.id,
      email: usuario.email || '',
      first_name: usuario.first_name || '',
      last_name: usuario.last_name || '',
      is_staff: !!usuario.is_staff,
      is_active: usuario.is_active !== false,
    });
    const data = await fetchUsuarioTreinamentos(usuario.id);
    setTreinamentos(data);
    setView('form');
  };

  const abrirTreinamentos = async () => {};

  const salvar = async () => {
    if (!form.email) return;
    const payload = {
      username: form.email,
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      is_staff: form.is_staff,
      is_active: form.is_active,
    };

    if (form.id) {
      await updateUsuario(form.id, payload);
    } else {
      await createUsuario(payload);
    }
    setView('list');
    await carregar();
  };

  const treinamentosFiltrados = useMemo(() => {
    const filtrados = treinamentos.filter((t) => {
      return (
        (t.nome || '').toLowerCase().includes(treinoFilters.nome.toLowerCase()) &&
        (t.iniciado_em || '').toString().includes(treinoFilters.iniciado_em) &&
        (t.status || '').toLowerCase().includes(treinoFilters.status.toLowerCase()) &&
        (t.concluido_em || '').toString().includes(treinoFilters.concluido_em)
      );
    });
    return [...filtrados].sort((a, b) => {
      const direction = treinoSort.direction === 'asc' ? 1 : -1;
      const valueA = (a[treinoSort.key] || '').toString();
      const valueB = (b[treinoSort.key] || '').toString();
      return valueA.localeCompare(valueB) * direction;
    });
  }, [treinamentos, treinoFilters, treinoSort]);

  return (
    <div className="page page--admin">
      <div className="content">
        <div className="content__header">
          <div>
            <h1 className="content__title">Usuarios</h1>
            {status && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{status}</div>}
          </div>
          {view === 'list' && (
            <button
              type="button"
              className="icon-button icon-button--primary"
              onClick={abrirNovo}
              title="Novo usuario"
              aria-label="Novo usuario"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {view === 'list' ? (
          <>
            <div className="table-filters">
              <input
                type="text"
                placeholder="Filtrar usuario"
                value={filters.username}
                onChange={(event) => setFilters({ ...filters, username: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar email"
                value={filters.email}
                onChange={(event) => setFilters({ ...filters, email: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar nome"
                value={filters.first_name}
                onChange={(event) => setFilters({ ...filters, first_name: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar sobrenome"
                value={filters.last_name}
                onChange={(event) => setFilters({ ...filters, last_name: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar perfil"
                value={filters.is_staff}
                onChange={(event) => setFilters({ ...filters, is_staff: event.target.value })}
              />
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('username')}>Usuario</th>
                    <th onClick={() => handleSort('email')}>E-mail</th>
                    <th onClick={() => handleSort('first_name')}>Nome</th>
                    <th onClick={() => handleSort('last_name')}>Sobrenome</th>
                    <th>Perfil</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.first_name}</td>
                      <td>{u.last_name}</td>
                      <td>{u.is_staff ? 'Admin' : 'Colaborador'}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button icon-button--ghost"
                          onClick={() => abrirEdicao(u)}
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => resetUsuarioSenha(u.id)}
                          title="Resetar senha"
                          aria-label="Resetar senha"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          onClick={() => deleteUsuario(u.id).then(carregar)}
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum usuario encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : view === 'form' ? (
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
            <div className="section-title">Dados do usuario</div>
            <div className="form-grid">
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="nome@silveiracontabilidade.com.br"
                />
              </label>
              <label>
                Nome
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                />
              </label>
              <label>
                Sobrenome
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                />
              </label>
              <label>
                Perfil
                <select
                  value={form.is_staff ? 'Admin' : 'Colaborador'}
                  onChange={(event) => setForm({ ...form, is_staff: event.target.value === 'Admin' })}
                >
                  <option value="Colaborador">Colaborador</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <label>
                Ativo
                <select
                  value={form.is_active ? 'Sim' : 'Nao'}
                  onChange={(event) => setForm({ ...form, is_active: event.target.value === 'Sim' })}
                >
                  <option value="Sim">Sim</option>
                  <option value="Nao">Nao</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="icon-button icon-button--primary"
                onClick={salvar}
                title="Salvar"
                aria-label="Salvar"
              >
                <Save size={18} />
              </button>
            </div>
            <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Senha padrao: Mudar123
            </div>

            <div className="section-title" style={{ marginTop: 20 }}>
              Treinamentos de {form.first_name || form.email}
            </div>
            <div className="table-filters">
              <input
                type="text"
                placeholder="Filtrar treinamento"
                value={treinoFilters.nome}
                onChange={(event) => setTreinoFilters({ ...treinoFilters, nome: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar data inicio"
                value={treinoFilters.iniciado_em}
                onChange={(event) => setTreinoFilters({ ...treinoFilters, iniciado_em: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar status"
                value={treinoFilters.status}
                onChange={(event) => setTreinoFilters({ ...treinoFilters, status: event.target.value })}
              />
              <input
                type="text"
                placeholder="Filtrar data termino"
                value={treinoFilters.concluido_em}
                onChange={(event) => setTreinoFilters({ ...treinoFilters, concluido_em: event.target.value })}
              />
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => setTreinoSort((prev) => ({ key: 'nome', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Treinamento
                    </th>
                    <th onClick={() => setTreinoSort((prev) => ({ key: 'iniciado_em', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Data inicio
                    </th>
                    <th onClick={() => setTreinoSort((prev) => ({ key: 'status', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Status
                    </th>
                    <th onClick={() => setTreinoSort((prev) => ({ key: 'concluido_em', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                      Data termino
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {treinamentosFiltrados.map((t) => (
                    <tr key={`${t.id}-${t.iniciado_em || ''}`}>
                      <td>{t.nome}</td>
                      <td>{t.iniciado_em || '-'}</td>
                      <td>{t.status}</td>
                      <td>{t.concluido_em || '-'}</td>
                    </tr>
                  ))}
                  {treinamentosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum treinamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
