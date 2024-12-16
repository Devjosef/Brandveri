import { Octokit } from '@octokit/rest';
import { AsyncLock } from '../../utils/asyncLock';
import { CircuitBreaker } from '../../utils/circuitBreaker';
import { crConfig } from './crConfig';
import { GitHubRepository } from '../../../types/copyright';
import { CopyrightError, CopyrightErrorCode } from './copyrightError';

export class GitHubUtility {
    private readonly github: Octokit;
    private readonly lock: AsyncLock;
    private readonly circuitBreaker: CircuitBreaker;

    constructor() {
        this.github = new Octokit({
            auth: crConfig.GITHUB.TOKEN,
            baseUrl: crConfig.GITHUB.BASE_URL,
            request: {
                timeout: crConfig.GITHUB.TIMEOUT
            }
        });
        
        this.lock = new AsyncLock();
        this.circuitBreaker = new CircuitBreaker('github-api', {
            failureThreshold: crConfig.GITHUB.RETRY_ATTEMPTS,
            resetTimeout: crConfig.GITHUB.RETRY_DELAY
        });
    }

    async search(query: string): Promise<GitHubRepository[]> {
        try {
            const response = await this.lock.acquire('github-search', () => 
                this.circuitBreaker.execute(() => 
                    this.github.search.repos({
                        q: query,
                        per_page: crConfig.GITHUB.MAX_ITEMS_PER_SEARCH
                    })
                )
            );

            if (!response?.data?.items) {
                throw new CopyrightError(
                    CopyrightErrorCode.GITHUB_API_ERROR,
                    'Invalid GitHub search response'
                );
            }

            return this.transformRepositories(response.data.items);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.GITHUB_API_ERROR,
                'GitHub search failed',
                { query, error }
            );
        }
    }

    async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
        try {
            const response = await this.lock.acquire('github-repo', () => 
                this.circuitBreaker.execute(() => 
                    this.github.repos.get({ owner, repo })
                )
            );

            if (!response?.data) {
                throw new CopyrightError(
                    CopyrightErrorCode.GITHUB_API_ERROR,
                    'Invalid GitHub repository response'
                );
            }

            return this.transformRepository(response.data);
        } catch (error) {
            throw new CopyrightError(
                CopyrightErrorCode.GITHUB_API_ERROR,
                'GitHub repository fetch failed',
                { owner, repo, error }
            );
        }
    }

    private transformRepository(data: any): GitHubRepository {
        if (!data.id || !data.name || !data.owner) {
            throw new CopyrightError(
                CopyrightErrorCode.GITHUB_API_ERROR,
                'Invalid repository data'
            );
        }

        return {
            id: data.id,
            name: data.name,
            owner: data.owner.login,
            url: data.html_url,
            description: data.description,
            stars: data.stargazers_count,
            license: data.license?.spdx_id || 'UNKNOWN',
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }

    private transformRepositories(items: any[]): GitHubRepository[] {
        return items.map(item => this.transformRepository(item));
    }
}