import { DataTypes, Model, ValidationErrorItem } from 'sequelize';
import sequelize from '../config';
import bcrypt from 'bcrypt';
import { ValidationError } from 'sequelize';
import sessions from './sessions';
import ApiLog from './ApiLog';
import AuditLog from './AuditLog';
import Copyright from './copyrightSearch';
import Notification from './Notification';
import Payment from './Payment';
import Recommendation from './recommendation';
import Subscription from './Subscription';
import TrademarkSearch from './trademarkSearch';
import UserPreference from './UserPreference';

const SALT_ROUNDS = 12;

interface PasswordValidation {
  isValid: boolean;
  message?: string;
}

class User extends Model {
  public id!: string;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public status!: 'active' | 'inactive' | 'suspended';
  public last_login_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  
  public static validatePasswordComplexity(password: string): PasswordValidation {
    if (password.length < 12) {
      return { isValid: false, message: 'Password must be at least 12 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true };
  }

  public async validatePassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  }

  public static associate(): void {
    User.hasMany(Payment, {
      foreignKey: 'user_id',
      as: 'payments',
      onDelete: 'CASCADE'
    });

    User.hasMany(TrademarkSearch, {
      foreignKey: 'user_id',
      as: 'trademarkSearches',
      onDelete: 'CASCADE'
    });

    User.hasMany(Subscription, {
      foreignKey: 'user_id',
      as: 'subscriptions',
      onDelete: 'CASCADE'
    });

    User.hasMany(UserPreference, {
      foreignKey: 'user_id',
      as: 'preferences',
      onDelete: 'CASCADE'
    });

    User.hasMany(Notification, {
      foreignKey: 'user_id',
      as: 'notifications',
      onDelete: 'CASCADE'
    });

    User.hasMany(AuditLog, {
      foreignKey: 'user_id',
      as: 'auditLogs',
      onDelete: 'CASCADE'
    });

    User.hasMany(ApiLog, {
      foreignKey: 'user_id',
      as: 'apiLogs',
      onDelete: 'SET NULL'
    });

    User.hasMany(sessions, {
      foreignKey: 'user_id',
      as: 'sessions',
      onDelete: 'CASCADE'
    });

    User.hasMany(Copyright, {
      foreignKey: 'user_id',
      as: 'copyrights',
      onDelete: 'CASCADE'
    });

    User.hasMany(Recommendation, {
      foreignKey: 'user_id',
      as: 'recommendations',
      onDelete: 'CASCADE'
    });
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      async set(value: string) {
        const validation = User.validatePasswordComplexity(value);
        if (!validation.isValid) {
          throw new ValidationError('Password validation failed', [
            new ValidationErrorItem(
              validation.message || 'Invalid password',    // message
              'validation error',                         // type
              'password_hash',                           // path
              value,                                     // value
              this,                                      // instance
              'password_validation',                     // validatorKey
              'validatePasswordComplexity',              // fnName
              ['min', 12, 'special', true, 'numbers', true]  // fnArgs
            )
          ]);
        }

        
        (async () => {
          try {
            const hash = await bcrypt.hash(value, SALT_ROUNDS);
            this.setDataValue('password_hash', hash);
          } catch (error) {
            throw new ValidationError('Password hashing failed', [
              new ValidationErrorItem(
                'Error processing password',                // message
                'validation error',                        // type
                'password_hash',                          // path
                value,                                    // value
                this,                                     // instance
                'password_hashing',                       // validatorKey
                'bcrypt_hash',                           // fnName
                [SALT_ROUNDS]                            // fnArgs
              )
            ]);
          }
        })();
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    last_login_at: {
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
    tableName: 'users',
    modelName: 'User', // Model name arg
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;