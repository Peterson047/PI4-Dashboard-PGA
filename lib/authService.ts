import { getDatabase } from './mongodb';
import { User, LoginCredentials, AuthResponse, Session } from './types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    
    // Buscar usuário pelo email
    const user = await usersCollection.findOne({ email: credentials.email });
    
    if (!user) {
      return {
        success: false,
        message: 'Email ou senha incorretos'
      };
    }
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Email ou senha incorretos'
      };
    }
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Remover senha do objeto de resposta
    const { password, ...userWithoutPassword } = user;
    
    return {
      success: true,
      user: userWithoutPassword as unknown as User,
      token
    };
  } catch (error) {
    console.error('Erro no login:', error);
    return {
      success: false,
      message: 'Erro interno do servidor'
    };
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
    
    if (!user) {
      return null;
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as unknown as User;
  } catch (error) {
    return null;
  }
}

export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<AuthResponse> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    
    // Verificar se o email já existe
    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      return {
        success: false,
        message: 'Email já cadastrado'
      };
    }
    
    // Criptografar senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    const { password, ...userWithoutPassword } = newUser;
    
    return {
      success: true,
      user: { ...userWithoutPassword, _id: result.insertedId.toString() } as User
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return {
      success: false,
      message: 'Erro interno do servidor'
    };
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return null;
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as unknown as User;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<AuthResponse> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return {
        success: false,
        message: 'Usuário não encontrado'
      };
    }
    
    const updatedUser = await getUserById(userId);
    
    return {
      success: true,
      user: updatedUser!
    };
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return {
      success: false,
      message: 'Erro interno do servidor'
    };
  }
} 