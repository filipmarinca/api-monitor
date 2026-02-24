# Contributing to API Monitor

Thank you for considering contributing to API Monitor!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/api-monitor.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Follow setup instructions in README.md

## Code Style

- Use TypeScript for all new code
- Follow existing code structure and naming conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Run linting before committing: `npm run lint`
- Keep functions small and focused
- Add JSDoc comments for complex logic

## Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Test both server and dashboard components
- Verify Docker Compose setup works

## Pull Request Process

1. Update README.md with details of significant changes
2. Update API documentation if endpoints change
3. Ensure CI/CD pipeline passes
4. Request review from maintainers
5. Address review feedback promptly

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(monitors): add GraphQL endpoint support
fix(alerts): correct webhook retry logic
docs(api): update authentication examples
```

## Code Review Guidelines

- Be respectful and constructive
- Focus on code quality, security, and performance
- Suggest improvements rather than just pointing out issues
- Test the changes locally before approving

## Questions?

Open an issue or reach out to Filip Marinca on GitHub.
