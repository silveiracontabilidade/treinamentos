import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save, ArrowLeft } from 'lucide-react';
import {
  fetchFormulariosModelo,
  createFormularioModelo,
  updateFormularioModelo,
  deleteFormularioModelo,
  createEficaciaPergunta,
  updateEficaciaPergunta,
  deleteEficaciaPergunta,
  createEficaciaAlternativa,
  deleteEficaciaAlternativa,
} from '../services/api.js';
import {
  TIPOS_PERGUNTA,
  tipoPerguntaLabel,
  isMultiplaEscolha,
  permiteAlternativaCorreta,
} from '../utils/eficacia.js';

const AdminFormularios = () => {
  const [modelos, setModelos] = useState([]);
  const [status, setStatus] = useState('');
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState(null);

  const [showModeloModal, setShowModeloModal] = useState(false);
  const [modeloModalMode, setModeloModalMode] = useState('create');
  const [formModelo, setFormModelo] = useState({
    id: null,
    titulo: '',
    nota_minima: 70,
    ativo: true,
  });

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

  const carregarModelos = async () => {
    try {
      const data = await fetchFormulariosModelo();
      setModelos(data);
      setStatus('');
    } catch (error) {
      setStatus('Falha ao carregar modelos de formulario.');
    }
  };

  useEffect(() => {
    carregarModelos();
  }, []);

  const modeloSelecionado = useMemo(() => {
    return modelos.find((item) => item.id === modeloSelecionadoId) || null;
  }, [modelos, modeloSelecionadoId]);

  const abrirNovoModelo = () => {
    setModeloModalMode('create');
    setFormModelo({ id: null, titulo: '', nota_minima: 70, ativo: true });
    setShowModeloModal(true);
  };

  const abrirEditarModelo = (modelo) => {
    setModeloModalMode('edit');
    setFormModelo({
      id: modelo.id,
      titulo: modelo.titulo || '',
      nota_minima: modelo.nota_minima === null ? '' : modelo.nota_minima ?? 70,
      ativo: modelo.ativo ?? true,
    });
    setShowModeloModal(true);
  };

  const salvarModelo = async () => {
    if (!formModelo.titulo.trim()) return;
    const notaMinima =
      formModelo.nota_minima === '' || formModelo.nota_minima === null
        ? null
        : Number(formModelo.nota_minima) || 0;
    try {
      if (modeloModalMode === 'edit' && formModelo.id) {
        await updateFormularioModelo(formModelo.id, {
          titulo: formModelo.titulo,
          nota_minima: notaMinima,
          ativo: !!formModelo.ativo,
        });
      } else {
        const criado = await createFormularioModelo({
          titulo: formModelo.titulo,
          nota_minima: notaMinima,
          ativo: !!formModelo.ativo,
        });
        setModeloSelecionadoId(criado.id);
      }
      await carregarModelos();
      setShowModeloModal(false);
    } catch (error) {
      setStatus('Falha ao salvar modelo de formulario.');
    }
  };

  const excluirModelo = async (modeloId) => {
    if (!modeloId) return;
    if (!confirmarExclusao('Tem certeza que deseja excluir este modelo de formulario?')) return;
    try {
      await deleteFormularioModelo(modeloId);
      if (modeloSelecionadoId === modeloId) {
        setModeloSelecionadoId(null);
      }
      await carregarModelos();
    } catch (error) {
      setStatus('Falha ao excluir modelo de formulario.');
    }
  };

  const abrirNovaPergunta = () => {
    if (!modeloSelecionado?.id) return;
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
    if (!modeloSelecionado?.id) return;
    if (!formPergunta.enunciado.trim()) return;
    const tipo = formPergunta.tipo || 'multipla_escolha_correta';
    const alternativasValidas = formAlternativas.filter((alt) => alt.texto.trim());
    if (isMultiplaEscolha(tipo)) {
      if (alternativasValidas.length < 2) {
        setStatus('Inclua pelo menos duas alternativas.');
        return;
      }
      if (permiteAlternativaCorreta(tipo) && !alternativasValidas.some((alt) => alt.correta)) {
        setStatus('Selecione a alternativa correta.');
        return;
      }
    }
    setStatus('');
    try {
      let perguntaId = formPergunta.id;
      if (perguntaModalMode === 'edit' && perguntaId) {
        await updateEficaciaPergunta(perguntaId, {
          enunciado: formPergunta.enunciado,
          ordem: formPergunta.ordem || 0,
          tipo,
          obrigatoria: formPergunta.obrigatoria ?? true,
          questionario: modeloSelecionado.id,
        });
        const existentes =
          modeloSelecionado.perguntas?.find((p) => p.id === perguntaId)?.alternativas || [];
        for (const alt of existentes) {
          await deleteEficaciaAlternativa(alt.id);
        }
      } else {
        const ordem = (modeloSelecionado.perguntas || []).length + 1;
        const criada = await createEficaciaPergunta({
          enunciado: formPergunta.enunciado,
          ordem,
          tipo,
          obrigatoria: formPergunta.obrigatoria ?? true,
          questionario: modeloSelecionado.id,
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

      await carregarModelos();
      setShowPerguntaModal(false);
    } catch (error) {
      setStatus('Falha ao salvar pergunta.');
    }
  };

  const excluirPergunta = async (perguntaId) => {
    if (!perguntaId) return;
    if (!confirmarExclusao('Tem certeza que deseja excluir esta pergunta?')) return;
    await deleteEficaciaPergunta(perguntaId);
    await carregarModelos();
  };

  return (
    <div className="page page--admin">
      <div className="content">
        <div className="content__header">
          <div>
            <h1 className="content__title">Formularios</h1>
            {status && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{status}</div>}
          </div>
          <button
            type="button"
            className="icon-button icon-button--primary"
            onClick={abrirNovoModelo}
            title="Novo formulario"
            aria-label="Novo formulario"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Nota minima</th>
                <th>Ativo</th>
                <th>Perguntas</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((modelo) => (
                <tr
                  key={modelo.id}
                  onClick={() => setModeloSelecionadoId(modelo.id)}
                  style={{
                    background:
                      modeloSelecionadoId === modelo.id ? 'rgba(18, 38, 63, 0.08)' : 'transparent',
                  }}
                >
                  <td>{modelo.titulo}</td>
                  <td>{modelo.nota_minima == null ? 'Sem nota minima' : `${modelo.nota_minima}%`}</td>
                  <td>{modelo.ativo ? 'Sim' : 'Nao'}</td>
                  <td>{(modelo.perguntas || []).length}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="icon-button icon-button--ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirEditarModelo(modelo);
                        }}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          excluirModelo(modelo.id);
                        }}
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {modelos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum modelo cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-title">Perguntas do formulario</div>
        {!modeloSelecionado && (
          <div style={{ color: 'var(--text-muted)' }}>Selecione um modelo para gerenciar perguntas.</div>
        )}
        {modeloSelecionado && (
          <div className="eficacia-admin-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ color: 'var(--text-muted)' }}>
                {(modeloSelecionado.perguntas || []).length} pergunta(s)
              </div>
              <button
                type="button"
                className="icon-button icon-button--primary"
                onClick={abrirNovaPergunta}
                title="Nova pergunta"
                aria-label="Nova pergunta"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="eficacia-perguntas-list">
              {(modeloSelecionado.perguntas || []).map((pergunta) => (
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
                      title="Editar"
                      aria-label="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      onClick={() => excluirPergunta(pergunta.id)}
                      title="Excluir"
                      aria-label="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {(modeloSelecionado.perguntas || []).length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>Nenhuma pergunta cadastrada.</div>
              )}
            </div>
          </div>
        )}

        {showModeloModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h2>{modeloModalMode === 'edit' ? 'Editar formulario' : 'Novo formulario'}</h2>
                  <div className="modal-sub">Defina os parametros principais do formulario.</div>
                </div>
              </div>
              <div className="modal-form-grid">
                <label className="eficacia-field eficacia-field--full">
                  <span>Titulo</span>
                  <input
                    type="text"
                    value={formModelo.titulo}
                    onChange={(event) => setFormModelo({ ...formModelo, titulo: event.target.value })}
                  />
                </label>
                <label className="eficacia-field">
                  <span>Nota minima (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={formModelo.nota_minima === '' || formModelo.nota_minima === null}
                    value={formModelo.nota_minima}
                    onChange={(event) =>
                      setFormModelo({ ...formModelo, nota_minima: event.target.value })
                    }
                  />
                </label>
                <label className="eficacia-toggle">
                  <input
                    type="checkbox"
                    checked={formModelo.nota_minima === '' || formModelo.nota_minima === null}
                    onChange={(event) =>
                      setFormModelo({ ...formModelo, nota_minima: event.target.checked ? '' : 70 })
                    }
                  />
                  <span>Sem nota minima</span>
                </label>
                <label className="eficacia-toggle">
                  <input
                    type="checkbox"
                    checked={!!formModelo.ativo}
                    onChange={(event) => setFormModelo({ ...formModelo, ativo: event.target.checked })}
                  />
                  <span>Ativo</span>
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="action-button action-button--primary"
                  onClick={salvarModelo}
                  title="Salvar"
                  aria-label="Salvar"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  onClick={() => setShowModeloModal(false)}
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

export default AdminFormularios;
