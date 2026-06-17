// Generates LoanPT Loan Application Numbers
// Format: LPT-PL-XXXXXXXX-XXX | LPT-OD-... | LPT-CC-... | LPT-BT-...

const PREFIXES = {
  PERSONAL_LOAN: 'PL',
  OD_LIMIT: 'OD',
  CREDIT_CARD: 'CC',
  BALANCE_TRANSFER: 'BT',
};

function generateLAN(productType) {
  const prefix = PREFIXES[productType] || 'GN';
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `LPT-${prefix}-${ts}-${rand}`;
}

module.exports = { generateLAN };
