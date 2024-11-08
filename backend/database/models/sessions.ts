import { DataTypes, Model } from 'sequelize';
import sequelize from '../config';
import User from './User';
import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const ROTATION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface SessionAttributes {
  id: string;
  user_id: string;
  token: string;
  token_hash: string;
  previous_token_hash?: string;
  rotation_due_at: Date;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  last_activity_at?: Date;
  readonly created_at: Date;
  readonly updated_at: Date;
}

class Session extends Model<SessionAttributes> implements SessionAttributes {
  public id!: string;
  public user_id!: string;
  public token!: string;
  public token_hash!: string;
  public previous_token_hash?: string;
  public rotation_due_at!: Date;
  public ip_address?: string;
  public user_agent?: string;
  public expires_at!: Date;
  public last_activity_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  private static async generateToken(): Promise<string> {
    const buffer = await randomBytes(32);
    return buffer.toString('base64url');
  }

  public static async hashToken(token: string): Promise<string> {
    const buffer = await promisify(crypto.scrypt)(token, process.env.TOKEN_SALT || 'default-salt', 64) as Buffer;
    return buffer.toString('hex');
  }

  public async rotateToken(): Promise<string> {
    const newToken = await Session.generateToken();
    const newHash = await Session.hashToken(newToken);
    
    this.previous_token_hash = this.token_hash;
    this.token_hash = newHash;
    this.token = newToken;
    this.rotation_due_at = new Date(Date.now() + ROTATION_WINDOW);
    
    await this.save();
    return newToken;
  }

  public async validateToken(token: string): Promise<boolean> {
    const hash = await Session.hashToken(token);
    return hash === this.token_hash || hash === this.previous_token_hash;
  }
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
      async set(value: string) {
        const hash = await Session.hashToken(value);
        this.setDataValue('token_hash', hash);
        this.setDataValue('token', value);
      },
    },
    token_hash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    previous_token_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    rotation_due_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + ROTATION_WINDOW),
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
      { fields: ['token_hash'] },
      { fields: ['previous_token_hash'] },
      { fields: ['expires_at'] },
      { fields: ['rotation_due_at'] },
      { fields: ['last_activity_at'] }
    ]
  }
);

export default Session;