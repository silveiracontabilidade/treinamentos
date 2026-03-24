export const TIPOS_PERGUNTA = [
  { value: 'multipla_escolha_correta', label: 'Multipla escolha (com resposta certa)' },
  { value: 'multipla_escolha_sem_correta', label: 'Multipla escolha (sem resposta certa)' },
  { value: 'nota_1_10', label: 'Nota (1 a 10)' },
  { value: 'aberta', label: 'Pergunta aberta (texto)' },
];

export const tipoPerguntaLabel = (tipo) => {
  const item = TIPOS_PERGUNTA.find((opt) => opt.value === tipo);
  return item ? item.label : 'Tipo desconhecido';
};

export const isMultiplaEscolha = (tipo) =>
  tipo === 'multipla_escolha_correta' || tipo === 'multipla_escolha_sem_correta';

export const permiteAlternativaCorreta = (tipo) => tipo === 'multipla_escolha_correta';
