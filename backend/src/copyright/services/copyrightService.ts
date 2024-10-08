import { CopyrightRepository } from './copyrightRepository'; // Repository for database operations
import { Copyright } from './copyrightModel'; // Copyright model definition

class CopyrightService {
    private copyrightRepository: CopyrightRepository;

    constructor(copyrightRepository: CopyrightRepository) {
        this.copyrightRepository = copyrightRepository;
    }

    async registerCopyright(data: Copyright): Promise<Copyright> {
        this.validateCopyrightData(data);
        return await this.copyrightRepository.create(data);
    }

    async getCopyrightDetails(copyrightId: string): Promise<Copyright> {
        const copyright = await this.copyrightRepository.findById(copyrightId);
        if (!copyright) throw new Error("Copyright not found.");
        return copyright;
    }

    async updateCopyright(copyrightId: string, data: Partial<Copyright>): Promise<Copyright> {
        const copyright = await this.getCopyrightDetails(copyrightId);
        const updatedCopyright = { ...copyright, ...data };
        return await this.copyrightRepository.update(copyrightId, updatedCopyright);
    }

    async deleteCopyright(copyrightId: string): Promise<void> {
        const success = await this.copyrightRepository.delete(copyrightId);
        if (!success) throw new Error("Failed to delete copyright.");
    }

    async listAllCopyrights(userId: string): Promise<Copyright[]> {
        return await this.copyrightRepository.findByUserId(userId);
    }

    private validateCopyrightData(data: Copyright): void {
        if (!data.title || typeof data.title !== 'string') {
            throw new Error("Title is required and must be a string.");
        }
        if (!data.owner || typeof data.owner !== 'string') {
            throw new Error("Owner is required and must be a string.");
        }
        if (data.creationDate && !(data.creationDate instanceof Date)) {
            throw new Error("Creation date must be a valid date.");
        }
        // Add more validation rules as needed
    }
}

// Example of dependency injection
const copyrightRepository = new CopyrightRepository();
export const copyrightService = new CopyrightService(copyrightRepository);