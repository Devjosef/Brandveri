import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import bcrypt from 'bcrypt';

class Session extends Model {
  public id!: number;
  public userId!: number;
  public token!: string;
  public expiresAt!: Date;
}

Session.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      set(value: string) {
        this.setDataValue('token', bcrypt.hashSync(value, 10));
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'sessions',
  }
);

export default Session;