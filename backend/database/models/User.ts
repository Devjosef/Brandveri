import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import bcrypt from 'bcrypt';
import Payment from './Payment';
import Subscription from './Subscription';

class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public readonly createdAt!: Date;

  public validatePassword(password: string): boolean {
    return bcrypt.compareSync(password, this.passwordHash);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      set(value: string) {
        this.setDataValue('passwordHash', bcrypt.hashSync(value, 10));
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);

// Define associations
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });

Payment.belongsTo(User, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

export default User;
