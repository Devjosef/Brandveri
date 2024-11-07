import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import Copyright from './copyrightSearch';
import User from './User';

interface CopyrightLogAttributes {
  id: string;
  copyright_id: string;
  user_id: string;
  action: 'create' | 'view' | 'update' | 'delete' | 'register' | 'abandon';
  details?: object;
  ip_address?: string;
  user_agent?: string;
  readonly created_at: Date;
}

class CopyrightLog extends Model<CopyrightLogAttributes> implements CopyrightLogAttributes {
  public id!: string;
  public copyright_id!: string;
  public user_id!: string;
  public action!: 'create' | 'view' | 'update' | 'delete' | 'register' | 'abandon';
  public details?: object;
  public ip_address?: string;
  public user_agent?: string;
  public readonly created_at!: Date;
}

CopyrightLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    copyright_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Copyright,
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    action: {
      type: DataTypes.ENUM('create', 'view', 'update', 'delete', 'register', 'abandon'),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    tableName: 'copyright_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['copyright_id'] },
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['details'] }
    ]
  }
);

export default CopyrightLog;