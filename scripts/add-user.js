const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/db_pga';

async function addUser(email, name, role, institution, password) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const db = client.db('db_pga');
    const usersCollection = db.collection('users');
    
    // Verificar se já existe um usuário com este email
    const existingUser = await usersCollection.findOne({ email });
    
    if (existingUser) {
      console.log(`Usuário com email ${email} já existe no banco de dados`);
      return;
    }
    
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const newUser = {
      email,
      name,
      role,
      institution,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    console.log('Usuário criado com sucesso:', result.insertedId);
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log(`Nome: ${name}`);
    console.log(`Role: ${role}`);
    console.log(`Instituição: ${institution}`);
    
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
  } finally {
    await client.close();
  }
}

// Exemplo de uso
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 5) {
    console.log('Uso: node add-user.js <email> <nome> <role> <instituicao> <senha>');
    console.log('Exemplo: node add-user.js "admin@fatec.sp.gov.br" "Administrador" "admin" "fatec-votorantim" "123456"');
    process.exit(1);
  }
  
  const [email, name, role, institution, password] = args;
  
  addUser(email, name, role, institution, password);
}

module.exports = { addUser }; 