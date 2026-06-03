// =====================================================
// DADOS FINANCEIROS - Categorias e Templates
// =====================================================

const CATEGORIES = {
  income: [
    { id: 'salario', name: 'Salário', icon: 'fa-briefcase', color: '#4CAF50' },
    { id: 'fgts', name: 'FGTS', icon: 'fa-landmark', color: '#2196F3' },
    { id: 'decimo', name: 'Décimo Terceiro', icon: 'fa-gift', color: '#FF9800' },
    { id: 'vale', name: 'Vale Alimentação', icon: 'fa-utensils', color: '#9C27B0' },
    { id: 'outros_rec', name: 'Outros', icon: 'fa-plus-circle', color: '#607D8B' },
  ],
  expense: [
    { id: 'moradia', name: 'Moradia', icon: 'fa-home', color: '#E91E63' },
    { id: 'veiculos', name: 'Veículos', icon: 'fa-car', color: '#3F51B5' },
    { id: 'saude', name: 'Saúde', icon: 'fa-heart-pulse', color: '#F44336' },
    { id: 'educacao', name: 'Educação', icon: 'fa-graduation-cap', color: '#673AB7' },
    { id: 'alimentacao', name: 'Alimentação', icon: 'fa-utensils', color: '#FF5722' },
    { id: 'servicos', name: 'Serviços', icon: 'fa-bolt', color: '#FFC107' },
    { id: 'seguros', name: 'Seguros', icon: 'fa-shield-halved', color: '#00BCD4' },
    { id: 'financiamentos', name: 'Financiamentos', icon: 'fa-file-invoice-dollar', color: '#795548' },
    { id: 'pessoal', name: 'Pessoal', icon: 'fa-user', color: '#FF4081' },
    { id: 'cartoes', name: 'Cartões', icon: 'fa-credit-card', color: '#7B1FA2' },
    { id: 'outros_desp', name: 'Outros', icon: 'fa-ellipsis', color: '#9E9E9E' },
  ]
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Templates recorrentes iniciais vazios - o usuário cadastra os seus
const DEFAULT_RECURRING = [];
const DEFAULT_GOALS = [];
