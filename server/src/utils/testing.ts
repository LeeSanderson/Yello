import { mock } from 'bun:test';
import { Context, Hono, MiddlewareHandler, Next } from 'hono';
import { Container } from '../container/Container';
import type { IUserService, RegisterUserData, LoginUserData, UserResponse } from '../services/UserService';
import { expect } from "bun:test";
import "bun:test";
import { DatabaseConnection } from '@/db/connection';
import { createInMemoryDatabaseConnection } from '@/db/connection.mock';
import { IDateService } from '@/services';

export type MiddlewareHandlerFunc = (c: Context, next: Next) => Promise<Response | void>;

export class MiddlewareHandlerBuilder {
  private handler: MiddlewareHandlerFunc = mock()

  constructor() {
    this.setCurrentUser()
  }

  setCurrentUser(user?: UserResponse): void {
    this.handler = async (c, next) => {
      c.set('user', user ?? TestHelpers.createValidUser());
      await next();
    }
  }

  setUnauthorized(errorMessage?: string): void {
    this.handler = async (c, next) => {
      return c.json({
        error: 'Unauthorized',
        message: errorMessage ?? 'No authentication token provided'
      }, 401);
    }
  }

  setThrowError(): void {
    this.handler = async (c, next) => {
      throw new Error('Middleware error');
    }
  }

  getHandler(): MiddlewareHandlerFunc {
    return this.handler;
  }
}

export class ContainerBuilder {
  private container: Container;

  constructor() {
    this.container = new Container();
  }

  addMockUserService(): IUserService {
    const userService = {
      register: mock(),
      login: mock(),
    };
    this.container.register<IUserService>('userService', () => userService);
    return userService
  }

  addAuthMiddleware(): MiddlewareHandlerBuilder {
    const middlewareBuilder = new MiddlewareHandlerBuilder()
    const authMiddleware = mock(async (c: Context, next: Next) => {
      return await middlewareBuilder.getHandler()(c, next);
    });
    this.container.register<MiddlewareHandler>('authMiddleware', () => authMiddleware);
    return middlewareBuilder
  }

  async addInMemoryDatabase(): Promise<DatabaseConnection> {
    const database = await createInMemoryDatabaseConnection()
    this.container.register<DatabaseConnection>('database', () => database);
    return database;
  }

  addMockDateService(): IDateService {
    const dateService = { now: mock(() => new Date())};
    this.container.register<IDateService>('dateService', () => dateService);
    return dateService;
  }

  toContainer(): Container {
    return this.container
  }
}

/**
 * Shared test helpers for authentication and route testing
 * Contains common data factories, mock factories, setup helpers, and assertion helpers
 */
export class TestHelpers {
  /**
   * Creates a valid user response object for testing
   */
  static createValidUser(overrides = {}): UserResponse {
    return {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      ...overrides
    };
  }

  /**
   * Creates valid registration data for testing
   */
  static createValidRegisterData(overrides = {}): RegisterUserData {
    return {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      ...overrides
    };
  }

  /**
   * Creates valid login data for testing
   */
  static createValidLoginData(overrides = {}): LoginUserData {
    return {
      email: 'john@example.com',
      password: 'password123',
      ...overrides
    };
  }

  /**
   * Creates a mock user service with all methods
   */
  static createMockUserService(): IUserService {
    return {
      register: mock(),
      login: mock(),
    };
  }

  /**
   * Sets up a basic Hono app with routes mounted at a specific path
   */
  static setupApp(routeCreator: (container: Container) => Hono, container: Container): Hono {
    const app = new Hono();
    app.route('/', routeCreator(container));
    return app;
  }

  /**
   * Makes a generic HTTP request to the app
   */
  static async makeRequest(
    app: Hono,
    path: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    const requestOptions: RequestInit = { method };

    if (body) {
      requestOptions.body = JSON.stringify(body);
      requestOptions.headers = { 'Content-Type': 'application/json', ...headers };
    } else if (headers) {
      requestOptions.headers = headers;
    }

    return app.request(path, requestOptions);
  }

  /**
   * Makes a POST request (commonly used for auth routes)
   */
  static async makePostRequest(app: Hono, path: string, body?: any, headers?: Record<string, string>): Promise<Response> {
    return TestHelpers.makeRequest(app, path, 'POST', body, headers);
  }

  static async makeGetRequest(app: Hono, path: string, headers?: Record<string, string>): Promise<Response> {
    return TestHelpers.makeRequest(app, path, 'GET', null, headers);
  }

  /**
   * Normalizes user dates for consistent testing (converts Date objects to ISO strings)
   */
  static normalizeUserDates(user: UserResponse): any {
    return {
      ...user,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    };
  }
}

// Type-safe Response status matcher
interface ResponseMatchers {
  toBeStatus(expectedCode: number): void;
  toBeJson(expectedStatusCode: number, expected: unknown): Promise<void>;
}

declare module "bun:test" {
  interface Matchers<T> extends ResponseMatchers {}
}

expect.extend({
  toBeStatus(received: unknown, expectedCode: number) {
    const response = received as Response;
    const pass = response.status === expectedCode;
    return {
      pass,
      message: () => `Expected status code to ${pass ? 'not ' : ''}be ${expectedCode}, but received ${response.status}`
    };
  },

  async toBeJson(received: unknown, expectedStatusCode: number, expected: unknown) {
    const response = received as Response;
    let statusPass = response.status === expectedStatusCode;
    let recieved = null;
    let expectedIsDeeplyEqual = true;
    if (statusPass) {
      recieved = await response.json();      
      expectedIsDeeplyEqual = Bun.deepEquals(recieved, expected);      
    }

    const pass = statusPass && expectedIsDeeplyEqual;
    return {
      pass,
      message: () => {
        if (pass) {
          return "Expected JSON objects not to match but thay do";
        }

        if (!statusPass) {
          return `Expected status to be ${expectedStatusCode} but was ${response.status}`
        }

        return ["Expected JSON response to be equal but expected:",
          `  ${this.utils.printExpected(expected)}`,
          "And recived:",
          `  ${this.utils.printExpected(recieved)}`,
        ].join('\n');
      }
    };
  }  
});