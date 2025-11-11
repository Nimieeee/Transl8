# Contributing to AI Video Dubbing Platform

## Development Setup

1. Clone the repository
2. Run the setup script: `./scripts/setup.sh`
3. Start development: `npm run dev`

## Project Structure

- `packages/backend/` - Express.js API server
- `packages/frontend/` - Next.js web application
- `packages/workers/` - Background job processors
- `packages/shared/` - Shared TypeScript types

## Code Standards

### TypeScript

- Use strict TypeScript mode
- Define proper types for all functions and variables
- Avoid using `any` type

### Code Style

- Run `npm run format` before committing
- Run `npm run lint` to check for issues
- Follow existing code patterns

### Commits

- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain test coverage

## Pull Requests

1. Create a feature branch from `develop`
2. Make your changes
3. Run linting and formatting
4. Submit PR with clear description
5. Wait for review and address feedback

## Questions?

Open an issue for any questions or concerns.
