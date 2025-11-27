import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/authService';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Helper para verificar se o usuário é um admin
async function isAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;

  const user = await verifyToken(token);
  return user && user.role === 'admin';
}

/**
 * GET /api/users
 * Retorna uma lista de todos os usuários. Acesso restrito a administradores.
 */
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ success: false, message: 'Acesso não autorizado' }, { status: 403 });
  }

  try {
    const db = await getDatabase();
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Cria um novo usuário. Acesso restrito a administradores.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ success: false, message: 'Acesso não autorizado' }, { status: 403 });
  }

  try {
    const { email, name, password, role, accessLevel, allowedInstitutions } = await request.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json({ success: false, message: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Um usuário com este email já existe' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      name,
      password: hashedPassword,
      role,
      accessLevel: accessLevel || 'all',
      allowedInstitutions: allowedInstitutions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({ success: true, message: 'Usuário criado com sucesso', userId: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * PUT /api/users
 * Atualiza um usuário existente. Acesso restrito a administradores.
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ success: false, message: 'Acesso não autorizado' }, { status: 403 });
  }

  try {
    const { _id, name, email, role, password, accessLevel, allowedInstitutions } = await request.json();

    if (!_id) {
      return NextResponse.json({ success: false, message: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const updateData: any = {
      name,
      email,
      role,
      accessLevel: accessLevel || 'all',
      allowedInstitutions: allowedInstitutions || [],
      updatedAt: new Date(),
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, message: 'Usuário atualizado com sucesso' });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 });
  }
}
