const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/db_pga';

async function initDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('db_pga');
    const usersCollection = db.collection('users');
    
    // Verificar se já existe um usuário
    const existingUser = await usersCollection.findOne({ email: 'juliana.mendes@fatec.sp.gov.br' });
    
    if (existingUser) {
      console.log('Usuário já existe no banco de dados');
      return;
    }
    
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Criar usuário padrão
    const defaultUser = {
      email: 'juliana.mendes@fatec.sp.gov.br',
      name: 'Prof. Juliana Mendes',
      role: 'professor',
      institution: 'fatec-votorantim',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(defaultUser);
    console.log('Usuário criado com sucesso:', result.insertedId);
    console.log('Email: juliana.mendes@fatec.sp.gov.br');
    console.log('Senha: 123456');
    
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
  } finally {
    await client.close();
  }
}

initDatabase(); 