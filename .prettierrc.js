module.exports = {
  // Configurações básicas
  semi: true,
  trailingComma: 'none',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // Configurações de quebra de linha
  endOfLine: 'lf',
  proseWrap: 'preserve',
  
  // Configurações de formatação
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Configurações específicas para arquivos
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always'
      }
    }
  ]
};
