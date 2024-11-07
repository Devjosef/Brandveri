import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import bcrypt from 'bcrypt';

class Session extends Model {
  public id!: string;
  public user_id!: string;
  public token!: string;
  public ip_address?: string;
  public user_agent?: string;
  public expires_at!: Date;
  public last_activity_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(value: string) {
        this.setDataValue('token', bcrypt.hashSync(value, 10));
      },
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token'] },
      { fields: ['expires_at'] },
      { fields: ['last_activity_at'] }
    ]
  }
);

export default Session;