# Brandveri 

A powerful, AI-driven tool for brand name generation, trademark, and copyright verification. With seamless integration with APIs from the European Union Intellectual Property Office (EUIPO) and United States Patent and Trademark Office (USPTO), Brandveri helps entrepreneurs, startups, and businesses secure their brand identity in real-time.

## Features
- **AI Brand Name Suggestions**: Generate unique and memorable brand names using OpenAI-powered recommendations.
- **Trademark & Copyright Search**: Automatically check trademark and copyright availability via the EUIPO and USPTO APIs.
- **Real-Time Results**: Instantly verify if a brand name is available for registration.
- **User Preferences**: Personalize brand name recommendations based on industry, keywords, or target market.
- **Usage Logs**: Track API usage and performance with detailed logs.
- **Secure & Scalable**: Built with scalability and security in mind, ensuring robust performance for growing businesses.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Caching](#caching)
- [Load Balancing](#load-balancing)
- [Continuous Integration & Deployment](#continuous-integration--deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Load Balancing**: NGINX
- **Containerization**: Docker, Kubernetes
- **CI/CD**: GitHub Actions, Jenkins
- **External APIs**: EUIPO API, USPTO API
- **AI Engine**: OpenAI

## Installation

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- Redis
- Docker & Kubernetes for containerization

### Step-by-Step Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/brandoveri.git
    cd brandoveri
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Set up PostgreSQL and Redis:
    - Ensure PostgreSQL is running on port 5432 and Redis on port 6379.
    - Run database migrations (if any):
        ```bash
        npm run migrate
        ```

4. Configure the environment variables by creating a `.env` file:
    ```bash
    touch .env
    ```

5. Fill it with the following values:
    ```makefile
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_NAME=brandoveriDB
    DB_PORT=5432
    REDIS_PORT=6379
    REDIS_HOST=localhost
    OPENAI_API_KEY=your_openai_api_key
    EUIPO_API_KEY=your_euipo_api_key
    USPTO_API_KEY=your_uspto_api_key
    ```

6. Start the development server:
    ```bash
    npm run dev
    ```
    The app will now be running on [http://localhost:3000](http://localhost:3000).

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login.
- `POST /api/auth/register` - User registration.

### Brand Name Suggestions
- `GET /api/brands/suggestions` - Fetch AI-generated brand names.
  - Query Params: `industry`, `keywords`, `market`

### Trademark Search
- `POST /api/trademark/search` - Search for trademark availability using EUIPO/USPTO.

### Copyright Search
- `POST /api/copyright/search` - Search for copyright availability.

### User Preferences
- `GET /api/user/preferences` - Get user’s saved preferences.
- `PUT /api/user/preferences` - Update user preferences.

### Logging
- `GET /api/logs` - Fetch API logs for tracking usage.

## Caching
Brandveri uses Redis to cache frequently requested trademark and copyright search results. This improves performance and reduces the number of API calls to the EUIPO/USPTO.

## Load Balancing
NGINX is used for load balancing to ensure that traffic is efficiently distributed across instances of Brandoveri’s backend services, ensuring high availability and reliability.

## Continuous Integration & Deployment
Brandveri utilizes GitHub Actions for automated testing, linting, and deployment. Upon pushing code to the main branch, tests are automatically run, and the code is deployed via Jenkins using Docker containers, orchestrated with Kubernetes.

## Testing
Unit and integration tests are written using Jest and Supertest. You can run the test suite with the following command:

`npm run test` - runs the tests


## Contributing
Contributions are welcome! If you’d like to improve Brandoveri, please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature-name`).
3. Commit your changes (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Create a pull request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
