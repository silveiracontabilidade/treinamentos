import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  fetchDepartamentos,
  fetchRelatorioTreinamentos,
  fetchTreinamentos,
  exportRelatorioTreinamentosXlsx,
} from '../services/api.js';

const statusLabels = {
  nao_iniciado: 'Nao iniciado',
  em_andamento: 'Em andamento',
  aguardando_eficacia: 'Aguardando eficacia',
  concluido: 'Concluido',
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const raw = value.toString();
  const datePart = raw.split('T')[0].split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
    const [day, month, year] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  return datePart;
};

const AdminRelatorio = () => {
  const [departamentos, setDepartamentos] = useState([]);
  const [treinamentos, setTreinamentos] = useState([]);
  const [filtros, setFiltros] = useState({
    treinamento_id: '',
    status: '',
    concluido_em: '',
    departamento: 'todos',
  });
  const [resultados, setResultados] = useState([]);
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const carregarDepartamentos = async () => {
      try {
        const data = await fetchDepartamentos();
        setDepartamentos(data);
      } catch (error) {
        setDepartamentos([]);
      }
    };
    const carregarTreinamentos = async () => {
      try {
        const data = await fetchTreinamentos();
        setTreinamentos(data);
      } catch (error) {
        setTreinamentos([]);
      }
    };
    carregarDepartamentos();
    carregarTreinamentos();
  }, []);

  const buildParams = () => {
    const params = {};
    if ((filtros.treinamento_id || '').trim()) {
      params.treinamento_id = filtros.treinamento_id;
    }
    if ((filtros.status || '').trim()) {
      params.status = filtros.status;
    }
    if ((filtros.concluido_em || '').trim()) {
      params.concluido_em = filtros.concluido_em;
    }
    if ((filtros.departamento || '').trim() && filtros.departamento !== 'todos') {
      params.departamento = filtros.departamento;
    }
    return params;
  };

  const handleFiltrar = async () => {
    setStatus('');
    setCarregando(true);
    try {
      const data = await fetchRelatorioTreinamentos(buildParams());
      setResultados(data);
    } catch (error) {
      setStatus('Falha ao carregar relatorio.');
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  };

  const handleExportar = async () => {
    setStatus('');
    setExportando(true);
    try {
      const response = await exportRelatorioTreinamentosXlsx(buildParams());
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dataHoje = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `relatorio_treinamentos_${dataHoje}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      let mensagem = 'Falha ao exportar relatorio.';
      const data = error?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          try {
            const parsed = JSON.parse(text);
            mensagem = parsed?.detail || mensagem;
          } catch (jsonError) {
            mensagem = text || mensagem;
          }
        } catch (readError) {
          // ignore
        }
      } else if (data?.detail) {
        mensagem = data.detail;
      }
      setStatus(mensagem);
    } finally {
      setExportando(false);
    }
  };

  const resultadosOrdenados = useMemo(() => {
    return [...resultados].sort((a, b) => {
      const treinoA = (a.treinamento || '').toString();
      const treinoB = (b.treinamento || '').toString();
      const comp = treinoA.localeCompare(treinoB);
      if (comp !== 0) return comp;
      return (a.colaborador || '').toString().localeCompare((b.colaborador || '').toString());
    });
  }, [resultados]);

  return (
    <div className="page page--admin">
      <div className="content">
        <div className="content__header">
          <div>
            <h1 className="content__title">Relatorio</h1>
            {status && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{status}</div>}
          </div>
        </div>

        <div className="section-title">Filtros</div>
        <div className="form-grid">
          <label>
            Nome do Treinamento
            <select
              value={filtros.treinamento_id}
              onChange={(event) => setFiltros({ ...filtros, treinamento_id: event.target.value })}
            >
              <option value="">Todos</option>
              {treinamentos.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status do treinamento
            <select
              value={filtros.status}
              onChange={(event) => setFiltros({ ...filtros, status: event.target.value })}
            >
              <option value="">Todos</option>
              <option value="nao_iniciado">Nao iniciado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="aguardando_eficacia">Aguardando eficacia</option>
              <option value="concluido">Concluido</option>
            </select>
          </label>
          <label>
            Data conclusao do treinamento
            <input
              type="date"
              value={filtros.concluido_em}
              onChange={(event) => setFiltros({ ...filtros, concluido_em: event.target.value })}
            />
          </label>
          <label>
            Departamento
            <select
              value={filtros.departamento}
              onChange={(event) => setFiltros({ ...filtros, departamento: event.target.value })}
            >
              <option value="todos">Todos</option>
              {departamentos.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="action-button action-button--primary"
            onClick={handleFiltrar}
            disabled={carregando}
          >
            <Search size={16} />
            {carregando ? 'Filtrando...' : 'Filtrar'}
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={handleExportar}
            disabled={exportando}
          >
            {exportando ? 'Exportando...' : 'Exportar XLSX'}
          </button>
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>
          Resultados
        </div>
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Treinamento</th>
                <th>Colaborador</th>
                <th>Departamento</th>
                <th>Status</th>
                <th>Data conclusao</th>
              </tr>
            </thead>
            <tbody>
              {resultadosOrdenados.map((item, index) => (
                <tr key={`${item.treinamento}-${item.colaborador}-${index}`}>
                  <td>{item.treinamento}</td>
                  <td>{item.colaborador}</td>
                  <td>{item.departamento || '-'}</td>
                  <td>{statusLabels[item.status] || item.status}</td>
                  <td>{formatDateOnly(item.concluido_em)}</td>
                </tr>
              ))}
              {!carregando && resultadosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRelatorio;
