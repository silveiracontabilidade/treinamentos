import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.0.0.6:8200';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getAdminToken = () => localStorage.getItem('admin_token');
export const setAdminToken = (token) => localStorage.setItem('admin_token', token);
export const clearAdminToken = () => localStorage.removeItem('admin_token');
export const getUserToken = () => localStorage.getItem('user_token');
export const setUserToken = (token) => localStorage.setItem('user_token', token);
export const clearUserToken = () => localStorage.removeItem('user_token');

api.interceptors.request.use((config) => {
  const token = getAdminToken() || getUserToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      if (isAdminRoute) {
        clearAdminToken();
        window.location.href = '/admin/login';
      } else {
        clearUserToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const fetchCatalogo = async () => {
  const { data } = await api.get('/api/public/catalogo/');
  return data;
};

export const fetchMeuProgresso = async () => {
  const { data } = await api.get('/api/public/me/progresso/');
  return data;
};

export const loginEmail = async (email, nome) => {
  const { data } = await api.post('/api/public/login-email/', { email, nome });
  return data;
};

export const iniciarTreinamento = async (email, treinamentoId) => {
  const { data } = await api.post('/api/public/iniciar-treinamento/', {
    treinamento_id: treinamentoId,
  });
  return data;
};

export const concluirModulo = async (email, moduloId, concluido) => {
  const { data } = await api.post('/api/public/concluir-modulo/', {
    modulo_id: moduloId,
    concluido,
  });
  return data;
};

export const loginAdmin = async (username, password) => {
  const { data } = await api.post('/api/token/', { username, password });
  return data;
};

export const loginColaborador = async (email, password) => {
  const { data } = await api.post('/api/token/', { username: email, password });
  return data;
};

export const fetchDepartamentos = async () => {
  const { data } = await api.get('/api/departamentos/');
  return data.results || data;
};

export const createDepartamento = async (payload) => {
  const { data } = await api.post('/api/departamentos/', payload);
  return data;
};

export const updateDepartamento = async (id, payload) => {
  const { data } = await api.put(`/api/departamentos/${id}/`, payload);
  return data;
};

export const deleteDepartamento = async (id) => {
  await api.delete(`/api/departamentos/${id}/`);
};

export const fetchTreinamentos = async () => {
  const { data } = await api.get('/api/treinamentos/');
  return data.results || data;
};

export const fetchEficaciaQuestionario = async (treinamentoId) => {
  const { data } = await api.get(`/api/treinamentos/${treinamentoId}/eficacia/`);
  return data;
};

export const responderEficacia = async (treinamentoId, respostas) => {
  const { data } = await api.post(`/api/treinamentos/${treinamentoId}/eficacia/responder/`, {
    respostas,
  });
  return data;
};

export const createTreinamento = async (payload) => {
  const { data } = await api.post('/api/treinamentos/', payload);
  return data;
};

export const updateTreinamento = async (id, payload) => {
  const { data } = await api.put(`/api/treinamentos/${id}/`, payload);
  return data;
};

export const deleteTreinamento = async (id) => {
  await api.delete(`/api/treinamentos/${id}/`);
};

export const fetchEficaciaQuestionarioAdmin = async (treinamentoId) => {
  const { data } = await api.get(`/api/eficacia-questionarios/?treinamento=${treinamentoId}`);
  return data.results || data;
};

export const createEficaciaQuestionario = async (payload) => {
  const { data } = await api.post('/api/eficacia-questionarios/', payload);
  return data;
};

export const updateEficaciaQuestionario = async (id, payload) => {
  const { data } = await api.put(`/api/eficacia-questionarios/${id}/`, payload);
  return data;
};

export const deleteEficaciaQuestionario = async (id) => {
  await api.delete(`/api/eficacia-questionarios/${id}/`);
};

export const aplicarModeloEficacia = async (treinamentoId, modeloId) => {
  const { data } = await api.post('/api/eficacia-questionarios/aplicar-modelo/', {
    treinamento_id: treinamentoId,
    modelo_id: modeloId,
  });
  return data;
};

export const clonarEficaciaQuestionario = async (id) => {
  const { data } = await api.post(`/api/eficacia-questionarios/${id}/clonar/`);
  return data;
};

export const fetchFormulariosModelo = async () => {
  const { data } = await api.get('/api/formularios-modelo/');
  return data.results || data;
};

export const createFormularioModelo = async (payload) => {
  const { data } = await api.post('/api/formularios-modelo/', payload);
  return data;
};

export const updateFormularioModelo = async (id, payload) => {
  const { data } = await api.put(`/api/formularios-modelo/${id}/`, payload);
  return data;
};

export const deleteFormularioModelo = async (id) => {
  await api.delete(`/api/formularios-modelo/${id}/`);
};

export const createEficaciaPergunta = async (payload) => {
  const { data } = await api.post('/api/eficacia-perguntas/', payload);
  return data;
};

export const updateEficaciaPergunta = async (id, payload) => {
  const { data } = await api.put(`/api/eficacia-perguntas/${id}/`, payload);
  return data;
};

export const deleteEficaciaPergunta = async (id) => {
  await api.delete(`/api/eficacia-perguntas/${id}/`);
};

export const createEficaciaAlternativa = async (payload) => {
  const { data } = await api.post('/api/eficacia-alternativas/', payload);
  return data;
};

export const updateEficaciaAlternativa = async (id, payload) => {
  const { data } = await api.put(`/api/eficacia-alternativas/${id}/`, payload);
  return data;
};

export const deleteEficaciaAlternativa = async (id) => {
  await api.delete(`/api/eficacia-alternativas/${id}/`);
};

export const fetchModulos = async () => {
  const { data } = await api.get('/api/modulos/');
  return data.results || data;
};

export const createModulo = async (payload) => {
  const { data } = await api.post('/api/modulos/', payload);
  return data;
};

export const updateModulo = async (id, payload) => {
  const { data } = await api.put(`/api/modulos/${id}/`, payload);
  return data;
};

export const deleteModulo = async (id) => {
  await api.delete(`/api/modulos/${id}/`);
};

export const fetchUsuarios = async () => {
  const { data } = await api.get('/api/usuarios/');
  return data.results || data;
};

export const createUsuario = async (payload) => {
  const { data } = await api.post('/api/usuarios/', payload);
  return data;
};

export const updateUsuario = async (id, payload) => {
  const { data } = await api.put(`/api/usuarios/${id}/`, payload);
  return data;
};

export const deleteUsuario = async (id) => {
  await api.delete(`/api/usuarios/${id}/`);
};

export const resetUsuarioSenha = async (id) => {
  const { data } = await api.post(`/api/usuarios/${id}/reset_password/`);
  return data;
};

export const fetchUsuarioTreinamentos = async (id) => {
  const { data } = await api.get(`/api/usuarios/${id}/treinamentos/`);
  return data;
};

export default api;
