import CopyrightSearch from '../../../database/models/copyrightSearch';
import { Op } from 'sequelize';
import { CopyrightSearchParams, CopyrightRegistration } from '../../../types/copyright';

class CopyrightService {
  
  /**
   * Get all copyright records with optional filtering.
   * @param filters Optional filters like author, title, or registration_number
   * @returns List of copyright search results
   */
  async getAllCopyrights(filters: { author?: string; title?: string; registration_number?: string }) {
    try {
      const whereClause = {};
      
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
      
      return copyrights;
    } catch (error) {
      console.error('Error fetching copyrights:', error);
      throw new Error('Could not fetch copyrights');
    }
  }

  /**
   * Search for copyrights based on given parameters.
   * @param params - Parameters for searching copyrights.
   * @returns A promise containing the response data.
   */
  async searchCopyright(params: CopyrightSearchParams) {
    try {
      const { query, page = 1, limit = 10 } = params;

      const copyrights = await CopyrightSearch.findAll({
        where: {
          title: { [Op.iLike]: `%${query}%` } // Assuming search is based on title
        },
        limit,
        offset: (page - 1) * limit,
      });

      return {
        success: true,
        data: copyrights,
      };
    } catch (error) {
      console.error('Error searching copyrights:', error);
      return {
        success: false,
        error: 'Failed to search copyrights',
      };
    }
  }

  /**
   * Get a single copyright record by ID
   * @param id The ID of the copyright record
   * @returns The copyright record if found, or null
   */
  async getCopyrightById(id: number) {
    try {
      const copyright = await CopyrightSearch.findByPk(id);
      return copyright;
    } catch (error) {
      console.error('Error fetching copyright by ID:', error);
      throw new Error('Could not fetch copyright by ID');
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

      // Update the copyright record with new data
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
