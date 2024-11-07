import { DataTypes, Model, UnknownConstraintError, ValidationErrorItem } from 'sequelize';
import sequelize from '../config';
import bcrypt from 'bcrypt';
import { ValidationError } from 'sequelize';

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

  
  protected static validatePasswordComplexity(password: string): PasswordValidation {
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
      set(value: string) {
        const validation = User.validatePasswordComplexity(value);
        if (!validation.isValid) {
          throw new ValidationError(validation.message || 'Invalid password', [
            new ValidationErrorItem(
              validation.message || 'Invalid password',
              'validation error',
              'password_hash',
              value,
              UnknownConstraintError,
              'password_complexity',
              'validate',
              null
            )
          ]);
        }

        // Use async/await in a proper way for the setter
        (async () => {
          try {
            const hash = await bcrypt.hash(value, SALT_ROUNDS);
            this.setDataValue('password_hash', hash);
          } catch (error) {
            console.error('Password hashing error:', error);
            throw new ValidationError('Error processing password', [
              new ValidationErrorItem(
                'Error processing password',
                'Validation error',
                'password_hash',
                value,
                null,
                'password_hashing',
                'validate',
                null
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
    modelName: 'User', // model name arg
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;