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

  public async validatePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.passwordHash);
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
        bcrypt.hash(value, 10).then(hash => {
          this.setDataValue('passwordHash', hash);
        });
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
