const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/db_pga';

async function listUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('db_pga');
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
    
    console.log(`\n📋 Total de usuários: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('Nenhum usuário encontrado no banco de dados.');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. 👤 ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🏢 Role: ${user.role}`);
      console.log(`   🏛️  Instituição: ${user.institution}`);
      console.log(`   📅 Criado em: ${user.createdAt.toLocaleString('pt-BR')}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
  } finally {
    await client.close();
  }
}

listUsers(); 