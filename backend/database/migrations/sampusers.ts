import { QueryInterface, DataTypes, Transaction } from 'sequelize';

export const up = async (queryInterface: QueryInterface, _: any, transaction: Transaction) => {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // ... other fields
  }, { transaction });

  await queryInterface.addIndex('users', ['email'], {
    unique: true,
    transaction,
  });
};

export const down = async (queryInterface: QueryInterface, _: any, transaction: Transaction) => {
  await queryInterface.dropTable('users', { transaction });
};