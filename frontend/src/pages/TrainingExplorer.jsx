import React, { useEffect, useMemo, useState } from 'react';
import { fetchEficaciaQuestionario, responderEficacia } from '../services/api.js';
import { isMultiplaEscolha } from '../utils/eficacia.js';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const sanitized = dateStr.split('T')[0].split(' ')[0];
  const parts = sanitized.split('-');
  if (parts[0]?.length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  if (parts[2]?.length === 4) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return dateStr;
};

const extractIframeSrc = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }
  return trimmed;
};

const inferVideoOrigem = (value) => {
  if (!value) return 'iframe';
  const normalized = value.toLowerCase();
  if (normalized.includes('canva.com')) return 'canva';
  if (normalized.includes('youtu')) return 'youtube';
  return 'iframe';
};

const buildYouTubeEmbed = (value) => {
  const trimmed = extractIframeSrc(value);
  if (!trimmed) return '';
  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return trimmed;
  }

  const hostname = url.hostname.replace(/^www\./, '');
  let videoId = '';

  if (hostname === 'youtu.be') {
    videoId = url.pathname.split('/')[1] || '';
  } else if (hostname.endsWith('youtube.com') || hostname.endsWith('youtube-nocookie.com')) {
    if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] || '';
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] || '';
    } else if (url.pathname.startsWith('/live/')) {
      videoId = url.pathname.split('/')[2] || '';
    } else if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') || '';
    }
  }

  if (!videoId) {
    const listId = url.searchParams.get('list');
    if (listId) {
      return `https://www.youtube.com/embed/videoseries?list=${listId}`;
    }
    return trimmed;
  }

  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const start = url.searchParams.get('start') || url.searchParams.get('t');
  if (start && /^\d+$/.test(start)) {
    embedUrl += `?start=${start}`;
  }
  return embedUrl;
};

const buildCanvaEmbed = (value) => {
  const trimmed = extractIframeSrc(value);
  if (!trimmed) return '';
  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    return trimmed;
  }

  if (!url.hostname.includes('canva.com')) {
    return trimmed;
  }

  const keys = [...url.searchParams.keys()];
  keys.forEach((key) => {
    if (key.startsWith('utm_') || key === 'utlId') {
      url.searchParams.delete(key);
    }
  });
  if (!url.searchParams.has('embed')) {
    url.searchParams.set('embed', '1');
  }
  return url.toString();
};

const getVideoSrc = (value, origem) => {
  if (!value) return '';
  const resolvedOrigem = origem || inferVideoOrigem(value);
  if (resolvedOrigem === 'youtube') {
    return buildYouTubeEmbed(value);
  }
  if (resolvedOrigem === 'canva') {
    return buildCanvaEmbed(value);
  }
  return extractIframeSrc(value);
};

const TrainingExplorer = ({
  departamentos,
  carregando,
  erroCatalogo,
  progresso,
  treinamentoStatus,
  matriculas,
  colaboradorDepartamentoId,
  onEficaciaRespondida,
  onIniciar,
  onToggleModulo,
  meusTreinamentos,
}) => {
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState(null);
  const [moduloSelecionado, setModuloSelecionado] = useState(null);
  const [departamentosAbertos, setDepartamentosAbertos] = useState({});
  const [eficaciaData, setEficaciaData] = useState(null);
  const [eficaciaCarregando, setEficaciaCarregando] = useState(false);
  const [eficaciaErro, setEficaciaErro] = useState('');
  const [eficaciaErroModal, setEficaciaErroModal] = useState('');
  const [eficaciaModalAberto, setEficaciaModalAberto] = useState(false);
  const [eficaciaRespostas, setEficaciaRespostas] = useState({});
  const [eficaciaResultado, setEficaciaResultado] = useState(null);
  const departamentosVisiveis = useMemo(
    () => (departamentos || []).filter((dep) => (dep.treinamentos || []).length > 0),
    [departamentos]
  );

  const handleSelecionarTreinamento = (treinamento) => {
    setTreinamentoSelecionado(treinamento);
    setModuloSelecionado(null);
  };

  const progressoAtual = useMemo(() => {
    if (!treinamentoSelecionado) return { percentual: 0, concluidos: 0, total: 0 };
    const modulos = treinamentoSelecionado.modulos || [];
    const total = modulos.length;
    const concluidos = modulos.filter((mod) => progresso[mod.id]).length;
    const percentual = total ? Math.round((concluidos / total) * 100) : 0;
    return { percentual, concluidos, total };
  }, [treinamentoSelecionado, progresso]);

  const statusAtual = useMemo(() => {
    if (!treinamentoSelecionado) return 'nao_iniciado';
    const statusApi = treinamentoStatus[treinamentoSelecionado.id]?.status;
    if (statusApi === 'aguardando_eficacia') return 'aguardando_eficacia';
    if (statusApi === 'concluido' || progressoAtual.percentual === 100) return 'concluido';
    if (progressoAtual.percentual > 0 || statusApi === 'em_andamento') {
      return 'em_andamento';
    }
    return 'nao_iniciado';
  }, [treinamentoSelecionado, progressoAtual, treinamentoStatus]);

  const labelStatus = {
    nao_iniciado: 'Nao iniciado',
    em_andamento: 'Em andamento',
    aguardando_eficacia: 'Aguardando eficacia',
    concluido: 'Concluido',
  };

  const toggleDepartamento = (id) => {
    setDepartamentosAbertos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const treinamentosPorId = useMemo(() => {
    const map = new Map();
    (departamentos || []).forEach((dep) => {
      (dep.treinamentos || []).forEach((tr) => {
        if (!map.has(tr.id)) {
          map.set(tr.id, tr);
        }
      });
    });
    return map;
  }, [departamentos]);

  const departamentoGeralId = useMemo(() => {
    return (departamentos || []).find((dep) => dep.nome?.toLowerCase() === 'geral')?.id || null;
  }, [departamentos]);

  const matriculasPorTreinamento = useMemo(() => {
    const map = new Map();
    (matriculas || []).forEach((m) => {
      map.set(m.treinamento_id, m);
    });
    return map;
  }, [matriculas]);

  const perguntasEficacia = useMemo(() => {
    const perguntas = eficaciaData?.questionario?.perguntas || [];
    return [...perguntas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  }, [eficaciaData]);

  const formularioEficaciaAtivo = treinamentoSelecionado?.eficacia_ativa !== false;
  const esconderFormularioEficacia =
    !formularioEficaciaAtivo ||
    (progressoAtual.percentual === 100 &&
      eficaciaData?.disponivel === false &&
      eficaciaData?.motivo === 'sem_questionario');

  const calcularPercentual = (treinamento) => {
    const modulos = treinamento?.modulos || [];
    const total = modulos.length;
    const concluidos = modulos.filter((mod) => progresso[mod.id]).length;
    return total ? Math.round((concluidos / total) * 100) : 0;
  };

  const treinamentosObrigatorios = useMemo(() => {
    const lista = [];
    treinamentosPorId.forEach((tr) => {
      const deps = tr.departamentos || [];
      const isGeral = departamentoGeralId && deps.includes(departamentoGeralId);
      const isDept = colaboradorDepartamentoId && deps.includes(colaboradorDepartamentoId);
      if (isGeral || isDept) {
        lista.push(tr);
      }
    });
    return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [treinamentosPorId, departamentoGeralId, colaboradorDepartamentoId]);

  const treinamentosObrigatoriosIds = useMemo(() => {
    return new Set(treinamentosObrigatorios.map((tr) => tr.id));
  }, [treinamentosObrigatorios]);

  const treinamentosEletivos = useMemo(() => {
    const lista = [];
    (matriculas || []).forEach((m) => {
      if (treinamentosObrigatoriosIds.has(m.treinamento_id)) return;
      const tr = treinamentosPorId.get(m.treinamento_id) || {
        id: m.treinamento_id,
        nome: `Treinamento ${m.treinamento_id}`,
        modulos: [],
      };
      lista.push(tr);
    });
    return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [matriculas, treinamentosObrigatoriosIds, treinamentosPorId]);

  const resolverStatus = (percentual, statusApi) => {
    if (statusApi === 'aguardando_eficacia') return 'AGUARDANDO EFICÁCIA';
    if (statusApi === 'concluido' || percentual === 100) return 'FINALIZADO';
    if (percentual > 0) return 'INICIADO';
    return 'NÃO INICIADO';
  };

  const matriculaAtual = useMemo(() => {
    if (!treinamentoSelecionado) return null;
    return matriculasPorTreinamento.get(treinamentoSelecionado.id) || null;
  }, [matriculasPorTreinamento, treinamentoSelecionado]);
  const treinamentoConcluido = matriculaAtual?.status === 'concluido';

  useEffect(() => {
    let ativo = true;
    const carregarEficacia = async () => {
      if (!treinamentoSelecionado) {
      setEficaciaData(null);
      setEficaciaResultado(null);
      return;
      }
      if (treinamentoSelecionado.eficacia_ativa === false) {
        setEficaciaData(null);
        setEficaciaResultado(null);
        setEficaciaErro('');
        return;
      }
      if (progressoAtual.percentual < 100) {
        setEficaciaData(null);
        setEficaciaResultado(null);
        setEficaciaErro('');
        return;
      }
      setEficaciaCarregando(true);
      setEficaciaErro('');
      try {
        const data = await fetchEficaciaQuestionario(treinamentoSelecionado.id);
        if (!ativo) return;
        setEficaciaData(data);
        setEficaciaResultado(data?.ultima_tentativa || null);
      } catch (error) {
        if (!ativo) return;
        setEficaciaData(null);
        setEficaciaErro('Falha ao carregar formulario de eficacia.');
      } finally {
        if (ativo) setEficaciaCarregando(false);
      }
    };
    carregarEficacia();
    return () => {
      ativo = false;
    };
  }, [treinamentoSelecionado, progressoAtual.percentual]);

  const abrirFormularioEficacia = () => {
    if (treinamentoConcluido) return;
    setEficaciaRespostas({});
    setEficaciaErroModal('');
    setEficaciaModalAberto(true);
  };

  const fecharFormularioEficacia = () => {
    setEficaciaModalAberto(false);
  };

  const enviarFormularioEficacia = async () => {
    if (!eficaciaData?.questionario) return;
    const perguntas = eficaciaData.questionario.perguntas || [];
    const faltandoObrigatorias = perguntas.filter((pergunta) => {
      const resposta = eficaciaRespostas[pergunta.id];
      if (!pergunta.obrigatoria) return false;
      if (isMultiplaEscolha(pergunta.tipo)) {
        return !resposta?.alternativa_id;
      }
      if (pergunta.tipo === 'nota_1_10') {
        return resposta?.nota == null;
      }
      if (pergunta.tipo === 'aberta') {
        return !(resposta?.texto || '').trim();
      }
      return true;
    });
    if (faltandoObrigatorias.length > 0) {
      setEficaciaErroModal('Responda todas as perguntas obrigatorias antes de enviar.');
      return;
    }
    setEficaciaErroModal('');
    try {
      const respostasPayload = perguntas
        .map((pergunta) => {
          const resposta = eficaciaRespostas[pergunta.id];
          const temResposta =
            resposta?.alternativa_id ||
            resposta?.nota != null ||
            (resposta?.texto || '').trim().length > 0;
          if (!resposta || !temResposta) return null;
          const payload = { pergunta_id: pergunta.id };
          if (resposta.alternativa_id) payload.alternativa_id = resposta.alternativa_id;
          if (resposta.nota != null) payload.nota = resposta.nota;
          if (resposta.texto) payload.texto = resposta.texto;
          return payload;
        })
        .filter(Boolean);
      const data = await responderEficacia(treinamentoSelecionado.id, respostasPayload);
      setEficaciaResultado(data?.tentativa || null);
      if (data?.matricula && onEficaciaRespondida) {
        onEficaciaRespondida(data.matricula);
      }
      setEficaciaModalAberto(false);
    } catch (error) {
      setEficaciaErroModal('Nao foi possivel enviar o formulario. Tente novamente.');
    }
  };

  return (
    <div className="page">
      <aside className="sidebar">
        <div className="sidebar__title">Menu</div>
        <div className="sidebar__group">
          <button
            type="button"
            className="sidebar__topitem"
            onClick={() => { setTreinamentoSelecionado(null); setModuloSelecionado(null); }}
          >
            Meus treinamentos
          </button>
        </div>

        <div className="sidebar__group">
          <button type="button" className="sidebar__topitem">Treinamentos</button>
          <div className="sidebar__subgroup">
            {departamentosVisiveis.map((dep) => (
              <div key={dep.id} className="sidebar__group">
                <button type="button" onClick={() => toggleDepartamento(dep.id)}>
                  {dep.nome}
                </button>
                {departamentosAbertos[dep.id] && (
                  <ul className="sidebar__trainings">
                    {dep.treinamentos.map((tr) => (
                      <li
                        key={tr.id}
                        className={treinamentoSelecionado?.id === tr.id ? 'active' : ''}
                        onClick={() => handleSelecionarTreinamento(tr)}
                      >
                        {tr.nome}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

      </aside>

      <main className="content">
        <div className="content__header" id="top" />

        {erroCatalogo ? (
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>{erroCatalogo}</div>
        ) : treinamentoSelecionado ? (
          <div className="training-grid training-grid--single">
            <section className="training-main">
            {carregando ? (
              <div>Carregando catalogo...</div>
            ) : (
              <>
                <div className="section-title">Dados do treinamento</div>
                <div className="progress-panel">
                  <div className="progress-row">
                    <strong>{treinamentoSelecionado.nome}</strong>
                    <span>Codigo {treinamentoSelecionado.codigo}</span>
                  </div>
                  <div className="progress-row">
                    <span>Responsavel: {treinamentoSelecionado.responsavel}</span>
                    <span>Ultima atualizacao: {formatDate(treinamentoSelecionado.ultimaAtualizacao)}</span>
                  </div>
                  <div className="progress-row">
                    <span>Status: {labelStatus[statusAtual]}</span>
                    <span>{progressoAtual.concluidos}/{progressoAtual.total} modulos</span>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${progressoAtual.percentual}%` }} />
                  </div>
                  {statusAtual === 'nao_iniciado' && (
                    <button
                      type="button"
                      onClick={() => onIniciar(treinamentoSelecionado.id)}
                      style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: 'var(--brand-gold)', color: '#fff', fontWeight: 700 }}
                    >
                      Iniciar treinamento
                    </button>
                  )}
                </div>

                {moduloSelecionado ? (
                  <>
                    <a className="back-link" href="#" onClick={(event) => { event.preventDefault(); setModuloSelecionado(null); }}>
                      Voltar para a lista de modulos
                    </a>
                    <div className="section-title">Detalhes do modulo</div>
                    <div className="module-details">
                      <h2>{moduloSelecionado.titulo}</h2>
                      <p>{moduloSelecionado.descricao}</p>
                      <iframe
                        src={getVideoSrc(
                          moduloSelecionado.video_iframe || moduloSelecionado.video,
                          moduloSelecionado.video_origem
                        )}
                        title={moduloSelecionado.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onToggleModulo(treinamentoSelecionado.id, moduloSelecionado.id)}
                        disabled={treinamentoConcluido}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 999,
                          border: 'none',
                          background: progresso[moduloSelecionado.id]
                            ? 'var(--brand-gold)'
                            : 'var(--brand-navy)',
                          color: '#fff',
                          fontWeight: 600,
                          opacity: treinamentoConcluido ? 0.6 : 1,
                          cursor: treinamentoConcluido ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {progresso[moduloSelecionado.id] ? 'Desmarcar concluido' : 'Marcar como concluido'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="section-title">Modulos do treinamento</div>
                    <div className="module-list">
                      {(treinamentoSelecionado.modulos || []).map((mod) => (
                        <div key={mod.id} className="module-card">
                          <div>
                            <strong>{mod.titulo}</strong>
                            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{mod.descricao}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="secondary" onClick={() => setModuloSelecionado(mod)}>
                              Ver detalhes
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleModulo(treinamentoSelecionado.id, mod.id)}
                              disabled={treinamentoConcluido}
                              style={{
                                background: progresso[mod.id] ? 'var(--brand-gold)' : 'var(--brand-navy)',
                                opacity: treinamentoConcluido ? 0.6 : 1,
                                cursor: treinamentoConcluido ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {progresso[mod.id] ? 'Concluido' : 'Marcar concluido'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!esconderFormularioEficacia && (
                      <>
                        <div className="section-title">Formulario de eficacia</div>
                        <div className="eficacia-panel">
                          {progressoAtual.percentual < 100 && (
                            <div style={{ color: 'var(--text-muted)' }}>
                              Conclua todos os modulos para liberar o formulario.
                            </div>
                          )}
                          {progressoAtual.percentual === 100 && (
                            <>
                              {eficaciaCarregando && <div>Carregando formulario...</div>}
                              {!eficaciaCarregando && eficaciaData?.disponivel === false && (
                                <div style={{ color: 'var(--text-muted)' }}>
                                  Este treinamento nao possui formulario de eficacia.
                                </div>
                              )}
                              {!eficaciaCarregando && eficaciaData?.disponivel && (
                                <>
                                  <div className="eficacia-meta">
                                    {eficaciaData.questionario.nota_minima != null ? (
                                      <span>Nota minima: {eficaciaData.questionario.nota_minima}%</span>
                                    ) : (
                                      <span>Formulario informativo</span>
                                    )}
                                {eficaciaResultado && eficaciaData.questionario.nota_minima != null && (
                                  <span>
                                    Ultima nota: {eficaciaResultado.percentual}% (
                                    {eficaciaData.questionario.nota_minima == null
                                      ? 'Concluido'
                                      : eficaciaResultado.aprovado
                                            ? 'Aprovado'
                                            : 'Reprovado'}
                                        )
                                      </span>
                                    )}
                                  </div>
                                  {perguntasEficacia.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      Formulario sem perguntas cadastradas.
                                    </div>
                                  ) : treinamentoConcluido ? (
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      Formulario ja concluido.
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={abrirFormularioEficacia}
                                      style={{
                                        padding: '8px 16px',
                                        borderRadius: 999,
                                        border: 'none',
                                        background: 'var(--brand-navy)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Responder formulario
                                    </button>
                                  )}
                                </>
                              )}
                              {eficaciaErro && (
                                <div style={{ color: '#b91c1c', fontWeight: 600 }}>{eficaciaErro}</div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            </section>
          </div>
        ) : (
          <div className="training-dashboard">
            <h2 className="content__title">Meus Treinamentos</h2>
            <div className="training-lists">
              <section className="training-list-card">
                <div className="section-title">Treinamentos Obrigatórios</div>
                <table className="training-list-table">
                  <thead>
                    <tr>
                      <th>Treinamento</th>
                      <th>Data início</th>
                      <th>Data fim</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treinamentosObrigatorios.map((tr) => {
                      const matricula = matriculasPorTreinamento.get(tr.id);
                      const percentual = calcularPercentual(tr);
                      return (
                        <tr key={tr.id}>
                          <td>
                            <button
                              type="button"
                              className="training-link"
                              onClick={() => handleSelecionarTreinamento(tr)}
                            >
                              {tr.nome}
                            </button>
                          </td>
                          <td>{matricula?.iniciado_em ? formatDate(matricula.iniciado_em) : '-'}</td>
                          <td>{matricula?.concluido_em ? formatDate(matricula.concluido_em) : '-'}</td>
                          <td>{resolverStatus(percentual, matricula?.status)}</td>
                        </tr>
                      );
                    })}
                    {treinamentosObrigatorios.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhum treinamento obrigatório.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              <section className="training-list-card">
                <div className="section-title">Treinamentos Eletivos</div>
                <table className="training-list-table">
                  <thead>
                    <tr>
                      <th>Treinamento</th>
                      <th>Data início</th>
                      <th>Data fim</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treinamentosEletivos.map((tr) => {
                      const matricula = matriculasPorTreinamento.get(tr.id);
                      const percentual = tr.modulos?.length
                        ? calcularPercentual(tr)
                        : matricula?.percentual_conclusao || 0;
                      return (
                        <tr key={tr.id}>
                          <td>
                            <button
                              type="button"
                              className="training-link"
                              onClick={() => handleSelecionarTreinamento(tr)}
                            >
                              {tr.nome}
                            </button>
                          </td>
                          <td>{matricula?.iniciado_em ? formatDate(matricula.iniciado_em) : '-'}</td>
                          <td>{matricula?.concluido_em ? formatDate(matricula.concluido_em) : '-'}</td>
                          <td>{resolverStatus(percentual, matricula?.status)}</td>
                        </tr>
                      );
                    })}
                    {treinamentosEletivos.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhum treinamento eletivo iniciado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            </div>
          </div>
        )}
      </main>

      {eficaciaModalAberto && (
        <div className="modal-overlay">
          <div className="modal modal--wide">
            <h2>Formulario de eficacia</h2>
            <div className="eficacia-form">
              {perguntasEficacia.map((pergunta, index) => (
                <div key={pergunta.id} className="eficacia-question">
                  <div className="eficacia-question-title">
                    {index + 1}. {pergunta.enunciado}{' '}
                    {pergunta.obrigatoria ? (
                      <span>*</span>
                    ) : (
                      <span style={{ fontWeight: 500 }}>(Opcional)</span>
                    )}
                  </div>
                  {isMultiplaEscolha(pergunta.tipo) && (
                    <div className="eficacia-options">
                      {(pergunta.alternativas || []).map((alt) => (
                        <label key={alt.id} className="eficacia-option">
                          <input
                            type="radio"
                            name={`pergunta-${pergunta.id}`}
                            checked={eficaciaRespostas[pergunta.id]?.alternativa_id === alt.id}
                            onChange={() =>
                              setEficaciaRespostas((prev) => ({
                                ...prev,
                                [pergunta.id]: { alternativa_id: alt.id },
                              }))
                            }
                          />
                          <span>{alt.texto}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {pergunta.tipo === 'nota_1_10' && (
                    <div className="eficacia-options">
                      <select
                        value={eficaciaRespostas[pergunta.id]?.nota ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setEficaciaRespostas((prev) => ({
                            ...prev,
                            [pergunta.id]: {
                              nota: value ? Number(value) : null,
                            },
                          }));
                        }}
                      >
                        <option value="">Selecione uma nota</option>
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const value = idx + 1;
                          return (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  {pergunta.tipo === 'aberta' && (
                    <div className="eficacia-options">
                      <textarea
                        rows={3}
                        value={eficaciaRespostas[pergunta.id]?.texto || ''}
                        onChange={(event) =>
                          setEficaciaRespostas((prev) => ({
                            ...prev,
                            [pergunta.id]: { texto: event.target.value },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {eficaciaErroModal && (
              <div style={{ color: '#b91c1c', fontWeight: 600 }}>{eficaciaErroModal}</div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={enviarFormularioEficacia}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--brand-navy)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Enviar respostas
              </button>
              <button type="button" className="secondary" onClick={fecharFormularioEficacia}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingExplorer;
