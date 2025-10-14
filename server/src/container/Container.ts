export class Container {
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not registered`);
    }

    const instance = factory();
    this.services.set(name, instance);
    return instance as T;
  }

  has(name: string): boolean {
    return this.factories.has(name) || this.services.has(name);
  }
}