import React, { useMemo, useState } from 'react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts[0]?.length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  if (parts[2]?.length === 4) {
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }
  return dateStr;
};

const TrainingExplorer = ({
  departamentos,
  carregando,
  erroCatalogo,
  progresso,
  treinamentoStatus,
  onIniciar,
  onToggleModulo,
  meusTreinamentos,
}) => {
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState(null);
  const [moduloSelecionado, setModuloSelecionado] = useState(null);
  const [departamentosAbertos, setDepartamentosAbertos] = useState({});
  const andamento = (meusTreinamentos || []).filter((t) => t.status === 'em_andamento');
  const concluidos = (meusTreinamentos || []).filter((t) => t.status === 'concluido');

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
    if (progressoAtual.percentual === 100) return 'concluido';
    if (progressoAtual.percentual > 0 || treinamentoStatus[treinamentoSelecionado.id]?.status === 'em_andamento') {
      return 'em_andamento';
    }
    return 'nao_iniciado';
  }, [treinamentoSelecionado, progressoAtual, treinamentoStatus]);

  const labelStatus = {
    nao_iniciado: 'Nao iniciado',
    em_andamento: 'Em andamento',
    concluido: 'Concluido',
  };

  const toggleDepartamento = (id) => {
    setDepartamentosAbertos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
            {departamentos.map((dep) => (
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
                        src={moduloSelecionado.video_iframe || moduloSelecionado.video}
                        title={moduloSelecionado.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onToggleModulo(treinamentoSelecionado.id, moduloSelecionado.id)}
                        style={{ padding: '10px 16px', borderRadius: 999, border: 'none', background: progresso[moduloSelecionado.id] ? 'var(--brand-gold)' : 'var(--brand-navy)', color: '#fff', fontWeight: 600 }}
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
                              style={{ background: progresso[mod.id] ? 'var(--brand-gold)' : 'var(--brand-navy)' }}
                            >
                              {progresso[mod.id] ? 'Concluido' : 'Marcar concluido'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            </section>
          </div>
        ) : (
          <div className="training-dashboard">
            <h2 className="content__title">Meus Treinamentos</h2>
            <div className="dashboard-grid">
              <div>
                <div className="section-title">Em andamento</div>
                <div className="progress-panel">
                  {andamento.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Nenhum treinamento.</div>}
                  {andamento.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="progress-row progress-row--link"
                      onClick={() => {
                        const treino = departamentos
                          .flatMap((dep) => dep.treinamentos || [])
                          .find((tr) => tr.id === item.id);
                        if (treino) handleSelecionarTreinamento(treino);
                      }}
                    >
                      <span>{item.nome}</span>
                      <strong>{item.percentual}%</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-title">Finalizados</div>
                <div className="progress-panel">
                  {concluidos.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Nenhum treinamento.</div>}
                  {concluidos.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="progress-row progress-row--link"
                      onClick={() => {
                        const treino = departamentos
                          .flatMap((dep) => dep.treinamentos || [])
                          .find((tr) => tr.id === item.id);
                        if (treino) handleSelecionarTreinamento(treino);
                      }}
                    >
                      <span>{item.nome}</span>
                      <strong>{item.percentual}%</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TrainingExplorer;
