import { Octokit } from '@octokit/rest';
import { AsyncLock } from '../../utils/asyncLock';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { crConfig } from './crConfig';

export class GitHubUtility {
    private readonly github: Octokit;
    private readonly lock: AsyncLock;
    private readonly circuitBreaker: CircuitBreaker;

    constructor() {
        this.github = new Octokit({
            auth: crConfig.GITHUB.TOKEN,
            baseUrl: crConfig.GITHUB.API_URL,
            timeZone: crConfig.GITHUB.TIMEZONE,
            request: {
                timeout: crConfig.GITHUB.TIMEOUT
            }
        });
        
        this.lock = new AsyncLock();
        this.circuitBreaker = new CircuitBreaker('github-api');
    }

    async search(query: string): Promise<GitHubRepository[]> {
        return this.lock.acquire('github-api', async () => {
            return this.circuitBreaker.execute(() => 
                this.github.search.repos({...})
            );
        });
    }

    async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
        return this.lock.acquire('github-api', async () => {
            return this.circuitBreaker.execute(() => 
                this.github.repos.get({...})
            );
        });
    }
}