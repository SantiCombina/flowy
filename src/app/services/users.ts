'use server';

import { getPayloadClient } from '@/lib/payload';
import type { User } from '@/payload-types';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'owner' | 'seller';
  owner?: number;
}

interface CreateUserResult {
  success: boolean;
  user?: { id: number; email: string };
  error?: string;
}

export async function createUser(data: CreateUserData): Promise<CreateUserResult> {
  const payload = await getPayloadClient();

  const { docs: existingUsers } = await payload.find({
    collection: 'users',
    where: { email: { equals: data.email } },
    limit: 1,
    overrideAccess: true,
  });

  const existingUser = existingUsers[0];

  if (existingUser) {
    if (!existingUser.isDeleted) {
      return { success: false, error: 'El email ya está registrado' };
    }

    const user = await payload.update({
      collection: 'users',
      id: existingUser.id,
      data: {
        name: data.name,
        password: data.password,
        role: data.role,
        isActive: true,
        isDeleted: false,
        ...(data.owner ? { owner: data.owner } : {}),
      },
      overrideAccess: true,
    });

    return { success: true, user: { id: user.id, email: user.email } };
  }

  try {
    const user = await payload.create({
      collection: 'users',
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        ...(data.owner ? { owner: data.owner } : {}),
      },
    });

    return {
      success: true,
      user: { id: user.id, email: user.email },
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Error al crear el usuario' };
  }
}

export async function getUserByEmail(email: string) {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  });

  return docs[0] ?? null;
}

interface LoginUserData {
  email: string;
  password: string;
}

interface LoginUserResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function loginUser(data: LoginUserData): Promise<LoginUserResult> {
  const payload = await getPayloadClient();

  const user = await getUserByEmail(data.email);

  if (user && user.isDeleted === true) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  if (user && user.isActive === false) {
    return { success: false, error: 'Tu cuenta está desactivada. Contactá a tu administrador.' };
  }

  try {
    const result = await payload.login({
      collection: 'users',
      data: { email: data.email, password: data.password },
    });

    if (!result.token) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    return { success: true, token: result.token };
  } catch {
    return { success: false, error: 'Credenciales inválidas' };
  }
}

export async function getSellers(ownerId: number): Promise<User[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'users',
    where: {
      and: [{ owner: { equals: ownerId } }, { role: { equals: 'seller' } }, { isDeleted: { not_equals: true } }],
    },
    sort: '-createdAt',
    limit: 1000,
    overrideAccess: true,
  });

  return result.docs as User[];
}

interface UpdateSellerData {
  name?: string;
  email?: string;
  isActive?: boolean;
  phone?: string;
  dni?: string;
  cuitCuil?: string;
  cbu?: string;
}

export async function updateSeller(sellerId: number, data: UpdateSellerData): Promise<User> {
  const payload = await getPayloadClient();

  const user = await payload.update({
    collection: 'users',
    id: sellerId,
    data,
    overrideAccess: true,
  });

  return user as User;
}

export async function deleteSeller(sellerId: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.update({
    collection: 'users',
    id: sellerId,
    data: { isDeleted: true, isActive: false },
    overrideAccess: true,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const payload = await getPayloadClient();

  await payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: false,
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const payload = await getPayloadClient();

  await payload.resetPassword({
    collection: 'users',
    data: { token, password },
    overrideAccess: true,
  });
}

export async function changePassword(userId: number, newPassword: string): Promise<void> {
  const payload = await getPayloadClient();

  await payload.update({
    collection: 'users',
    id: userId,
    data: { password: newPassword },
    overrideAccess: true,
  });
}
