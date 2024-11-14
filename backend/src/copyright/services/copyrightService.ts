import { AuthError } from '../../../auth/utils/AuthError';
import { Counter, Histogram } from 'prom-client';
import CopyrightSearch from '../../../database/models/copyrightSearch';
import { Op } from 'sequelize';
import { CopyrightSearchParams, CopyrightRegistration } from '../../../types/copyright';
import { getCache, setCache } from '../../utils/cache'; // Import cache functions

// Add metrics for copyright operations
const copyrightMetrics = {
  operations: new Counter({
    name: 'copyright_operations_total',
    help: 'Total number of copyright operations',
    labelNames: ['operation', 'status']
  }),
  duration: new Histogram({
    name: 'copyright_operation_duration_seconds',
    help: 'Duration of copyright operations',
    labelNames: ['operation']
  })
};

class CopyrightService {
  
  /**
   * Get all copyright records with optional filtering.
   * @param filters Optional filters like author, title, or registration_number
   * @returns List of copyright search results
   */
  async getAllCopyrights(filters: { author?: string; title?: string; registration_number?: string }) {
    const end = copyrightMetrics.duration.startTimer({ operation: 'getAllCopyrights' });
    try {
      copyrightMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'attempt' });
      const whereClause: Record<string, any> = {}; // Define the type of whereClause
      
      // Apply filters to the query if provided
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
      
      copyrightMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'success' });
      return copyrights;
    } catch (error) {
      copyrightMetrics.operations.inc({ operation: 'getAllCopyrights', status: 'error' });
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
    const end = copyrightMetrics.duration.startTimer({ operation: 'searchCopyright' });
    try {
      copyrightMetrics.operations.inc({ operation: 'searchCopyright', status: 'attempt' });
      const { query, page = 1, limit = 10 } = params;
      const cacheKey = `copyright:search:${query}:${page}:${limit}`;

      // Check cache first
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

      // Set cache with fetched data
      await setCache(cacheKey, copyrights);

      copyrightMetrics.operations.inc({ operation: 'searchCopyright', status: 'success' });
      return {
        success: true,
        data: copyrights,
      };
    } catch (error) {
      copyrightMetrics.operations.inc({ operation: 'searchCopyright', status: 'error' });
      console.error('Error searching copyrights:', error);
      if (error instanceof AuthError) throw error;
      throw new AuthError(500, 'Failed to search copyrights', 'DATABASE_ERROR');
    } finally {
      end();
    }
  }

  /**
   * Get a single copyright record by ID
   * @param id The ID of the copyright record
   * @returns The copyright record if found, or null
   */
  async getCopyrightById(id: number): Promise<ApiResponse<Copyright>> {
    const end = copyrightMetrics.duration.startTimer({ operation: 'getCopyrightById' });
    try {
      copyrightMetrics.operations.inc({ operation: 'getCopyrightById', status: 'attempt' });
      const copyright = await CopyrightSearch.findByPk(id);
      if (!copyright) {
        throw new AuthError(404, 'Copyright not found', 'NOT_FOUND');
      }
      copyrightMetrics.operations.inc({ operation: 'getCopyrightById', status: 'success' });
      return { success: true, data: copyright };
    } catch (error) {
      copyrightMetrics.operations.inc({ operation: 'getCopyrightById', status: 'error' });
      if (error instanceof AuthError) throw error;
      throw new AuthError(500, 'Could not fetch copyright', 'DATABASE_ERROR');
    } finally {
      end();
    }
  }

  /**
   * Create a new copyright record
   * @param data The data for the new copyright record
   * @returns The created copyright record
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
   * Update an existing copyright record
   * @param id The ID of the copyright record
   * @param data The updated data for the copyright record
   * @returns The updated copyright record if found, or null
   */
  async updateCopyright(id: number, data: Partial<{
    title: string;
    author: string;
    registration_number: string;
    registration_date: Date;
    status: string;
    country: string;
  }>) {
    try {
      const copyright = await CopyrightSearch.findByPk(id);
      if (!copyright) {
        throw new Error('Copyright not found');
      }

      await copyright.update(data);
      
      return copyright;
    } catch (error) {
      console.error('Error updating copyright:', error);
      throw new Error('Could not update copyright');
    }
  }

  /**
   * Delete a copyright record by ID
   * @param id The ID of the copyright record
   * @returns A boolean indicating success or failure
   */
  async deleteCopyright(id: number) {
    try {
      const result = await CopyrightSearch.destroy({
        where: { id },
      });

      return result > 0; // true if deletion was successful, false otherwise
    } catch (error) {
      console.error('Error deleting copyright:', error);
      throw new Error('Could not delete copyright');
    }
  }
}

export default new CopyrightService();
