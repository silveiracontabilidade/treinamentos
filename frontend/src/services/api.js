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
