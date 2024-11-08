import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import { AuditLogMetadata } from '../../types/metadata';

interface AuditLogAttributes {
  id: string;
  user_id: string;
  action: 'login' | 'logout' | 'password_change' | 'profile_update' | 
          'settings_change' | 'data_export' | 'data_import' | 'api_key_generate' |
          'subscription_change' | 'billing_update' | 'system_setting_change';
  details?: AuditLogMetadata;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  readonly created_at: Date;
}

class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  public id!: string;
  public user_id!: string;
  public action!: AuditLogAttributes['action'];
  public details?: AuditLogMetadata;
  public ip_address?: string;
  public user_agent?: string;
  public resource_type?: string;
  public resource_id?: string;
  public readonly created_at!: Date;
}

AuditLog.init(
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
    action: {
      type: DataTypes.ENUM(
        'login', 'logout', 'password_change', 'profile_update',
        'settings_change', 'data_export', 'data_import', 'api_key_generate',
        'subscription_change', 'billing_update', 'system_setting_change'
      ),
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
    resource_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    resource_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    tableName: 'audit_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['resource_type', 'resource_id'] },
      { using: 'gin', fields: ['details'] }
    ]
  }
);

export default AuditLog;