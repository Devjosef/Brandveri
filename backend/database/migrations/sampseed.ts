import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export const up = async (queryInterface: QueryInterface) => {
  const adminId = uuidv4();
  await queryInterface.bulkInsert('users', [{
    id: adminId,
    email: 'admin@brandveri.com',
    password: await bcrypt.hash('admin123', 12),
    role: 'admin',
    created_at: new Date(),
    updated_at: new Date()
  }]);
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.bulkDelete('users', { email: 'admin@brandveri.com' });
};