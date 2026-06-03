// =====================================================
// DADOS FINANCEIROS - Extraídos da planilha Google Sheets
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
    { id: 'outros_desp', name: 'Outros', icon: 'fa-ellipsis', color: '#9E9E9E' },
  ]
};

const ACCOUNTS = [
  { id: 'picpay', name: 'PicPay', color: '#21C25E', icon: 'fa-wallet' },
  { id: 'nubank', name: 'Nubank', color: '#8A05BE', icon: 'fa-credit-card' },
  { id: 'inter', name: 'Inter', color: '#FF7A00', icon: 'fa-credit-card' },
  { id: 'caixa', name: 'Caixa', color: '#005CA9', icon: 'fa-building-columns' },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function buildInitialTransactions() {
  const transactions = [];

  const incomeTemplate = [
    { desc: 'Salário Geiza', cat: 'salario', day: 5, responsible: 'Geiza' },
    { desc: 'Salário Elen', cat: 'salario', day: 5, responsible: 'Elen' },
    { desc: 'Salário Elen (Dia 20)', cat: 'salario', day: 20, responsible: 'Elen' },
    { desc: 'FGTS', cat: 'fgts', day: 7, responsible: 'Elen' },
    { desc: 'Vale Alimentação Elen', cat: 'vale', day: 1, responsible: 'Elen' },
  ];

  const expenseTemplate = [
    { desc: 'Financiamento Moto', cat: 'financiamentos', day: 10, responsible: '' },
    { desc: 'Fies - Geiza', cat: 'educacao', day: 10, responsible: 'Geiza' },
    { desc: 'Pós-Graduação - Geiza', cat: 'educacao', day: 11, responsible: 'Geiza' },
    { desc: 'Energia', cat: 'servicos', day: 10, responsible: 'Geiza' },
    { desc: 'Internet', cat: 'servicos', day: 20, responsible: '' },
    { desc: 'Lote 1', cat: 'moradia', day: 28, responsible: 'Geiza' },
    { desc: 'Lote 2', cat: 'moradia', day: 25, responsible: '' },
    { desc: 'Unimed Ohana', cat: 'saude', day: 15, responsible: 'Geiza' },
    { desc: 'Água', cat: 'servicos', day: 20, responsible: '' },
    { desc: 'Alimentação', cat: 'alimentacao', day: 1, responsible: '' },
    { desc: 'Financiamento Casa', cat: 'financiamentos', day: 12, responsible: 'Geiza' },
    { desc: 'Seguro Carro', cat: 'seguros', day: 5, responsible: '' },
    { desc: 'Seguro Moto', cat: 'seguros', day: 2, responsible: '' },
    { desc: 'Financiamento Carro', cat: 'financiamentos', day: 1, responsible: '' },
  ];

  const incomeValues2025 = {
    'Salário Geiza':        [3316,3316,3316,3316,3150,3150,3150,3150,4400,4400,4400,0],
    'Salário Elen':         [1400,0,1400,1400,1400,1400,1400,1400,2600,2600,2600,3399],
    'Salário Elen (Dia 20)':[1720,0,1720,1720,1720,1720,2000,1720,2000,2000,2000,2000],
    'FGTS':                 [343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96],
    'Vale Alimentação Elen':[427.85,727.85,727.85,650,300,300,300,300,300,300,300,0],
  };

  const expenseValues2025 = {
    'Financiamento Moto':   [793.86,793.86,0,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86],
    'Fies - Geiza':         [162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33],
    'Pós-Graduação - Geiza':[138,138,269,138,138,138,138,138,138,138,138,138],
    'Energia':              [130,130,135,130,0,130,130,130,130,130,130,130],
    'Internet':             [99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90],
    'Lote 1':               [181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73],
    'Lote 2':               [263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,0,263.76,263.76],
    'Unimed Ohana':         [437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05],
    'Água':                 [43.40,70,70,70,70,70,70,70,70,70,70,70],
    'Alimentação':          [1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000],
    'Financiamento Casa':   [1488.71,1488.71,1488.71,1488.71,28.42,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71],
    'Seguro Carro':         [212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99],
    'Seguro Moto':          [139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17],
    'Financiamento Carro':  [0,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47],
  };

  // 2026: projeção baseada nos últimos valores de 2025
  const incomeValues2026 = {
    'Salário Geiza':        [4400,4400,4400,4400,4400,4400,4400,4400,4400,4400,4400,4400],
    'Salário Elen':         [3399,3399,3399,3399,3399,3399,3399,3399,3399,3399,3399,3399],
    'Salário Elen (Dia 20)':[2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000],
    'FGTS':                 [343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96,343.96],
    'Vale Alimentação Elen':[300,300,300,300,300,300,300,300,300,300,300,300],
  };

  const expenseValues2026 = {
    'Financiamento Moto':   [793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86,793.86],
    'Fies - Geiza':         [162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33,162.33],
    'Pós-Graduação - Geiza':[138,138,138,138,138,138,138,138,138,138,138,138],
    'Energia':              [130,130,130,130,130,130,130,130,130,130,130,130],
    'Internet':             [99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90,99.90],
    'Lote 1':               [181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73,181.73],
    'Lote 2':               [263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76,263.76],
    'Unimed Ohana':         [437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05,437.05],
    'Água':                 [70,70,70,70,70,70,70,70,70,70,70,70],
    'Alimentação':          [1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000,1000],
    'Financiamento Casa':   [1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71,1488.71],
    'Seguro Carro':         [212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99,212.99],
    'Seguro Moto':          [139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17,139.17],
    'Financiamento Carro':  [2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47,2796.47],
  };

  const today = new Date();
  const currentMonth = today.getMonth();

  function addYear(year, incomeVals, expenseVals) {
    incomeTemplate.forEach(item => {
      const vals = incomeVals[item.desc];
      if (!vals) return;
      vals.forEach((val, monthIdx) => {
        if (val > 0) {
          const isPast = (year < today.getFullYear()) || (year === today.getFullYear() && monthIdx < currentMonth);
          transactions.push({
            id: generateId() + year + monthIdx + Math.random().toString(36).substr(2,3),
            type: 'income',
            description: item.desc,
            category: item.cat,
            amount: val,
            date: `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
            dueDay: item.day,
            recurring: true,
            responsible: item.responsible,
            paid: isPast
          });
        }
      });
    });

    expenseTemplate.forEach(item => {
      const vals = expenseVals[item.desc];
      if (!vals) return;
      vals.forEach((val, monthIdx) => {
        if (val > 0) {
          const isPast = (year < today.getFullYear()) || (year === today.getFullYear() && monthIdx < currentMonth);
          transactions.push({
            id: generateId() + year + monthIdx + Math.random().toString(36).substr(2,3),
            type: 'expense',
            description: item.desc,
            category: item.cat,
            amount: val,
            date: `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(Math.min(item.day, 28)).padStart(2, '0')}`,
            dueDay: item.day,
            recurring: true,
            responsible: item.responsible,
            paid: isPast
          });
        }
      });
    });
  }

  // Extras avulsos de 2025
  const extras2025 = [
    { type:'income', desc:'Décimo Terceiro', cat:'decimo', day:20, resp:'', month:11, year:2025, amount:2000 },
    { type:'income', desc:'Décimo Terceiro', cat:'decimo', day:20, resp:'', month:12, year:2025, amount:2508.34 },
    { type:'income', desc:'Richard', cat:'outros_rec', day:10, resp:'', month:1, year:2025, amount:977.01 },
    { type:'income', desc:'Richard', cat:'outros_rec', day:10, resp:'', month:2, year:2025, amount:310.27 },
    { type:'expense', desc:'IPVA Moto', cat:'veiculos', day:13, resp:'', month:2, year:2025, amount:106.90 },
    { type:'expense', desc:'IPVA Moto', cat:'veiculos', day:13, resp:'', month:3, year:2025, amount:105.79 },
    { type:'expense', desc:'IPVA Moto', cat:'veiculos', day:13, resp:'', month:4, year:2025, amount:105.79 },
    { type:'expense', desc:'IPVA Moto', cat:'veiculos', day:13, resp:'', month:5, year:2025, amount:105.79 },
    { type:'expense', desc:'IPVA Moto', cat:'veiculos', day:13, resp:'', month:6, year:2025, amount:105.79 },
    { type:'expense', desc:'Conselho de Psicologia', cat:'pessoal', day:15, resp:'', month:3, year:2025, amount:579 },
    { type:'expense', desc:'Gasolina Carro', cat:'veiculos', day:15, resp:'', month:3, year:2025, amount:500 },
    { type:'expense', desc:'Despesas Variáveis', cat:'outros_desp', day:15, resp:'', month:8, year:2025, amount:140 },
    { type:'expense', desc:'Despesas Variáveis', cat:'outros_desp', day:15, resp:'', month:9, year:2025, amount:140 },
    { type:'expense', desc:'Despesas Variáveis', cat:'outros_desp', day:15, resp:'', month:10, year:2025, amount:140 },
    { type:'expense', desc:'Despesas Variáveis', cat:'outros_desp', day:15, resp:'', month:11, year:2025, amount:140 },
  ];

  addYear(2025, incomeValues2025, expenseValues2025);
  addYear(2026, incomeValues2026, expenseValues2026);

  extras2025.forEach(e => {
    transactions.push({
      id: generateId() + e.month + Math.random().toString(36).substr(2,3),
      type: e.type,
      description: e.desc,
      category: e.cat,
      amount: e.amount,
      date: `${e.year}-${String(e.month).padStart(2, '0')}-${String(Math.min(e.day, 28)).padStart(2, '0')}`,
      dueDay: e.day,
      recurring: false,
      responsible: e.resp,
      paid: true
    });
  });

  return transactions;
}

const DEFAULT_GOALS = [
  { id: 'g1', name: 'Reserva de Emergência', targetAmount: 30000, currentAmount: 5289.62, icon: 'fa-piggy-bank', color: '#4CAF50', deadline: '2025-12-31' },
  { id: 'g2', name: 'Quitar Carro', targetAmount: 30761.17, currentAmount: 0, icon: 'fa-car', color: '#2196F3', deadline: '2027-06-01' },
  { id: 'g3', name: 'Viagem em Família', targetAmount: 5000, currentAmount: 0, icon: 'fa-plane', color: '#FF9800', deadline: '2026-01-15' },
];
