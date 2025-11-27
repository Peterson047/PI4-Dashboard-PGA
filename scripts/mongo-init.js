/**
 * Script de inicialização do MongoDB
 * Cria o usuário e banco de dados para a aplicação PGA Dashboard
 * Executa automaticamente quando o container MongoDB inicia
 */

// Conectar ao admin database (já autenticado via MONGO_INITDB_ROOT_USERNAME/PASSWORD)
db = db.getSiblingDB('admin');

print('=== MongoDB Initialization Script ===');
print('Criando usuário da aplicação...');

// Criar usuário para a aplicação
db.createUser({
  user: 'user_pga',
  pwd: 'password_pga',
  roles: [
    {
      role: 'readWrite',
      db: 'db_pga'
    }
  ]
});

print('✓ Usuário "user_pga" criado com sucesso');

// Trocar para o banco de dados da aplicação e criar índices (opcional)
db = db.getSiblingDB('db_pga');

print('✓ Banco de dados "db_pga" selecionado');
print('=== Initialization complete ===');
