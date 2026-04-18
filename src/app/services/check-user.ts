'use server';

import { getPayloadClient } from '@/lib/payload';

export async function checkUserRole(email: string) {
  const payload = await getPayloadClient();

  try {
    const result = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      overrideAccess: false,
    });

    if (result.docs.length > 0) {
      const user = result.docs[0];
      return {
        success: true,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
          id: user.id,
          isActive: user.isActive,
        },
      };
    } else {
      return {
        success: false,
        message: 'Usuario no encontrado',
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error:', error);
    }
    return {
      success: false,
      message: 'Error al consultar el usuario',
    };
  }
}
