import path from 'path';
import { fileURLToPath } from 'url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { uploadthingStorage } from '@payloadcms/storage-uploadthing';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Brands } from './collections/Brands';
import { Categories } from './collections/Categories';
import { Clients } from './collections/Clients';
import { CommissionPayments } from './collections/CommissionPayments';
import { Invitations } from './collections/Invitations';
import { Media } from './collections/Media';
import { MobileSellerInventory } from './collections/MobileSellerInventory';
import { Notifications } from './collections/Notifications';
import { Presentations } from './collections/Presentations';
import { ProductCustomFields } from './collections/ProductCustomFields';
import { Products } from './collections/Products';
import { ProductVariants } from './collections/ProductVariants';
import { PushSubscriptions } from './collections/PushSubscriptions';
import { Qualities } from './collections/Qualities';
import { Sales } from './collections/Sales';
import { Settings } from './collections/Settings';
import { StockMovements } from './collections/StockMovements';
import { Users } from './collections/Users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Logo: '@/components/admin/logo',
      },
    },
  },
  collections: [
    Users,
    Invitations,
    Media,
    Brands,
    Categories,
    Qualities,
    Presentations,
    Products,
    ProductVariants,
    ProductCustomFields,
    Clients,
    Sales,
    CommissionPayments,
    Settings,
    StockMovements,
    MobileSellerInventory,
    Notifications,
    PushSubscriptions,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: true,
            }
          : false,
    },
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@Flowy.com',
    defaultFromName: 'Flowy',
    transportOptions: {
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    },
  }),
  sharp,
  plugins: [
    uploadthingStorage({
      collections: {
        media: {
          disablePayloadAccessControl: true,
        },
      },
      options: {
        token: process.env.UPLOADTHING_TOKEN,
        acl: 'public-read',
      },
    }),
  ],
});
