import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, ArrowLeft, Pencil, FilePlus2 } from 'lucide-react';
import {
  clearAdminToken,
  createModulo,
  createDepartamento,
  createTreinamento,
  fetchEficaciaQuestionarioAdmin,
  createEficaciaQuestionario,
  updateEficaciaQuestionario,
  createEficaciaPergunta,
  updateEficaciaPergunta,
  deleteEficaciaPergunta,
  createEficaciaAlternativa,
  deleteEficaciaAlternativa,
  fetchFormulariosModelo,
  aplicarModeloEficacia,
  clonarEficaciaQuestionario,
  deleteModulo,
  deleteTreinamento,
  fetchDepartamentos,
  fetchModulos,
  fetchTreinamentos,
  updateModulo,
  updateTreinamento,
} from '../services/api.js';
import {
  TIPOS_PERGUNTA,
  tipoPerguntaLabel,
  isMultiplaEscolha,
  permiteAlternativaCorreta,
} from '../utils/eficacia.js';

const normalizeDateToInput = (value) => {
  if (!value) return '';
  const str = value.toString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [day, month, year] = str.split('-');
    return `${year}-${month}-${day}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/');
    return `${year}-${month}-${day}`;
  }
  return str;
};

const inferVideoOrigem = (value) => {
  if (!value) return 'youtube';
  const normalized = value.toLowerCase();
  if (normalized.includes('canva.com')) return 'canva';
  if (normalized.includes('youtu')) return 'youtube';
  return 'iframe';
};

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
    departamentos: [],
  });
  const [showModuloModal, setShowModuloModal] = useState(false);
  const [moduloModalMode, setModuloModalMode] = useState('create');
  const [formModulo, setFormModulo] = useState({
    titulo: '',
    descricao: '',
    video_iframe: '',
    video_origem: 'youtube',
  });
  const [eficaciaQuestionario, setEficaciaQuestionario] = useState(null);
  const [eficaciaForm, setEficaciaForm] = useState({
    titulo: 'Formulario de eficacia',
    nota_minima: 70,
    ativo: true,
  });
  const [eficaciaCarregando, setEficaciaCarregando] = useState(false);
  const [eficaciaErro, setEficaciaErro] = useState('');
  const [eficaciaTemTentativas, setEficaciaTemTentativas] = useState(false);
  const [formulariosModelo, setFormulariosModelo] = useState([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('');
  const [aplicandoModelo, setAplicandoModelo] = useState(false);
  const [showPerguntaModal, setShowPerguntaModal] = useState(false);
  const [perguntaModalMode, setPerguntaModalMode] = useState('create');
  const [formPergunta, setFormPergunta] = useState({
    id: null,
    enunciado: '',
    ordem: 0,
    tipo: 'multipla_escolha_correta',
    obrigatoria: true,
  });
  const [formAlternativas, setFormAlternativas] = useState([
    { id: null, texto: '', correta: true },
    { id: null, texto: '', correta: false },
  ]);

  const confirmarExclusao = (mensagem) => window.confirm(mensagem);

  const [filters, setFilters] = useState({
    codigo: '',
    nome: '',
    responsavel: '',
    ultima_atualizacao: '',
    departamento: '',
  });
  const [sort, setSort] = useState({ key: 'nome', direction: 'asc' });
  const videoPlaceholders = {
    youtube: 'https://www.youtube.com/watch?v=...',
    canva: 'https://www.canva.com/design/.../view?embed',
    iframe: '<iframe src="..."></iframe>',
  };
  const videoHints = {
    youtube: 'Aceita link do YouTube ou embed. O sistema ajusta se precisar.',
    canva: 'Use o link de embed do Canva (Share > Embed).',
    iframe: 'Cole o iframe completo ou apenas o src.',
  };
  const videoOrigemAtual = formModulo.video_origem || inferVideoOrigem(formModulo.video_iframe);
  const eficaciaAtiva = !!eficaciaForm.ativo;

  const carregarTudo = async () => {
    try {
      const [deps, trs, mods, modelos] = await Promise.all([
        fetchDepartamentos(),
        fetchTreinamentos(),
        fetchModulos(),
        fetchFormulariosModelo(),
      ]);
      setDepartamentos(deps);
      setTreinamentos(trs);
      setModulos(mods);
      setFormulariosModelo(modelos);
    } catch (error) {
      setStatus('Falha ao carregar dados. Verifique o login.');
    }
  };

  const carregarEficacia = async (treinamentoId) => {
    if (!treinamentoId) {
      setEficaciaQuestionario(null);
      setEficaciaForm({ titulo: 'Formulario de eficacia', nota_minima: 70, ativo: true });
      setEficaciaTemTentativas(false);
      setModeloSelecionadoId('');
      return;
    }
    setEficaciaCarregando(true);
    setEficaciaErro('');
    try {
      const data = await fetchEficaciaQuestionarioAdmin(treinamentoId);
      const questionario = Array.isArray(data) ? data[0] : data;
      if (questionario) {
        setEficaciaQuestionario(questionario);
        setEficaciaForm({
          titulo: questionario.titulo || 'Formulario de eficacia',
          nota_minima: questionario.nota_minima === null ? '' : questionario.nota_minima ?? 70,
          ativo: questionario.ativo ?? true,
        });
        setEficaciaTemTentativas((questionario.tentativas_count || 0) > 0);
      } else {
        setEficaciaQuestionario(null);
        setEficaciaForm({ titulo: 'Formulario de eficacia', nota_minima: 70, ativo: true });
        setEficaciaTemTentativas(false);
      }
    } catch (error) {
      setEficaciaErro('Falha ao carregar formulario de eficacia.');
    } finally {
      setEficaciaCarregando(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    if (view === 'detail' && formTreinamento.id) {
      carregarEficacia(formTreinamento.id);
    }
  }, [view, formTreinamento.id]);

  const handleLogout = () => {
    clearAdminToken();
    window.location.href = '/admin/login';
  };

  const departamentosFixos = [
    'Comercial',
    'Contabil',
    'Consultoria',
    'Departamento Pessoal',
    'Empresarial',
    'Financeiro',
    'Fiscal',
    'Geral',
    'Marketing',
    'Processos e Qualidade',
    'RH',
    'TI',
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

  const toggleDepartamentoSelecionado = (nome) => {
    const nomeNormalizado = nome.toString().trim();
    if (!nomeNormalizado) return;
    setFormTreinamento((prev) => {
      const atuais = (prev.departamentos || []).filter(Boolean);
      const isGeral = nomeNormalizado.toLowerCase() === 'geral';
      const temGeral = atuais.some((item) => item.toLowerCase() === 'geral');

      if (isGeral) {
        if (temGeral && atuais.length === 1) {
          return { ...prev, departamentos: [] };
        }
        return { ...prev, departamentos: ['Geral'] };
      }

      let novaLista = atuais.filter((item) => item.toLowerCase() !== 'geral');
      const jaSelecionado = novaLista.some(
        (item) => item.toLowerCase() === nomeNormalizado.toLowerCase()
      );

      if (jaSelecionado) {
        novaLista = novaLista.filter(
          (item) => item.toLowerCase() !== nomeNormalizado.toLowerCase()
        );
      } else {
        novaLista = [...novaLista, nomeNormalizado];
      }

      return { ...prev, departamentos: novaLista };
    });
  };

  const treinamentosFiltrados = useMemo(() => {
    const filtrados = treinamentos.filter((tr) => {
      const depNome = (tr.departamentos || [])
        .map((depId) => departamentos.find((dep) => dep.id === depId)?.nome)
        .filter(Boolean)
        .join(', ');
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
      const depA = (a.departamentos || [])
        .map((depId) => departamentos.find((dep) => dep.id === depId)?.nome)
        .filter(Boolean)
        .join(', ');
      const depB = (b.departamentos || [])
        .map((depId) => departamentos.find((dep) => dep.id === depId)?.nome)
        .filter(Boolean)
        .join(', ');
      const valueA = sort.key === 'departamento' ? depA : a[sort.key] || '';
      const valueB = sort.key === 'departamento' ? depB : b[sort.key] || '';
      return valueA.toString().localeCompare(valueB.toString()) * direction;
    });

    return sorted;
  }, [departamentos, filters, sort, treinamentos]);

  const abrirNovo = () => {
    setFormTreinamento({
      id: null,
      codigo: '',
      nome: '',
      responsavel: '',
      ultima_atualizacao: '',
      departamentos: [],
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
      ultima_atualizacao: normalizeDateToInput(treinamento.ultima_atualizacao),
      departamentos: (treinamento.departamentos || [])
        .map((depId) => departamentos.find((dep) => dep.id === depId)?.nome)
        .filter(Boolean),
    });
    setSelecionado(treinamento);
    setView('detail');
  };

  const salvarTreinamento = async () => {
    const nomesSelecionados = (formTreinamento.departamentos || []).filter(Boolean);
    if (!formTreinamento.nome || nomesSelecionados.length === 0) return;
    const departamentoIds = [];
    for (const nomeRaw of nomesSelecionados) {
      const nome = nomeRaw.toString().trim();
      if (!nome) continue;
      const existente = departamentoPorNome.get(nome.toLowerCase());
      if (existente) {
        departamentoIds.push(existente.id);
      } else {
        const criado = await createDepartamento({ nome });
        departamentoIds.push(criado.id);
      }
    }
    const payload = {
      nome: formTreinamento.nome,
      responsavel: formTreinamento.responsavel,
      departamentos: departamentoIds,
    };
    if (formTreinamento.id) {
      await updateTreinamento(formTreinamento.id, payload);
    } else {
      await createTreinamento(payload);
    }
    await carregarTudo();
    setView('list');
  };

  const salvarQuestionarioEficacia = async () => {
    if (!formTreinamento.id) return;
    setEficaciaErro('');
    if (eficaciaQuestionario?.id && eficaciaTemTentativas) {
      setEficaciaErro('Este formulario ja foi respondido. Crie uma nova versao para alterar.');
      return;
    }
    const notaMinima =
      eficaciaForm.nota_minima === '' || eficaciaForm.nota_minima === null
        ? null
        : Number(eficaciaForm.nota_minima) || 0;
    try {
      if (eficaciaQuestionario?.id) {
        await updateEficaciaQuestionario(eficaciaQuestionario.id, {
          titulo: eficaciaForm.titulo,
          nota_minima: notaMinima,
          ativo: !!eficaciaForm.ativo,
          treinamento: formTreinamento.id,
        });
      } else {
        await createEficaciaQuestionario({
          titulo: eficaciaForm.titulo,
          nota_minima: notaMinima,
          ativo: !!eficaciaForm.ativo,
          treinamento: formTreinamento.id,
        });
      }
      await carregarEficacia(formTreinamento.id);
    } catch (error) {
      setEficaciaErro('Falha ao salvar formulario de eficacia.');
    }
  };

  const aplicarModeloSelecionado = async () => {
    if (!formTreinamento.id || !modeloSelecionadoId) return;
    setEficaciaErro('');
    setAplicandoModelo(true);
    try {
      await aplicarModeloEficacia(formTreinamento.id, modeloSelecionadoId);
      await carregarEficacia(formTreinamento.id);
    } catch (error) {
      setEficaciaErro('Falha ao aplicar modelo de formulario.');
    } finally {
      setAplicandoModelo(false);
    }
  };

  const criarNovaVersaoFormulario = async () => {
    if (!eficaciaQuestionario?.id) return;
    setEficaciaErro('');
    try {
      await clonarEficaciaQuestionario(eficaciaQuestionario.id);
      await carregarEficacia(formTreinamento.id);
    } catch (error) {
      setEficaciaErro('Falha ao criar nova versao do formulario.');
    }
  };

  const abrirNovaPergunta = () => {
    setEficaciaErro('');
    if (eficaciaTemTentativas) {
      setEficaciaErro('Este formulario ja foi respondido. Crie uma nova versao para alterar.');
      return;
    }
    setPerguntaModalMode('create');
    setFormPergunta({
      id: null,
      enunciado: '',
      ordem: 0,
      tipo: 'multipla_escolha_correta',
      obrigatoria: true,
    });
    setFormAlternativas([
      { id: null, texto: '', correta: true },
      { id: null, texto: '', correta: false },
    ]);
    setShowPerguntaModal(true);
  };

  const abrirEditarPergunta = (pergunta) => {
    setEficaciaErro('');
    if (eficaciaTemTentativas) {
      setEficaciaErro('Este formulario ja foi respondido. Crie uma nova versao para alterar.');
      return;
    }
    setPerguntaModalMode('edit');
    setFormPergunta({
      id: pergunta.id,
      enunciado: pergunta.enunciado || '',
      ordem: pergunta.ordem || 0,
      tipo: pergunta.tipo || 'multipla_escolha_correta',
      obrigatoria: pergunta.obrigatoria ?? true,
    });
    const alternativas = (pergunta.alternativas || []).map((alt) => ({
      id: alt.id,
      texto: alt.texto,
      correta: !!alt.correta,
    }));
    if (isMultiplaEscolha(pergunta.tipo)) {
      setFormAlternativas(
        alternativas.length > 0
          ? alternativas
          : [
              { id: null, texto: '', correta: true },
              { id: null, texto: '', correta: false },
            ]
      );
    } else {
      setFormAlternativas([
        { id: null, texto: '', correta: false },
        { id: null, texto: '', correta: false },
      ]);
    }
    setShowPerguntaModal(true);
  };

  const adicionarAlternativa = () => {
    setFormAlternativas((prev) => [...prev, { id: null, texto: '', correta: false }]);
  };

  const removerAlternativa = (index) => {
    if (!confirmarExclusao('Tem certeza que deseja remover esta alternativa?')) return;
    setFormAlternativas((prev) => prev.filter((_, i) => i !== index));
  };

  const definirAlternativaCorreta = (index) => {
    setFormAlternativas((prev) =>
      prev.map((alt, i) => ({
        ...alt,
        correta: i === index,
      }))
    );
  };

  const salvarPergunta = async () => {
    if (!eficaciaQuestionario?.id) return;
    if (!formPergunta.enunciado.trim()) return;
    const tipo = formPergunta.tipo || 'multipla_escolha_correta';
    const alternativasValidas = formAlternativas.filter((alt) => alt.texto.trim());
    if (isMultiplaEscolha(tipo)) {
      if (alternativasValidas.length < 2) {
        setEficaciaErro('Inclua pelo menos duas alternativas.');
        return;
      }
      if (permiteAlternativaCorreta(tipo) && !alternativasValidas.some((alt) => alt.correta)) {
        setEficaciaErro('Selecione a alternativa correta.');
        return;
      }
    }
    setEficaciaErro('');
    try {
      let perguntaId = formPergunta.id;
      if (perguntaModalMode === 'edit' && perguntaId) {
        await updateEficaciaPergunta(perguntaId, {
          enunciado: formPergunta.enunciado,
          ordem: formPergunta.ordem || 0,
          tipo,
          obrigatoria: formPergunta.obrigatoria ?? true,
          questionario: eficaciaQuestionario.id,
        });
        const existentes =
          eficaciaQuestionario.perguntas?.find((p) => p.id === perguntaId)?.alternativas || [];
        for (const alt of existentes) {
          await deleteEficaciaAlternativa(alt.id);
        }
      } else {
        const ordem = (eficaciaQuestionario.perguntas || []).length + 1;
        const criada = await createEficaciaPergunta({
          enunciado: formPergunta.enunciado,
          ordem,
          tipo,
          obrigatoria: formPergunta.obrigatoria ?? true,
          questionario: eficaciaQuestionario.id,
        });
        perguntaId = criada.id;
      }

      if (isMultiplaEscolha(tipo)) {
        for (const alt of alternativasValidas) {
          await createEficaciaAlternativa({
            pergunta: perguntaId,
            texto: alt.texto,
            correta: permiteAlternativaCorreta(tipo) ? !!alt.correta : false,
          });
        }
      }

      await carregarEficacia(formTreinamento.id);
      setShowPerguntaModal(false);
    } catch (error) {
      setEficaciaErro('Falha ao salvar pergunta.');
    }
  };

  const excluirPergunta = async (perguntaId) => {
    if (!perguntaId) return;
    if (!confirmarExclusao('Tem certeza que deseja excluir esta pergunta?')) return;
    await deleteEficaciaPergunta(perguntaId);
    await carregarEficacia(formTreinamento.id);
  };

  const excluirTreinamento = async (id) => {
    if (!confirmarExclusao('Tem certeza que deseja excluir este treinamento?')) return;
    await deleteTreinamento(id);
    await carregarTudo();
  };

  const excluirModulo = async (id) => {
    if (!confirmarExclusao('Tem certeza que deseja excluir este modulo?')) return;
    await deleteModulo(id);
    await carregarTudo();
  };

  const modulosDoTreinamento = useMemo(() => {
    if (!formTreinamento.id) return [];
    return modulos.filter((mod) => mod.treinamento === formTreinamento.id);
  }, [formTreinamento.id, modulos]);

  const abrirModalModulo = () => {
    setFormModulo({ titulo: '', descricao: '', video_iframe: '', video_origem: 'youtube' });
    setModuloModalMode('create');
    setShowModuloModal(true);
  };

  const abrirEditarModulo = (modulo) => {
    setFormModulo({
      id: modulo.id,
      titulo: modulo.titulo || '',
      descricao: modulo.descricao || '',
      video_iframe: modulo.video_iframe || '',
      video_origem: modulo.video_origem || inferVideoOrigem(modulo.video_iframe || ''),
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
        video_origem: formModulo.video_origem || inferVideoOrigem(formModulo.video_iframe),
        treinamento: formTreinamento.id,
      });
    } else {
      await createModulo({
        titulo: formModulo.titulo,
        descricao: formModulo.descricao,
        video_iframe: formModulo.video_iframe,
        video_origem: formModulo.video_origem || inferVideoOrigem(formModulo.video_iframe),
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
                    <th onClick={() => handleSort('departamento')}>Departamentos</th>
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
                    <td>
                      {(tr.departamentos || [])
                        .map((depId) => departamentos.find((dep) => dep.id === depId)?.nome)
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
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
                  value={formTreinamento.codigo || ''}
                  placeholder="Gerado automaticamente"
                  disabled
                />
              </label>
              <label>
                Nome do Treinamento
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
                  disabled
                />
              </label>
            </div>
            <div className="departamentos-panel">
              <div className="departamentos-title">Departamentos</div>
              <div className="departamentos-grid">
                {departamentosOptions.map((dep) => {
                  const selecionado = (formTreinamento.departamentos || []).some(
                    (item) => item.toLowerCase() === dep.value.toLowerCase()
                  );
                  const geralSelecionado = (formTreinamento.departamentos || []).some(
                    (item) => item.toLowerCase() === 'geral'
                  );
                  const desabilitado = dep.value.toLowerCase() !== 'geral' && geralSelecionado;
                  return (
                    <label
                      key={dep.label}
                      className={`departamentos-item${selecionado ? ' is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        disabled={desabilitado}
                        onChange={() => toggleDepartamentoSelecionado(dep.value)}
                      />
                      <span>{dep.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="departamentos-hint">
                Se selecionar Geral, nenhum outro departamento pode ser escolhido.
              </div>
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
                      onClick={() => excluirModulo(mod.id)}
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

            <div className="section-title">Formulario de eficacia</div>
            {!formTreinamento.id && (
              <div style={{ color: 'var(--text-muted)' }}>
                Salve o treinamento para configurar o formulario de eficacia.
              </div>
            )}
            {formTreinamento.id && (
              <div className="eficacia-admin-panel">
                <div className="eficacia-admin-header">
                  <div>
                    <div className="eficacia-admin-title">Configuracao do formulario</div>
                    <div className="eficacia-admin-sub">
                      Selecione um modelo e ajuste o conteudo para este treinamento.
                    </div>
                  </div>
                  <div className="eficacia-actions">
                    <button
                      type="button"
                      className="action-button action-button--primary"
                      onClick={salvarQuestionarioEficacia}
                      disabled={eficaciaQuestionario?.id && eficaciaTemTentativas}
                      title="Salvar formulario"
                      aria-label="Salvar formulario"
                    >
                      <Save size={16} />
                      Salvar formulario
                    </button>
                  </div>
                </div>

                <div className="eficacia-settings-grid">
                  <label className="eficacia-toggle">
                    <input
                      type="checkbox"
                      checked={!!eficaciaForm.ativo}
                      onChange={(event) =>
                        setEficaciaForm({ ...eficaciaForm, ativo: event.target.checked })
                      }
                    />
                    <span>Ativo</span>
                  </label>
                </div>

                <div className="eficacia-admin-row">
                  <label className="eficacia-field">
                    <span>Modelo de formulario</span>
                    <select
                      value={modeloSelecionadoId}
                      disabled={!eficaciaAtiva}
                      onChange={(event) => setModeloSelecionadoId(event.target.value)}
                    >
                      <option value="">Selecione um modelo</option>
                      {formulariosModelo.map((modelo) => (
                        <option key={modelo.id} value={modelo.id}>
                          {modelo.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="eficacia-actions">
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={aplicarModeloSelecionado}
                      disabled={!eficaciaAtiva || !modeloSelecionadoId || aplicandoModelo}
                      title="Aplicar modelo"
                      aria-label="Aplicar modelo"
                    >
                      <Save size={16} />
                      Aplicar modelo
                    </button>
                  </div>
                </div>
                {eficaciaTemTentativas && (
                  <div className="eficacia-alert">
                    <div>
                      Este formulario ja foi respondido. Para alterar, crie uma nova versao.
                    </div>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={criarNovaVersaoFormulario}
                      disabled={!eficaciaAtiva}
                      title="Criar nova versao"
                      aria-label="Criar nova versao"
                    >
                      <Plus size={16} />
                      Nova versao
                    </button>
                  </div>
                )}
                <div className="eficacia-settings-grid">
                  <label className="eficacia-field eficacia-field--full">
                    <span>Titulo</span>
                    <input
                      type="text"
                      value={eficaciaForm.titulo}
                      disabled={!eficaciaAtiva}
                      onChange={(event) =>
                        setEficaciaForm({ ...eficaciaForm, titulo: event.target.value })
                      }
                    />
                  </label>
                  <label className="eficacia-field">
                    <span>Nota minima (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      disabled={
                        !eficaciaAtiva ||
                        eficaciaForm.nota_minima === '' ||
                        eficaciaForm.nota_minima === null
                      }
                      value={eficaciaForm.nota_minima}
                      onChange={(event) =>
                        setEficaciaForm({ ...eficaciaForm, nota_minima: event.target.value })
                      }
                    />
                  </label>
                  <label className="eficacia-toggle">
                    <input
                      type="checkbox"
                      disabled={!eficaciaAtiva}
                      checked={eficaciaForm.nota_minima === '' || eficaciaForm.nota_minima === null}
                      onChange={(event) =>
                        setEficaciaForm({
                          ...eficaciaForm,
                          nota_minima: event.target.checked ? '' : 70,
                        })
                      }
                    />
                    <span>Sem nota minima</span>
                  </label>
                </div>
                {eficaciaErro && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{eficaciaErro}</div>}
                {eficaciaCarregando && <div>Carregando formulario...</div>}
                {!eficaciaCarregando && eficaciaQuestionario && (
                  <>
                    <div className="eficacia-perguntas-header">
                      <div className="eficacia-perguntas-count">
                        {(eficaciaQuestionario.perguntas || []).length} pergunta(s)
                      </div>
                      <button
                        type="button"
                        className="action-button action-button--primary"
                        onClick={abrirNovaPergunta}
                        disabled={!eficaciaAtiva || eficaciaTemTentativas}
                        title="Nova pergunta"
                        aria-label="Nova pergunta"
                      >
                        <Plus size={16} />
                        Nova pergunta
                      </button>
                    </div>
                    <div className="eficacia-perguntas-list">
                      {(eficaciaQuestionario.perguntas || []).map((pergunta) => (
                        <div key={pergunta.id} className="eficacia-pergunta-card">
                          <div>
                            <strong>{pergunta.enunciado}</strong>
                            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                              {tipoPerguntaLabel(pergunta.tipo)} •{' '}
                              {pergunta.obrigatoria ? 'Obrigatoria' : 'Opcional'}
                            </div>
                            {isMultiplaEscolha(pergunta.tipo) && (
                              <ul style={{ margin: '8px 0 0 16px', color: 'var(--text-muted)' }}>
                                {(pergunta.alternativas || []).map((alt) => (
                                  <li key={alt.id}>
                                    {alt.texto} {alt.correta ? '(correta)' : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              className="icon-button icon-button--ghost"
                              onClick={() => abrirEditarPergunta(pergunta)}
                              disabled={!eficaciaAtiva || eficaciaTemTentativas}
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              onClick={() => excluirPergunta(pergunta.id)}
                              disabled={!eficaciaAtiva || eficaciaTemTentativas}
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(eficaciaQuestionario.perguntas || []).length === 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>Nenhuma pergunta cadastrada.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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
                  Origem do video
                  <select
                    value={videoOrigemAtual}
                    onChange={(event) => setFormModulo({ ...formModulo, video_origem: event.target.value })}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="canva">Canva</option>
                    <option value="iframe">Outro/Iframe</option>
                  </select>
                </label>
                <label>
                  Link do video
                  <input
                    type="text"
                    value={formModulo.video_iframe}
                    placeholder={videoPlaceholders[videoOrigemAtual]}
                    onChange={(event) => setFormModulo({ ...formModulo, video_iframe: event.target.value })}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {videoHints[videoOrigemAtual]}
                  </span>
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

        {showPerguntaModal && (
          <div className="modal-overlay">
            <div className="modal modal--wide">
              <div className="modal-header">
                <div>
                  <h2>{perguntaModalMode === 'edit' ? 'Editar pergunta' : 'Nova pergunta'}</h2>
                  <div className="modal-sub">Defina o tipo e os detalhes da pergunta.</div>
                </div>
              </div>
              <div className="question-modal-grid">
                <label className="question-field question-field--full">
                  <span>Enunciado</span>
                  <textarea
                    rows={3}
                    value={formPergunta.enunciado}
                    onChange={(event) =>
                      setFormPergunta({ ...formPergunta, enunciado: event.target.value })
                    }
                  />
                </label>
                <label className="question-field">
                  <span>Tipo</span>
                  <select
                    value={formPergunta.tipo}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFormPergunta((prev) => ({ ...prev, tipo: value }));
                      if (!isMultiplaEscolha(value)) {
                        setFormAlternativas([
                          { id: null, texto: '', correta: false },
                          { id: null, texto: '', correta: false },
                        ]);
                      } else if (!permiteAlternativaCorreta(value)) {
                        setFormAlternativas((prev) => prev.map((alt) => ({ ...alt, correta: false })));
                      }
                    }}
                  >
                    {TIPOS_PERGUNTA.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="question-toggle">
                  <input
                    type="checkbox"
                    checked={formPergunta.obrigatoria ?? true}
                    onChange={(event) =>
                      setFormPergunta((prev) => ({ ...prev, obrigatoria: event.target.checked }))
                    }
                  />
                  <span>Obrigatoria</span>
                </label>
              </div>
              {isMultiplaEscolha(formPergunta.tipo) ? (
                <div className="alternatives-panel">
                  <div className="alternatives-header">
                    <div>
                      <div className="alternatives-title">Alternativas</div>
                      <div className="alternatives-sub">
                        {permiteAlternativaCorreta(formPergunta.tipo)
                          ? 'Marque a alternativa correta.'
                          : 'Nao ha alternativa correta.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={adicionarAlternativa}
                      title="Adicionar alternativa"
                      aria-label="Adicionar alternativa"
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>
                  {formAlternativas.map((alt, index) => (
                    <div key={`alt-${index}`} className="alternatives-row">
                      {permiteAlternativaCorreta(formPergunta.tipo) ? (
                        <input
                          type="radio"
                          name="alternativa-correta"
                          checked={alt.correta}
                          onChange={() => definirAlternativaCorreta(index)}
                        />
                      ) : (
                        <span className="alternatives-bullet" aria-hidden="true" />
                      )}
                      <input
                        type="text"
                        value={alt.texto}
                        placeholder={`Alternativa ${index + 1}`}
                        onChange={(event) =>
                          setFormAlternativas((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, texto: event.target.value } : item
                            )
                          )
                        }
                      />
                      {formAlternativas.length > 2 && (
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          onClick={() => removerAlternativa(index)}
                          title="Remover alternativa"
                          aria-label="Remover alternativa"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alternatives-placeholder">
                  <div className="alternatives-title">Alternativas</div>
                  <div className="alternatives-sub">
                    Este tipo nao utiliza alternativas. O colaborador respondera no formulario final.
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="action-button action-button--primary"
                  onClick={salvarPergunta}
                  title="Salvar"
                  aria-label="Salvar"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  onClick={() => setShowPerguntaModal(false)}
                  title="Voltar"
                  aria-label="Voltar"
                >
                  <ArrowLeft size={16} />
                  Voltar
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
