# Project Structure

This document defines the organization and folder structure conventions for the project.

## Root Directory
```
/
├── .kiro/              # Kiro configuration and steering rules
│   └── steering/       # AI assistant guidance documents
├── src/                # Source code (when applicable)
├── tests/              # Test files
├── docs/               # Documentation
├── config/             # Configuration files
└── README.md           # Project overview and setup instructions
```

## Folder Conventions
- **src/**: Main application source code
- **tests/**: Unit tests, integration tests, and test utilities
- **docs/**: Project documentation, API specs, architecture diagrams
- **config/**: Environment-specific configuration files
- **.kiro/**: Kiro-specific files (steering rules, settings)

## File Naming
- Use lowercase with hyphens for multi-word files: `user-service.js`
- Use descriptive names that indicate purpose
- Group related files in appropriate subdirectories
- Keep file names concise but meaningful

## Code Organization
- Separate concerns into logical modules
- Use consistent import/export patterns
- Group related functionality together
- Follow language-specific conventions for file organization

## Notes
Adapt this structure based on the specific technology stack and project requirements.