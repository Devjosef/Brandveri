import TrademarkSearch  from '../../../database/models/trademarkSearch'; 
import { ApiResponse, TrademarkSearchParams, TrademarkRegistration, Trademark } from '../../../types/trademark';
import { Op, ValidationError } from 'sequelize'; 

class TrademarkService {
    /**
     * Search for trademarks based on given parameters.
     * @param params - Parameters for searching trademarks.
     * @returns A promise containing the response data.
     */
    async searchTrademark(params: TrademarkSearchParams): Promise<ApiResponse<TrademarkSearch[]>> {
        try {
            const { query, page = 1, limit = 10 } = params;

            // Perform a search on the Trademark model
            const trademarks = await TrademarkSearch.findAll({
                where: { name: { [Op.iLike]: `%${query}%` } }, // Case-insensitive search
                limit,
                offset: (page - 1) * limit,
            });

            return {
                success: true,
                data: trademarks,
            };
        } catch (error) {
            console.error('Error searching trademarks:', error);
            return {
                success: false,
                error: 'Failed to search trademarks',
            };
        }
    }

    /**
     * Register a new trademark in the system.
     * @param data - The data for the trademark registration.
     * @returns A promise containing the response data.
     */
    async registerTrademark(data: TrademarkRegistration): Promise<ApiResponse<TrademarkSearch>> {
        try {
            // Perform validation
            this.validateTrademarkData(data);

            // Create a new Trademark record
            const trademark = await TrademarkSearch.create(data as any);

            return {
                success: true,
                data: trademark,
            };
        } catch (error) {
            console.error('Error registering trademark:', error);

            // Handle specific Sequelize validation errors
            if (error instanceof ValidationError) {
                return {
                    success: false,
                    error: error.errors.map(err => err.message).join(', '),
                };
            }

            return {
                success: false,
                error: 'Failed to register trademark',
            };
        }
    }

    /**
     * Validate trademark registration data.
     * @param data - The trademark data to validate.
     * @throws Will throw an error if validation fails.
     */
    private validateTrademarkData(data: TrademarkRegistration): void {
        const { name, owner, registrationDate } = data;

        if (!name || name.length < 3) {
            throw new Error('Trademark name must be at least 3 characters long');
        }

        if (!owner) {
            throw new Error('Owner is required');
        }

        if (!(registrationDate instanceof Date)) {
            throw new Error('Invalid registration date');
        }
    }
}

export const trademarkService = new TrademarkService();
