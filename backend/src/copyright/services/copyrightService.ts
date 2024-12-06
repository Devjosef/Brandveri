import { AuthError } from '../../../auth/utils/AuthError';
import { Counter, Histogram } from 'prom-client';
import CopyrightSearch from '../../../database/models/copyrightSearch';
import { Op, Transaction } from 'sequelize';
import { 
    CopyrightSearchParams, 
    CopyrightRegistration, 
    Copyright, 
    ApiResponse 
} from '../../../types/copyright';
import { copyrightCache } from '../../utils/cache';
import { loggers } from '../../../observability/contextLoggers';
import { validateSearchParams, validateCopyrightRegistration } from '../utils/copyrightValidator';

const logger = loggers.copyright;

const serviceMetrics = {
    operations: new Counter({
        name: 'copyright_service_operations_total',
        help: 'Total number of copyright service operations',
        labelNames: ['operation', 'status', 'source']
    }),
    duration: new Histogram({
        name: 'copyright_service_duration_seconds',
        help: 'Duration of copyright service operations',
        labelNames: ['operation', 'source'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1]
    })
};

class CopyrightService {
    private generateCacheKey(operation: string, params: Record<string, any>): string {
        return `copyright:${operation}:${Object.entries(params)
            .sort()
            .map(([k, v]) => `${k}:${v}`)
            .join(':')}`;
    }

    /**
     * Bulk operations for large datasets
     * Customer requirement for importing existing copyrights
     */
    async batchRegisterCopyrights(
        items: CopyrightRegistration[], 
        batchSize = 100
    ): Promise<ApiResponse<Copyright[]>> {
        const timer = serviceMetrics.duration.startTimer();
        
        try {
            // Validating all items first to prevent partial imports.
            const validatedItems = await Promise.all(
                items.map(item => validateCopyrightRegistration(item))
            );

            // Process in chunks to prevent memory issues.
            const results: Copyright[] = [];
            for (let i = 0; i < validatedItems.length; i += batchSize) {
                const batch = validatedItems.slice(i, i + batchSize);
                const batchResults = await CopyrightSearch.bulkCreate(batch, {
                    returning: true,
                    validate: true
                });
                results.push(...batchResults);
            }

            // Invalidate relevant caches
            await copyrightCache.invalidate(this.generateCacheKey('getAll', {}));

            return { success: true, data: results };
        } catch (error) {
            logger.error({ error, itemCount: items.length }, 'Batch registration failed');
            throw new AuthError(500, 'Failed to register copyrights in batch', 'BATCH_ERROR');
        } finally {
            timer({ operation: 'batchRegisterCopyrights' });
        }
    }

    /**
     * Data consistency during updates.
     * Prevent race conditions in concurrent updates.
     */
    async updateCopyright(
        id: number, 
        data: Partial<CopyrightRegistration>
    ): Promise<ApiResponse<Copyright>> {
        const timer = serviceMetrics.duration.startTimer();
        
        try {
            // Transaction to ensure consistency.
            const result = await CopyrightSearch.sequelize!.transaction(async (t: Transaction) => {
                const copyright = await CopyrightSearch.findByPk(id, {
                    transaction: t,
                    lock: true // Row-level locking.
                });

                if (!copyright) {
                    throw new AuthError(404, 'Copyright not found', 'NOT_FOUND');
                }

                const validatedData = await validateCopyrightRegistration({
                    ...copyright.toJSON(),
                    ...data
                });

                const updated = await copyright.update(validatedData, { transaction: t });
                return updated;
            });

            // Cache invalidation after successful transaction.
            await copyrightCache.invalidate(this.generateCacheKey('getAll', {}));
            await copyrightCache.invalidate(this.generateCacheKey('get', { id }));

            return { success: true, data: result };
        } catch (error) {
            logger.error({ error, id, data }, 'Update failed');
            if (error instanceof AuthError) throw error;
            throw new AuthError(500, 'Failed to update copyright', 'UPDATE_ERROR');
        } finally {
            timer({ operation: 'updateCopyright' });
        }
    }

    /**
     * Get all copyright records with optional filtering.
     * @param filters Optional filters like author, title, or registration_number.
     * @returns List of copyright search results.
     */
    async getAllCopyrights(filters: { author?: string; title?: string; registration_number?: string }) {
        const end = serviceMetrics.duration.startTimer({ operation: 'getAllCopyrights' });
        try {
            serviceMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'attempt' });
            const whereClause: Record<string, any> = {}; // Defines the type of whereClause to use.
            
            // Apply filters to the query if provided.
            if (filters.author) {
                whereClause['author'] = { [Op.iLike]: `%${filters.author}%` };
            }
            if (filters.title) {
                whereClause['title'] = { [Op.iLike]: `%${filters.title}%` };
            }
            if (filters.registration_number) {
                whereClause['registration_number'] = { [Op.eq]: filters.registration_number };
            }
            
            const copyrights = await CopyrightSearch.findAll({
                where: whereClause,
            });
            
            serviceMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'success' });
            return copyrights;
        } catch (error) {
            serviceMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'error' });
            console.error('Error fetching copyrights:', error);
            throw new AuthError(500, 'Could not fetch copyrights', 'DATABASE_ERROR');
        } finally {
            end();
        }
    }

    /**
     * Search for copyrights based on given parameters.
     * @param params - Parameters for searching copyrights.
     * @returns A promise containing the response data.
     */
    async searchCopyright(params: CopyrightSearchParams) {
        const end = serviceMetrics.duration.startTimer({ operation: 'searchCopyright' });
        try {
            serviceMetrics.operations.inc({ operation: 'searchCopyright', status: 'attempt' });
            const { query, page = 1, limit = 10 } = params;
            const cacheKey = `copyright:search:${query}:${page}:${limit}`;

            // Check the cache first.
            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                return {
                    success: true,
                    data: cachedData,
                };
            }

            const copyrights = await CopyrightSearch.findAll({
                where: {
                    title: { [Op.iLike]: `%${query}%` }
                },
                limit,
                offset: (page - 1) * limit,
            });

            // Set cache with the fetched data.
            await setCache(cacheKey, copyrights);

            serviceMetrics.operations.inc({ operation: 'searchCopyright', status: 'success' });
            return {
                success: true,
                data: copyrights,
            };
        } catch (error) {
            serviceMetrics.operations.inc({ operation: 'searchCopyright', status: 'error' });
            console.error('Error searching copyrights:', error);
            if (error instanceof AuthError) throw error;
            throw new AuthError(500, 'Failed to search copyrights', 'DATABASE_ERROR');
        } finally {
            end();
        }
    }

    /**
     * Get a single copyright record by ID.
     * @param id The ID of the copyright record.
     * @returns The copyright record if found, or null.
     */
    async getCopyrightById(id: number): Promise<ApiResponse<Copyright>> {
        const end = serviceMetrics.duration.startTimer({ operation: 'getCopyrightById' });
        try {
            serviceMetrics.operations.inc({ operation: 'getCopyrightById', status: 'attempt' });
            const copyright = await CopyrightSearch.findByPk(id);
            if (!copyright) {
                throw new AuthError(404, 'Copyright not found', 'NOT_FOUND');
            }
            serviceMetrics.operations.inc({ operation: 'getCopyrightById', status: 'success' });
            return { success: true, data: copyright };
        } catch (error) {
            serviceMetrics.operations.inc({ operation: 'getCopyrightById', status: 'error' });
            if (error instanceof AuthError) throw error;
            throw new AuthError(500, 'Could not fetch copyright', 'DATABASE_ERROR');
        } finally {
            end();
        }
    }

    /**
     * Create a new copyright record.
     * @param data The data for the new copyright record.
     * @returns The created copyright record.
     */
    async createCopyright(data: {
        title: string;
        author: string;
        registration_number: string;
        registration_date: Date;
        status: string;
        country: string;
    }) {
        try {
            const newCopyright = await CopyrightSearch.create({
                title: data.title,
                author: data.author,
                registration_number: data.registration_number,
                registration_date: data.registration_date,
                status: data.status,
                country: data.country,
            });

            return newCopyright;
        } catch (error) {
            console.error('Error creating copyright:', error);
            throw new Error('Could not create copyright');
        }
    }

    /**
     * Register a new copyright in the system.
     * @param data - The data for the copyright registration.
     * @returns A promise containing the response data.
     */
    async registerCopyright(data: CopyrightRegistration) {
        try {
            const newCopyright = await CopyrightSearch.create({
                title: data.title,
                author: data.author,
                registration_number: data.registration_number,
                registration_date: data.registration_date,
                status: data.status ?? '',
                country: data.country ?? '',
            });

            return {
                success: true,
                data: newCopyright,
            };
        } catch (error) {
            console.error('Error registering copyright:', error);
            return {
                success: false,
                error: 'Failed to register copyright',
            };
        }
    }

    /**
     * Delete a copyright record by ID.
     * @param id The ID of the copyright record.
     * @returns A boolean indicating success or failure.
     */
    async deleteCopyright(id: number) {
        try {
            const result = await CopyrightSearch.destroy({
                where: { id },
            });

            return result > 0; // true if deletion was successful, false otherwise.
        } catch (error) {
            console.error('Error deleting copyright:', error);
            throw new Error('Could not delete copyright');
        }
    }
}

export const copyrightService = new CopyrightService();
