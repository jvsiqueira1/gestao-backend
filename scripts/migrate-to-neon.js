const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando migração para o novo banco de dados...');

try {
  // Gerar o cliente Prisma
  console.log('📦 Gerando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Executar as migrations
  console.log('🔄 Executando migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Executar o seed (se existir)
  console.log('🌱 Executando seed...');
  try {
    execSync('npm run prisma:seed', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Seed não encontrado ou falhou, continuando...');
  }
  
  console.log('✅ Migração concluída com sucesso!');
  console.log('🎉 Seu banco de dados está pronto para uso.');
  
} catch (error) {
  console.error('❌ Erro durante a migração:', error.message);
  process.exit(1);
} 