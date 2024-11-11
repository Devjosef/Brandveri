import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';

interface ApiLogAttributes {
  id: string;
  endpoint: string;
  request_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  status_code: number;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_body?: object;
  response_body?: object;
  duration?: number;
  readonly created_at: Date;
}

class ApiLog extends Model<ApiLogAttributes> implements ApiLogAttributes {
  public id!: string;
  public endpoint!: string;
  public request_method!: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  public status_code!: number;
  public user_id?: string;
  public ip_address?: string;
  public user_agent?: string;
  public request_body?: object;
  public response_body?: object;
  public duration?: number;
  public readonly created_at!: Date;

  public static associate(): void {
  ApiLog.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'SET NULL'
  });
}
}

ApiLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    request_method: {
      type: DataTypes.ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'),
      allowNull: false,
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    request_body: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    response_body: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    tableName: 'api_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['endpoint'] },
      { fields: ['request_method'] },
      { fields: ['status_code'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] },
      { using: 'gin', fields: ['request_body'] },
      { using: 'gin', fields: ['response_body'] }
    ]
  }
);

export default ApiLog;